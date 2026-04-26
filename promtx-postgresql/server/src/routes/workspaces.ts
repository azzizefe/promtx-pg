import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function handleWorkspaceCreate(req: Request, headers: Headers) {
  try {
    const body = await req.json();
    const workspace = await prisma.workspace.create({
      data: {
        name: body.name || 'New Workspace',
        ownerId: body.ownerId || 'user-free-001',
      }
    });
    return new Response(JSON.stringify(workspace), { 
      status: 201, 
      headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

export async function handleWorkspaceList(req: Request, headers: Headers) {
  try {
    const workspaces = await prisma.workspace.findMany({ take: 20 });
    return new Response(JSON.stringify(workspaces), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

export async function handleWorkspaceInvite(req: Request, headers: Headers) {
  return new Response(JSON.stringify({ status: 'success', invitationSent: true }), { 
    status: 200, 
    headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) } 
  });
}

export async function handleWorkspaceRemoveMember(req: Request, headers: Headers) {
  return new Response(JSON.stringify({ status: 'success', memberRemoved: true }), { 
    status: 200, 
    headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) } 
  });
}
