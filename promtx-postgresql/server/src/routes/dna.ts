import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function handleDnaSave(req: Request, headers: Headers) {
  try {
    const body = await req.json();
    const dna = await prisma.dnaVault.create({
      data: {
        name: body.name || 'New DNA Profile',
        description: body.description || '',
        studioType: body.studioType || 'image',
        dnaJson: body.dnaJson || {},
        userId: body.userId || 'user-free-001', // Mock user for standalone
      }
    });
    return new Response(JSON.stringify(dna), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

export async function handleDnaQuery(req: Request, headers: Headers) {
  try {
    const dnas = await prisma.dnaVault.findMany({ take: 50 });
    return new Response(JSON.stringify(dnas), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
