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
      } as any
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
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return new Response(JSON.stringify({ error: 'Multipart form data or files are NOT allowed. Only application/json accepted.' }), { status: 415 });
    }

    const body = await req.json();
    const message = body.message;
    const type = body.type || 'other';
    const debugContext = body.debugContext || {};
    const userId = body.userId || null;

    if (body.file || body.attachment || body.binary) {
      return new Response(JSON.stringify({ error: 'File attachments are NOT allowed.' }), { status: 400 });
    }

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Message must be a valid string.' }), { status: 400 });
    }

    if (message.length < 10) {
      return new Response(JSON.stringify({ error: 'Message must be at least 10 characters.' }), { status: 400 });
    }
    if (message.length > 5000) {
      return new Response(JSON.stringify({ error: 'Message exceeds 5000 characters.' }), { status: 400 });
    }

    const cleanMessage = message.replace(/<\/?[^>]+(>|$)/g, "");

    if (/^[a-zA-Z0-9+/=]{100,}$/.test(cleanMessage.replace(/\s/g, '')) && !cleanMessage.includes(' ')) {
      return new Response(JSON.stringify({ error: 'Base64 encoded files are NOT allowed.' }), { status: 400 });
    }

    const normalizedMessage = cleanMessage.replace(/\n{3,}/g, '\n\n');

    const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    const now = Date.now();
    const key = `feedback_rate_${ipAddress}`;
    let attempts: number[] = (global as any)[key] || [];
    attempts = attempts.filter(ts => now - ts < 60 * 60 * 1000);
    if (attempts.length >= 5) {
      return new Response(JSON.stringify({ error: 'Too many feedbacks. Rate limit is 5 per hour.' }), { status: 429 });
    }
    attempts.push(now);
    (global as any)[key] = attempts;

    const feedback = await prisma.feedback.create({
      data: {
        userId,
        type: type as any,
        message: normalizedMessage,
        debugContext,
        ipAddress,
        userAgent,
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

export async function handleAdminListFeedbacks(req: Request, headers: Headers) {
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get('type');
    const status = url.searchParams.get('status');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;

    const items = await prisma.feedback.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    const total = await prisma.feedback.count({ where });

    return new Response(JSON.stringify({ items, total, page, limit }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

export async function handleAdminUpdateFeedbackStatus(req: Request, headers: Headers) {
  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return new Response(JSON.stringify({ error: 'id and status are required' }), { status: 400 });
    }

    const updated = await prisma.feedback.update({
      where: { id },
      data: { 
        status,
        resolvedAt: status === 'resolved' ? new Date() : undefined
      } as any
    });

    return new Response(JSON.stringify(updated), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

export async function handleAdminAddFeedbackNote(req: Request, headers: Headers) {
  try {
    const body = await req.json();
    const { id, adminNote } = body;

    if (!id) {
      return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 });
    }

    const updated = await prisma.feedback.update({
      where: { id },
      data: { adminNote } as any
    });

    return new Response(JSON.stringify(updated), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

export async function handleAdminDeleteFeedback(req: Request, headers: Headers) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 });
    }

    await prisma.feedback.delete({ where: { id } });

    return new Response(JSON.stringify({ success: true }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

export async function handleAdminGetFeedbackStats(req: Request, headers: Headers) {
  try {
    const stats = await prisma.feedback.groupBy({
      by: ['type'],
      _count: { _all: true },
    });

    const daily = await prisma.feedback.groupBy({
      by: ['status'],
      _count: { _all: true }
    });

    return new Response(JSON.stringify({ stats, daily }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
