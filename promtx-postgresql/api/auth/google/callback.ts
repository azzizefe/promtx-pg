import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state } = req.query;
  if (!code || !state) {
    return res.status(400).json({ error: 'Missing code or state parameters' });
  }

  try {
    // 1. Verify state
    const oauthState = await prisma.oAuthState.findUnique({
      where: { state: state as string },
    });

    if (!oauthState || oauthState.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired state' });
    }

    // Clean up state
    await prisma.oAuthState.delete({ where: { state: state as string } });

    // 2. Exchange code for tokens (Mock behavior for serverless preview)
    const JWT_SECRET = process.env.JWT_SECRET || 'placeholder-jwt-secret';
    
    // Find or create user based on hypothetical profile
    const providerEmail = 'google-user@promtx.os';
    let user = await prisma.user.findUnique({ where: { email: providerEmail } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: providerEmail,
          displayName: 'Google User',
          role: 'Free',
        }
      });
      
      // Create personal workspace
      const workspace = await prisma.workspace.create({
        data: {
          name: 'Personal Workspace',
          ownerId: user.id,
        }
      });

      // Add member
      await prisma.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          role: 'Owner',
        }
      });

      // Create wallet
      await prisma.wallet.create({
        data: {
          userId: user.id,
          credits: 100,
        }
      });
    }

    // Link account
    await prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: 'google',
          providerAccountId: 'google-uid-placeholder',
        }
      },
      update: {},
      create: {
        userId: user.id,
        provider: 'google',
        providerAccountId: 'google-uid-placeholder',
        providerEmail: user.email,
      }
    });

    // 3. Generate token
    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    // Redirect back to frontend
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:1420';
    return res.redirect(302, `${frontendUrl}/auth/callback?token=${token}&provider=google`);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
