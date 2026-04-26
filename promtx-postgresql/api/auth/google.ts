import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const state = crypto.randomUUID();
    const nonce = crypto.randomUUID();
    
    const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'https://promtx.vercel.app/auth/google/callback';
    const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'placeholder-google-client-id';

    await prisma.oAuthState.create({
      data: {
        state,
        nonce,
        provider: 'google',
        redirectUri: REDIRECT_URI,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      }
    });

    const authUrl = new URL(GOOGLE_AUTH_URL);
    authUrl.searchParams.set('client_id', CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('nonce', nonce);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    return res.redirect(302, authUrl.toString());
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
