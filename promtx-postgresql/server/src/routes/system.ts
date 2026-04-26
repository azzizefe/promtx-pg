import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function handleHealthCheck(req: Request, headers: Headers) {
  try {
    // Ping database
    await prisma.$queryRaw`SELECT 1`;
    return new Response(JSON.stringify({ status: 'healthy', database: 'connected', redis: 'mock-connected' }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ status: 'unhealthy', database: 'disconnected', error: e.message }), { status: 500 });
  }
}

export async function handleMetrics(req: Request, headers: Headers) {
  return new Response(JSON.stringify({ total_users: 5, active_sessions: 3, memory_usage_mb: process.memoryUsage().heapUsed / 1024 / 1024 }), { 
    status: 200, 
    headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) } 
  });
}

export async function handleEventsLog(req: Request, headers: Headers) {
  try {
    const body = await req.json();
    const log = await prisma.auditLog.create({
      data: {
        userId: body.userId || 'user-free-001',
        action: body.action || 'MOCK_ACTION',
        target: body.target || 'system',
        details: body.details || {},
        ipAddress: '127.0.0.1',
        userAgent: 'Mock Agent',
      }
    });
    return new Response(JSON.stringify(log), { 
      status: 201, 
      headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

export async function handleFeedback(req: Request, headers: Headers) {
  try {
    const body = await req.json();
    const feedback = await prisma.feedback.create({
      data: {
        userId: body.userId || 'user-free-001',
        message: body.message || '',
        rating: body.rating || 5,
        metadata: body.metadata || {},
      }
    });
    return new Response(JSON.stringify(feedback), { 
      status: 201, 
      headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
