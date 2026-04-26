import type { VercelRequest } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';
import { ApiError } from './errors';

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
}

export async function authenticate(req: VercelRequest): Promise<AuthUser> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

  if (!token) {
    throw new ApiError(401, 'Yetkilendirme tokeni eksik');
  }

  const JWT_SECRET = process.env.JWT_SECRET || 'placeholder-jwt-secret';
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    if (!decoded || !decoded.userId) {
      throw new ApiError(401, 'Geçersiz token payload');
    }

    // Hash the token for session check
    const crypto = await import('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Session aktif mi kontrol et
    const session = await prisma.session.findFirst({
      where: { 
        userId: decoded.userId,
        tokenHash,
        status: 'active' 
      },
    });
    
    if (!session) {
      throw new ApiError(401, 'Oturum süresi dolmuş veya geçersiz');
    }

    return { 
      userId: decoded.userId, 
      email: decoded.email || '', 
      role: decoded.role || 'free' 
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(401, 'Oturum doğrulanamadı');
  }
}

export function requireRole(...roles: string[]) {
  return (user: AuthUser) => {
    if (!roles.includes(user.role)) {
      throw new ApiError(403, 'Yetersiz yetki');
    }
  };
}
