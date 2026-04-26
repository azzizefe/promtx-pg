import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { provider } = req.query;
  
  if (req.method === 'POST') {
    // Link provider
    return res.status(200).json({ status: 'success', message: `Linked ${provider} account` });
  }
  
  if (req.method === 'DELETE') {
    // Unlink provider
    return res.status(200).json({ status: 'success', message: `Unlinked ${provider} account` });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
