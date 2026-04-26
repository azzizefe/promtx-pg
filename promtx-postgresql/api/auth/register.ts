import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password, displayName } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  try {
    let user = await prisma.user.findUnique({ where: { email } });
    
    if (user) {
      return res.status(409).json({ error: 'User already exists' });
    }

    user = await prisma.user.create({
      data: {
        email,
        displayName: displayName || email.split('@')[0],
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

    const JWT_SECRET = process.env.JWT_SECRET || 'placeholder-jwt-secret';
    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    return res.status(201).json({ token, user });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
