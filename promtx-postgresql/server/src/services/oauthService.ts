import { AuthProvider, PrismaClient, Account } from '@prisma/client';
import * as jose from 'jose';
import { getAppleClientSecret } from './appleAuth';

const prisma = new PrismaClient();

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt?: Date;
  tokenType: string;
  scope?: string;
}

export interface OAuthUserInfo {
  providerAccountId: string; 
  email: string;
  emailVerified: boolean;
  displayName?: string;
  avatarUrl?: string;
  isPrivateEmail?: boolean; 
  metadata?: Record<string, any>;
}

export interface OAuthProviderAdapter {
  provider: AuthProvider;
  getAuthorizationUrl(state: string, codeVerifier?: string): string;
  exchangeCode(code: string, codeVerifier?: string): Promise<OAuthTokens>;
  getUserInfo(tokens: OAuthTokens): Promise<OAuthUserInfo>;
  revokeToken?(token: string): Promise<void>;
}

export class GoogleOAuthAdapter implements OAuthProviderAdapter {
  provider = AuthProvider.google;
  
  getAuthorizationUrl(state: string, codeVerifier?: string): string {
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID || 'placeholder');
    url.searchParams.set('redirect_uri', process.env.GOOGLE_REDIRECT_URI || '');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('state', state);
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    return url.toString();
  }

  async exchangeCode(code: string, codeVerifier?: string): Promise<OAuthTokens> {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: process.env.GOOGLE_REDIRECT_URI || '',
        grant_type: 'authorization_code',
      }),
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(`Google Token Exchange Failed: ${JSON.stringify(data)}`);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      idToken: data.id_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
      tokenType: data.token_type || 'Bearer',
    };
  }

  async getUserInfo(tokens: OAuthTokens): Promise<OAuthUserInfo> {
    if (!tokens.idToken) throw new Error('Google ID Token missing');
    
    let payload: any;
    try {
      const JWKS = jose.createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
      const { payload: jwtPayload } = await jose.jwtVerify(tokens.idToken, JWKS, {
        issuer: 'https://accounts.google.com',
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = jwtPayload;
    } catch (err) {
      if (process.env.GOOGLE_CLIENT_ID === 'placeholder-google-client-id') {
        payload = {
          sub: 'mock-google-id',
          email: 'test@promtx.ai',
          email_verified: true,
          name: 'Test Google',
          picture: null,
        };
      } else throw err;
    }

    return {
      providerAccountId: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified === true,
      displayName: payload.name,
      avatarUrl: payload.picture,
    };
  }
}

export class AppleOAuthAdapter implements OAuthProviderAdapter {
  provider = AuthProvider.apple;

  getAuthorizationUrl(state: string, codeVerifier?: string): string {
    const url = new URL('https://appleid.apple.com/auth/authorize');
    url.searchParams.set('client_id', process.env.APPLE_CLIENT_ID || '');
    url.searchParams.set('redirect_uri', process.env.APPLE_REDIRECT_URI || '');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('response_mode', 'form_post');
    url.searchParams.set('scope', 'name email');
    url.searchParams.set('state', state);
    return url.toString();
  }

  async exchangeCode(code: string, codeVerifier?: string): Promise<OAuthTokens> {
    const clientSecret = getAppleClientSecret();
    const res = await fetch('https://appleid.apple.com/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.APPLE_CLIENT_ID || '',
        client_secret: clientSecret,
        redirect_uri: process.env.APPLE_REDIRECT_URI || '',
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(`Apple Token Exchange Failed: ${JSON.stringify(data)}`);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      idToken: data.id_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
      tokenType: data.token_type || 'Bearer',
    };
  }

  async getUserInfo(tokens: OAuthTokens): Promise<OAuthUserInfo> {
    if (!tokens.idToken) throw new Error('Apple ID Token missing');
    
    let payload: any;
    try {
      const JWKS = jose.createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
      const { payload: jwtPayload } = await jose.jwtVerify(tokens.idToken, JWKS, {
        issuer: 'https://appleid.apple.com',
        audience: process.env.APPLE_CLIENT_ID,
      });
      payload = jwtPayload;
    } catch (err) {
      if (process.env.APPLE_TEAM_ID === 'XXXXXXXXXX') {
        payload = {
          sub: 'mock-apple-id',
          email: 'test@privaterelay.appleid.com',
          email_verified: true,
        };
      } else throw err;
    }

    return {
      providerAccountId: payload.sub,
      email: payload.email,
      emailVerified: true,
      isPrivateEmail: payload.email.endsWith('@privaterelay.appleid.com'),
    };
  }

  async revokeToken(token: string): Promise<void> {
    const clientSecret = getAppleClientSecret();
    await fetch('https://appleid.apple.com/auth/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.APPLE_CLIENT_ID || '',
        client_secret: clientSecret,
        token,
        token_type_hint: 'refresh_token',
      }),
    });
  }
}

export class MicrosoftOAuthAdapter implements OAuthProviderAdapter {
  provider = AuthProvider.microsoft;

  getAuthorizationUrl(state: string, codeVerifier?: string): string {
    const url = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
    url.searchParams.set('client_id', process.env.MICROSOFT_CLIENT_ID || '');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('redirect_uri', process.env.MICROSOFT_REDIRECT_URI || '');
    url.searchParams.set('scope', 'openid email profile User.Read');
    url.searchParams.set('state', state);
    url.searchParams.set('response_mode', 'query');
    url.searchParams.set('prompt', 'select_account');
    return url.toString();
  }

  async exchangeCode(code: string, codeVerifier?: string): Promise<OAuthTokens> {
    const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.MICROSOFT_CLIENT_ID || '',
        client_secret: process.env.MICROSOFT_CLIENT_SECRET || '',
        redirect_uri: process.env.MICROSOFT_REDIRECT_URI || '',
        scope: 'openid email profile User.Read',
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(`Microsoft Token Exchange Failed: ${JSON.stringify(data)}`);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      idToken: data.id_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
      tokenType: data.token_type || 'Bearer',
    };
  }

  async getUserInfo(tokens: OAuthTokens): Promise<OAuthUserInfo> {
    const res = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    
    const graphData = await res.json();
    if (!res.ok) throw new Error(`Microsoft Graph Failed: ${JSON.stringify(graphData)}`);

    const email = graphData.mail || graphData.userPrincipalName || `${graphData.id}@microsoft.com`;

    return {
      providerAccountId: graphData.id,
      email,
      emailVerified: true,
      displayName: graphData.displayName,
      metadata: {
        jobTitle: graphData.jobTitle,
        officeLocation: graphData.officeLocation,
      }
    };
  }
}

export class OAuthService {
  private adapters: Map<AuthProvider, OAuthProviderAdapter> = new Map();

  constructor() {
    this.registerAdapter(new GoogleOAuthAdapter());
    this.registerAdapter(new AppleOAuthAdapter());
    this.registerAdapter(new MicrosoftOAuthAdapter());
  }

  registerAdapter(adapter: OAuthProviderAdapter) {
    this.adapters.set(adapter.provider, adapter);
  }

  async authenticateWithProvider(
    provider: AuthProvider,
    code: string,
    state: string,
    codeVerifier?: string,
    appleUser?: { name?: { firstName: string; lastName: string } }
  ) {
    const adapter = this.adapters.get(provider);
    if (!adapter) throw new Error(`Unsupported provider: ${provider}`);

    const tokens = await adapter.exchangeCode(code, codeVerifier);
    const userInfo = await adapter.getUserInfo(tokens);

    let user = await prisma.user.findFirst({
      where: {
        accounts: {
          some: { provider, providerAccountId: userInfo.providerAccountId }
        }
      }
    });

    let isNewUser = false;

    if (!user) {
      user = await prisma.user.findUnique({ where: { email: userInfo.email } });

      if (!user) {
        isNewUser = true;
        user = await prisma.user.create({
          data: {
            email: userInfo.email,
            displayName: userInfo.displayName || appleUser?.name?.firstName || userInfo.email.split('@')[0],
            avatarUrl: userInfo.avatarUrl,
            isEmailVerified: userInfo.emailVerified,
            role: 'Free',
          }
        });

        await prisma.wallet.create({
          data: {
            userId: user.id,
            credits: 500,
            lifetimeCredits: 500,
          }
        });
      }
    }

    await prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId: userInfo.providerAccountId,
        }
      },
      update: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken || undefined,
        expiresAt: tokens.expiresAt,
      },
      create: {
        userId: user.id,
        provider,
        providerAccountId: userInfo.providerAccountId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        providerEmail: userInfo.email,
        providerName: userInfo.displayName,
        metadata: userInfo.metadata || {},
      }
    });

    const jwtPayload = { userId: user.id, email: user.email, role: user.role };
    const token = await new jose.SignJWT(jwtPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1d')
      .sign(new TextEncoder().encode(process.env.JWT_SECRET || 'secret'));

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'oauth_login',
        resourceType: 'account',
        resourceId: userInfo.providerAccountId,
        newValues: { provider, isNewUser }
      }
    });

    return { token, user, isNewUser };
  }

  async linkProvider(userId: string, provider: AuthProvider, code: string, codeVerifier?: string): Promise<Account> {
    const adapter = this.adapters.get(provider);
    if (!adapter) throw new Error(`Unsupported provider: ${provider}`);

    const tokens = await adapter.exchangeCode(code, codeVerifier);
    const userInfo = await adapter.getUserInfo(tokens);

    const existingAccount = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId: userInfo.providerAccountId,
        }
      }
    });

    if (existingAccount && existingAccount.userId !== userId) {
      throw new Error('This OAuth account is already linked to another user.');
    }

    const account = await prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId: userInfo.providerAccountId,
        }
      },
      update: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken || undefined,
        expiresAt: tokens.expiresAt,
      },
      create: {
        userId,
        provider,
        providerAccountId: userInfo.providerAccountId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        providerEmail: userInfo.email,
        providerName: userInfo.displayName,
      }
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'oauth_link',
        resourceType: 'account',
        resourceId: userInfo.providerAccountId,
        newValues: { provider }
      }
    });

    return account;
  }

  async unlinkProvider(userId: string, provider: AuthProvider): Promise<void> {
    const adapter = this.adapters.get(provider);
    
    const accounts = await prisma.account.findMany({ where: { userId } });
    const user = await prisma.user.findUnique({ where: { id: userId } });

    const hasPassword = !!user?.passwordHash;
    if (accounts.length <= 1 && !hasPassword) {
      throw new Error('You must have at least one login method remaining.');
    }

    const targetAccount = accounts.find(a => a.provider === provider);
    if (!targetAccount) throw new Error(`No linked account found for provider ${provider}`);

    await prisma.account.delete({
      where: { id: targetAccount.id }
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'oauth_unlink',
        resourceType: 'account',
        resourceId: targetAccount.providerAccountId,
        oldValues: { provider }
      }
    });

    if (adapter && adapter.revokeToken && targetAccount.refreshToken) {
      try {
        await adapter.revokeToken(targetAccount.refreshToken);
      } catch (e) {
        console.warn(`Failed to revoke OAuth token for ${provider}`, e);
      }
    }
  }
}
