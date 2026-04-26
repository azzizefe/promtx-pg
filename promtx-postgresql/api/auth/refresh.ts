import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { refreshToken } = req.body || {};
  if (!refreshToken) {
    return res.status(400).json({ error: 'Missing refresh token' });
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'placeholder-jwt-secret';
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as any;
    
    const newToken = jwt.sign(
      { userId: decoded.userId, email: decoded.email, role: decoded.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({ token: newToken });
  } catch (error: any) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
}
