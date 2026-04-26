import { cleanExpiredOAuthStates } from './services/oauthCleanup';
import { 
  handleGoogleAuth, handleGoogleCallback, 
  handleAppleAuth, handleAppleCallback, handleAppleRevoke,
  handleMicrosoftAuth, handleMicrosoftCallback,
  handleOAuthInit, handleOAuthCallback, handleAccountLink, handleAccountUnlink, handleListProviders
} from './routes/auth';

// Start cleanup cron (runs every 5 minutes)
setInterval(cleanExpiredOAuthStates, 5 * 60 * 1000);

const server = Bun.serve({
  port: 3001,
  async fetch(req: Request) {
    const url = new URL(req.url);
    const path = url.pathname;
    
    // CORS headers
    const headers = new Headers({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers });
    }
    
    try {
      if (path === '/api/auth/google' && req.method === 'GET') {
        return await handleGoogleAuth(req, headers);
      }
      
      if (path === '/api/auth/google/callback' && req.method === 'GET') {
        return await handleGoogleCallback(req, headers);
      }

      if (path === '/api/auth/apple' && req.method === 'GET') {
        return await handleAppleAuth(req, headers);
      }

      if (path === '/api/auth/apple/callback' && req.method === 'POST') {
        return await handleAppleCallback(req, headers);
      }

      if (path === '/api/auth/apple/revoke' && req.method === 'POST') {
        return await handleAppleRevoke(req, headers);
      }

      if (path === '/api/auth/microsoft' && req.method === 'GET') {
        return await handleMicrosoftAuth(req, headers);
      }

      if (path === '/api/auth/microsoft/callback' && req.method === 'GET') {
        return await handleMicrosoftCallback(req, headers);
      }

      // Dynamic endpoints
      const authMatch = path.match(/^\/api\/auth\/([^\/]+)$/);
      if (authMatch && req.method === 'GET') {
        const provider = authMatch[1];
        if (provider !== 'providers') {
          return await handleOAuthInit(req, provider, headers);
        } else {
          // For testing, mock userId as 'mock-user-id'
          return await handleListProviders(req, 'mock-user-id', headers);
        }
      }

      const callbackMatch = path.match(/^\/api\/auth\/([^\/]+)\/callback$/);
      if (callbackMatch) {
        return await handleOAuthCallback(req, callbackMatch[1], headers);
      }

      const linkMatch = path.match(/^\/api\/auth\/link\/([^\/]+)$/);
      if (linkMatch) {
        if (req.method === 'POST') {
          return await handleAccountLink(req, linkMatch[1], 'mock-user-id', headers);
        } else if (req.method === 'DELETE') {
          return await handleAccountUnlink(req, linkMatch[1], 'mock-user-id', headers);
        }
      }
      
      return new Response(JSON.stringify({ error: 'Not Found' }), {
        status: 404,
        headers: { ...Object.fromEntries(headers), 'Content-Type': 'application/json' }
      });
    } catch (error: any) {
      console.error(`[Server Error] ${error.message}`);
      return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
        status: 500,
        headers: { ...Object.fromEntries(headers), 'Content-Type': 'application/json' }
      });
    }
  },
});

console.log(`[Promtx API] Server started on http://localhost:${server.port}`);
