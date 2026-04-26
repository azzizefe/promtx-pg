import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function handleAdminUsers(req: Request, headers: Headers) {
  try {
    const users = await prisma.user.findMany({ take: 20 });
    return new Response(JSON.stringify(users), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

export async function handleAdminFreezeUser(req: Request, headers: Headers) {
  return new Response(JSON.stringify({ status: 'success', action: 'account_frozen' }), { 
    status: 200, 
    headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) } 
  });
}

export async function handleAdminUpdateCredits(req: Request, headers: Headers) {
  return new Response(JSON.stringify({ status: 'success', action: 'credits_updated' }), { 
    status: 200, 
    headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) } 
  });
}

export async function handleAdminLogs(req: Request, headers: Headers) {
  try {
    const logs = await prisma.auditLog.findMany({ take: 20, orderBy: { createdAt: 'desc' } });
    return new Response(JSON.stringify(logs), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

export async function handleAdminImpersonate(req: Request, headers: Headers) {
  return new Response(JSON.stringify({ status: 'success', impersonation: true, targetUserId: 'mock-target' }), { 
    status: 200, 
    headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) } 
  });
}
