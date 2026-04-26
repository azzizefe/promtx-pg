import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, id_token, state, user: userJson } = req.body || {};

  try {
    // Apple form_post simulation
    const JWT_SECRET = process.env.JWT_SECRET || 'placeholder-jwt-secret';
    const providerEmail = 'apple-user@privaterelay.appleid.com';
    
    let user = await prisma.user.findUnique({ where: { email: providerEmail } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: providerEmail,
          displayName: 'Apple User',
          role: 'Free',
        }
      });
      
      const workspace = await prisma.workspace.create({
        data: {
          name: 'Personal Workspace',
          ownerId: user.id,
        }
      });

      await prisma.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          role: 'Owner',
        }
      });

      await prisma.wallet.create({
        data: {
          userId: user.id,
          credits: 100,
        }
      });
    }

    await prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: 'apple',
          providerAccountId: 'apple-sub-placeholder',
        }
      },
      update: {},
      create: {
        userId: user.id,
        provider: 'apple',
        providerAccountId: 'apple-sub-placeholder',
        providerEmail: user.email,
      }
    });

    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:1420';
    
    return res.redirect(302, `${frontendUrl}/auth/callback?token=${token}&provider=apple`);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
