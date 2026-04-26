import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state } = req.query;

  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'placeholder-jwt-secret';
    const providerEmail = 'ms-user@promtx.os';
    
    let user = await prisma.user.findUnique({ where: { email: providerEmail } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: providerEmail,
          displayName: 'Microsoft User',
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
          provider: 'microsoft',
          providerAccountId: 'microsoft-oid-placeholder',
        }
      },
      update: {},
      create: {
        userId: user.id,
        provider: 'microsoft',
        providerAccountId: 'microsoft-oid-placeholder',
        providerEmail: user.email,
      }
    });

    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:1420';

    return res.redirect(302, `${frontendUrl}/auth/callback?token=${token}&provider=microsoft`);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
