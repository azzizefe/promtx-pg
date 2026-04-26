import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../_lib/prisma';
import { loginSchema } from '../_lib/validate';
import { success, error, ApiError } from '../_lib/errors';
import { rateLimit } from '../_lib/rateLimit';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json(error('Method not allowed'));

  try {
    // Rate limiting
    const ip = (req.headers['x-forwarded-for'] as string) || 'unknown';
    const rl = await rateLimit(`login:${ip}`, 10, 900);
    
    if (!rl.success) {
      res.setHeader('Retry-After', rl.retryAfter.toString());
      return res.status(429).json(error('Çok fazla deneme. 15 dakika sonra tekrar deneyin.'));
    }

    // Validate
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.issues.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
      return res.status(400).json(error(`Geçersiz istek verisi: ${errors}`));
    }
    const body = parsed.data;

    // Find user
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) return res.status(401).json(error('Geçersiz email veya şifre'));

    // Check frozen
    if (user.isFrozen) return res.status(403).json(error('Hesabınız dondurulmuştur'));

    // Check locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return res.status(423).json(error('Hesabınız geçici olarak kilitli'));
    }

    // Verify password
    if (!user.passwordHash || !await argon2.verify(user.passwordHash, body.password)) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginCount: { increment: 1 } },
      });
      return res.status(401).json(error('Geçersiz email veya şifre'));
    }

    // Create session + JWT
    const JWT_SECRET = process.env.JWT_SECRET || 'placeholder-jwt-secret';
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Hash the token for storage
    const crypto = await import('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Create active session in DB
    await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash,
        userAgent: req.headers['user-agent'] || null,
        ipAddress: ip,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: 'active',
      }
    });

    // Update login stats
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        loginCount: { increment: 1 },
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });

    return res.status(200).json(success({ token, role: user.role, userId: user.id }));
  } catch (err: any) {
    if (err instanceof ApiError) return res.status(err.statusCode).json(error(err.message));
    console.error('Login error:', err);
    return res.status(500).json(error('Sunucu hatası'));
  }
}
