import { Hono } from 'hono';
import { serve } from 'bun';
import path from 'path';

const app = new Hono();

app.all('/api/*', async (c) => {
  const url = new URL(c.req.url);
  let pathname = url.pathname;
  
  console.log(`[API] ${c.req.method} ${pathname}`);

  // Map paths like /api/auth/login to ./api/auth/login.ts
  const relativePath = pathname.replace(/^\/api/, './api');
  const fullPath = path.resolve(process.cwd(), relativePath + '.ts');

  try {
    // Dynamic import of the Vercel handler
    const module = await import(fullPath);
    const handler = module.default;

    if (typeof handler !== 'function') {
      return c.json({ error: true, message: 'Handler is not a function' }, 500);
    }

    let responseData: any = null;
    let responseStatus = 200;
    const headers: Record<string, string> = {};

    // Parse body if available
    let body = {};
    try {
      const contentType = c.req.header('content-type');
      if (contentType && contentType.includes('application/json')) {
        body = await c.req.json();
      }
    } catch (_) {}

    // VercelRequest mock
    const reqMock: any = {
      method: c.req.method,
      url: c.req.url,
      query: c.req.query(),
      body,
      headers: c.req.header(),
      cookies: {}, // Minimal mock
    };

    // VercelResponse mock
    const resMock: any = {
      status(code: number) {
        responseStatus = code;
        return this;
      },
      json(data: any) {
        responseData = data;
        return this;
      },
      setHeader(key: string, value: string) {
        headers[key] = value;
        return this;
      },
      send(data: any) {
        responseData = data;
        return this;
      },
      end() {
        return this;
      }
    };

    // Execute the function
    await handler(reqMock, resMock);

    // Build Hono response
    for (const [key, val] of Object.entries(headers)) {
      c.header(key, val);
    }

    if (responseData === null) {
      return c.text('', responseStatus as any);
    }

    return c.json(responseData, responseStatus as any);
  } catch (err: any) {
    console.error(`[API Error] ${pathname}:`, err.message);
    return c.json({ error: true, message: err.message || 'Internal Server Error' }, 500);
  }
});

console.log('Starting local API runner on http://localhost:3000');
serve({
  fetch: app.fetch,
  port: 3000,
});
