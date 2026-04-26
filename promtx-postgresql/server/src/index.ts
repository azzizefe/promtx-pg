import { cleanExpiredOAuthStates } from './services/oauthCleanup';
import { handleGoogleAuth, handleGoogleCallback, handleAppleAuth, handleAppleCallback, handleAppleRevoke } from './routes/auth';

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
