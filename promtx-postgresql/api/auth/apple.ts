import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const CLIENT_ID = process.env.APPLE_CLIENT_ID || 'com.promtx.auth';
  const REDIRECT_URI = process.env.APPLE_REDIRECT_URI || 'https://promtx.vercel.app/auth/apple/callback';
  const state = crypto.randomUUID();

  const appleAuthUrl = new URL('https://appleid.apple.com/auth/authorize');
  appleAuthUrl.searchParams.set('client_id', CLIENT_ID);
  appleAuthUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  appleAuthUrl.searchParams.set('response_type', 'code id_token');
  appleAuthUrl.searchParams.set('state', state);
  appleAuthUrl.searchParams.set('scope', 'name email');
  appleAuthUrl.searchParams.set('response_mode', 'form_post');

  return res.redirect(302, appleAuthUrl.toString());
}
