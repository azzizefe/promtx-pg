import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get auth header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const providers = await prisma.oAuthProviderConfig.findMany({
      where: { isActive: true },
      select: {
        provider: true,
        clientId: true,
        scopes: true,
      }
    });

    return res.status(200).json(providers);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
