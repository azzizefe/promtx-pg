import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const CLIENT_ID = process.env.MICROSOFT_CLIENT_ID || 'placeholder-ms-client-id';
  const REDIRECT_URI = process.env.MICROSOFT_REDIRECT_URI || 'https://promtx.vercel.app/auth/microsoft/callback';
  const state = crypto.randomUUID();

  const msAuthUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
  msAuthUrl.searchParams.set('client_id', CLIENT_ID);
  msAuthUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  msAuthUrl.searchParams.set('response_type', 'code');
  msAuthUrl.searchParams.set('state', state);
  msAuthUrl.searchParams.set('scope', 'openid email profile User.Read');
  msAuthUrl.searchParams.set('response_mode', 'query');

  return res.redirect(302, msAuthUrl.toString());
}
