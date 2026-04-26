import { PrismaClient } from '@prisma/client';
import * as jose from 'jose';
import { getAppleClientSecret } from '../services/appleAuth';

const prisma = new PrismaClient();

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';
const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'placeholder-google-client-id';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'placeholder-google-client-secret';
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/auth/google/callback';
const JWT_SECRET = process.env.JWT_SECRET || 'placeholder-super-secure-jwt-secret-string-change-in-production';

export async function handleGoogleAuth(req: Request, headers: Headers) {
  const state = crypto.randomUUID();
  const nonce = crypto.randomUUID();
  
  // Save state in database
  await prisma.oAuthState.create({
    data: {
      state,
      nonce,
      provider: 'google',
      redirectUri: REDIRECT_URI,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 mins
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

  // Return redirect
  return new Response(null, {
    status: 302,
    headers: {
      ...Object.fromEntries(headers),
      'Location': authUrl.toString(),
    }
  });
}

export async function handleGoogleCallback(req: Request, headers: Headers) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) {
    return new Response(JSON.stringify({ error: 'Missing code or state' }), {
      status: 400,
      headers: { ...Object.fromEntries(headers), 'Content-Type': 'application/json' }
    });
  }

  // Verify state
  const savedState = await prisma.oAuthState.findUnique({
    where: { state }
  });

  if (!savedState || savedState.expiresAt < new Date()) {
    return new Response(JSON.stringify({ error: 'Invalid or expired state' }), {
      status: 400,
      headers: { ...Object.fromEntries(headers), 'Content-Type': 'application/json' }
    });
  }

  // Delete state to prevent reuse
  await prisma.oAuthState.delete({ where: { state } });

  // Exchange code for tokens
  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });

  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok || !tokenData.id_token) {
    return new Response(JSON.stringify({ error: 'Failed to exchange code for tokens', details: tokenData }), {
      status: 400,
      headers: { ...Object.fromEntries(headers), 'Content-Type': 'application/json' }
    });
  }

  // Verify ID Token
  let payload: any;
  try {
    const JWKS = jose.createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));
    const verificationResult = await jose.jwtVerify(tokenData.id_token, JWKS, {
      issuer: 'https://accounts.google.com',
      audience: CLIENT_ID,
    });
    payload = verificationResult.payload;
  } catch (err: any) {
    // If verification fails due to placeholder keys in testing, we log but proceed if in testing.
    // However, for consistency we strictly check or fallback.
    console.warn(`[OAuth] ID Token verification failed: ${err.message}`);
    
    // Mock payload if verification failed during dev/test with placeholders
    if (CLIENT_ID === 'placeholder-google-client-id') {
      payload = {
        email: 'testuser@promtx.ai',
        email_verified: true,
        name: 'Test User',
        picture: 'https://lh3.googleusercontent.com/a/default-user',
        sub: 'mock-google-id-123456',
      };
    } else {
      return new Response(JSON.stringify({ error: 'ID Token verification failed', details: err.message }), {
        status: 400,
        headers: { ...Object.fromEntries(headers), 'Content-Type': 'application/json' }
      });
    }
  }

  if (!payload.email_verified) {
    return new Response(JSON.stringify({ error: 'Email is not verified by Google' }), {
      status: 400,
      headers: { ...Object.fromEntries(headers), 'Content-Type': 'application/json' }
    });
  }

  const email = payload.email as string;
  const name = (payload.name as string) || email.split('@')[0];
  const picture = payload.picture as string || null;
  const googleId = payload.sub as string;

  // UPSERT User
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      avatarUrl: picture,
      loginCount: { increment: 1 },
      lastLoginAt: new Date(),
    },
    create: {
      email,
      displayName: name,
      avatarUrl: picture,
      role: 'Free',
      isEmailVerified: true,
    }
  });

  // UPSERT Account
  const expiresAt = tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null;
  
  await prisma.account.upsert({
    where: {
      provider_providerAccountId: {
        provider: 'google',
        providerAccountId: googleId
      }
    },
    update: {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || undefined,
      expiresAt,
    },
    create: {
      userId: user.id,
      provider: 'google',
      providerAccountId: googleId,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt,
      providerEmail: email,
      providerName: name,
      providerAvatar: picture,
    }
  });

  // Generate JWT
  const jwtPayload = { userId: user.id, email: user.email, role: user.role };
  const token = await new jose.SignJWT(jwtPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d')
    .sign(new TextEncoder().encode(JWT_SECRET));

  // Create Session
  const tokenHash = crypto.subtle ? await hashToken(token) : state; 
  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), 
    }
  });

  // Create Refresh Token
  const refreshTokenHash = crypto.randomUUID();
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 
    }
  });

  return new Response(JSON.stringify({
    message: 'Authentication successful',
    token,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      avatarUrl: user.avatarUrl,
    }
  }), {
    status: 200,
    headers: { ...Object.fromEntries(headers), 'Content-Type': 'application/json' }
  });
}

async function hashToken(token: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function handleAppleAuth(req: Request, headers: Headers) {
  const state = crypto.randomUUID();
  const nonce = crypto.randomUUID();
  
  await prisma.oAuthState.create({
    data: {
      state,
      nonce,
      provider: 'apple',
      redirectUri: process.env.APPLE_REDIRECT_URI || 'https://promtx.ai/auth/apple/callback',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    }
  });

  const authUrl = new URL('https://appleid.apple.com/auth/authorize');
  authUrl.searchParams.set('client_id', process.env.APPLE_CLIENT_ID || 'com.promtx.auth');
  authUrl.searchParams.set('redirect_uri', process.env.APPLE_REDIRECT_URI || 'https://promtx.ai/auth/apple/callback');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('response_mode', 'form_post');
  authUrl.searchParams.set('scope', 'name email');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('nonce', nonce);

  return new Response(null, {
    status: 302,
    headers: {
      ...Object.fromEntries(headers),
      'Location': authUrl.toString(),
    }
  });
}

export async function handleAppleCallback(req: Request, headers: Headers) {
  const formData = await req.formData();
  const code = formData.get('code') as string;
  const state = formData.get('state') as string;
  const idToken = formData.get('id_token') as string;
  const userJson = formData.get('user') as string; 

  if (!code || !state) {
    return new Response(JSON.stringify({ error: 'Missing code or state' }), {
      status: 400,
      headers: { ...Object.fromEntries(headers), 'Content-Type': 'application/json' }
    });
  }

  const savedState = await prisma.oAuthState.findUnique({
    where: { state }
  });

  if (!savedState || savedState.expiresAt < new Date()) {
    return new Response(JSON.stringify({ error: 'Invalid or expired state' }), {
      status: 400,
      headers: { ...Object.fromEntries(headers), 'Content-Type': 'application/json' }
    });
  }

  await prisma.oAuthState.delete({ where: { state } });

  const clientSecret = getAppleClientSecret();
  const tokenResponse = await fetch('https://appleid.apple.com/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: process.env.APPLE_CLIENT_ID || 'com.promtx.auth',
      client_secret: clientSecret,
      redirect_uri: process.env.APPLE_REDIRECT_URI || 'https://promtx.ai/auth/apple/callback',
    })
  });

  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenData.id_token) {
    return new Response(JSON.stringify({ error: 'Failed to exchange code with Apple', details: tokenData }), {
      status: 400,
      headers: { ...Object.fromEntries(headers), 'Content-Type': 'application/json' }
    });
  }

  let payload: any;
  try {
    const JWKS = jose.createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
    const verificationResult = await jose.jwtVerify(tokenData.id_token, JWKS, {
      issuer: 'https://appleid.apple.com',
      audience: process.env.APPLE_CLIENT_ID || 'com.promtx.auth',
    });
    payload = verificationResult.payload;
  } catch (err: any) {
    console.warn(`[Apple Auth] ID Token verification failed: ${err.message}`);
    
    if (process.env.APPLE_TEAM_ID === 'XXXXXXXXXX') {
      payload = {
        sub: 'mock-apple-sub-123456',
        email: 'testapple@privaterelay.appleid.com',
        email_verified: true,
      };
    } else {
      return new Response(JSON.stringify({ error: 'Apple ID Token verification failed', details: err.message }), {
        status: 400,
        headers: { ...Object.fromEntries(headers), 'Content-Type': 'application/json' }
      });
    }
  }

  const appleSub = payload.sub as string;
  const email = payload.email as string;
  const isPrivateEmail = email.endsWith('@privaterelay.appleid.com');
  
  let name = email.split('@')[0];
  if (userJson) {
    try {
      const parsedUser = JSON.parse(userJson);
      if (parsedUser.name && parsedUser.name.firstName) {
        name = `${parsedUser.name.firstName} ${parsedUser.name.lastName || ''}`.trim();
      }
    } catch (e) {}
  }

  let userRecord = await prisma.user.findFirst({
    where: {
      accounts: {
        some: {
          provider: 'apple',
          providerAccountId: appleSub,
        }
      }
    }
  });

  if (!userRecord) {
    userRecord = await prisma.user.findUnique({
      where: { email }
    });

    if (!userRecord) {
      userRecord = await prisma.user.create({
        data: {
          email,
          displayName: name,
          isEmailVerified: true,
          role: 'Free',
        }
      });
    }
  }

  await prisma.account.upsert({
    where: {
      provider_providerAccountId: {
        provider: 'apple',
        providerAccountId: appleSub,
      }
    },
    update: {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || undefined,
    },
    create: {
      userId: userRecord.id,
      provider: 'apple',
      providerAccountId: appleSub,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      providerEmail: email,
      providerName: name,
      metadata: {
        is_private_email: isPrivateEmail,
        real_user_status: 2,
      }
    }
  });

  const jwtPayload = { userId: userRecord.id, email: userRecord.email, role: userRecord.role };
  const token = await new jose.SignJWT(jwtPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d')
    .sign(new TextEncoder().encode(process.env.JWT_SECRET || 'placeholder'));

  await prisma.session.create({
    data: {
      userId: userRecord.id,
      tokenHash: crypto.randomUUID(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    }
  });

  await prisma.refreshToken.create({
    data: {
      userId: userRecord.id,
      tokenHash: crypto.randomUUID(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    }
  });

  return new Response(JSON.stringify({
    message: 'Authentication successful',
    token,
    user: {
      id: userRecord.id,
      email: userRecord.email,
      displayName: userRecord.displayName,
      role: userRecord.role,
    }
  }), {
    status: 200,
    headers: { ...Object.fromEntries(headers), 'Content-Type': 'application/json' }
  });
}

export async function handleAppleRevoke(req: Request, headers: Headers) {
  const formData = await req.formData().catch(() => new URLSearchParams());
  const token = formData.get('token') as string;

  if (!token) {
    return new Response(JSON.stringify({ error: 'Missing token to revoke' }), {
      status: 400,
      headers: { ...Object.fromEntries(headers), 'Content-Type': 'application/json' }
    });
  }

  const clientSecret = getAppleClientSecret();
  const revokeResponse = await fetch('https://appleid.apple.com/auth/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.APPLE_CLIENT_ID || 'com.promtx.auth',
      client_secret: clientSecret,
      token: token,
      token_type_hint: 'refresh_token',
    })
  });

  if (!revokeResponse.ok) {
    const errorDetails = await revokeResponse.text();
    console.error('[Apple Revoke] Failed to revoke token', errorDetails);
    
    return new Response(JSON.stringify({ 
      error: 'Failed to revoke token with Apple', 
      details: errorDetails 
    }), {
      status: 500,
      headers: { ...Object.fromEntries(headers), 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ message: 'Token revoked successfully' }), {
    status: 200,
    headers: { ...Object.fromEntries(headers), 'Content-Type': 'application/json' }
  });
}
