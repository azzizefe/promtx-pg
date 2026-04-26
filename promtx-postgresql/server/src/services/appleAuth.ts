import jwt from 'jsonwebtoken';

interface CachedSecret {
  secret: string;
  expiresAt: number;
}

let cachedSecret: CachedSecret | null = null;

/**
 * Generates a new Apple Client Secret JWT.
 */
export function generateAppleClientSecret(): string {
  // In standard PEM format, newlines might need parsing.
  // We pull from environment variables.
  const privateKey = (process.env.APPLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const teamId = process.env.APPLE_TEAM_ID || 'XXXXXXXXXX';
  const clientId = process.env.APPLE_CLIENT_ID || 'com.promtx.auth';
  const keyId = process.env.APPLE_KEY_ID || 'XXXXXXXXXX';

  if (!privateKey || privateKey.includes('PLACEHOLDER')) {
    console.warn('[Apple Auth] Using placeholder values for Apple OAuth Secret generation');
    return 'placeholder-apple-client-secret';
  }

  return jwt.sign({}, privateKey, {
    algorithm: 'ES256',
    expiresIn: '180d',   // Max 180 days
    audience: 'https://appleid.apple.com',
    issuer: teamId,
    subject: clientId,
    header: {
      alg: 'ES256',
      kid: keyId,
    },
  });
}

/**
 * Returns the cached Apple Client Secret, generating it if needed or expired.
 * Automatically renews after 5 months (150 days) to stay safe.
 */
export function getAppleClientSecret(): string {
  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

  // Check if cached secret exists and has more than 30 days left (150 days since generation)
  if (cachedSecret && (cachedSecret.expiresAt - now) > thirtyDaysMs) {
    return cachedSecret.secret;
  }

  console.log('[Apple Auth] Generating or renewing cached Apple Client Secret...');
  try {
    const secret = generateAppleClientSecret();
    cachedSecret = {
      secret,
      expiresAt: now + 180 * 24 * 60 * 60 * 1000,
    };
    return secret;
  } catch (error: any) {
    console.error(`[Apple Auth] Error generating Apple secret: ${error.message}`);
    return 'placeholder-apple-client-secret';
  }
}
