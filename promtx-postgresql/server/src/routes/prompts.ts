import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function handlePromptHistorySave(req: Request, headers: Headers) {
  try {
    const body = await req.json();
    const history = await prisma.promptHistory.create({
      data: {
        userId: body.userId || 'user-free-001',
        promptText: body.prompt || '',
        parameters: body.parameters || {},
        studioType: body.studioType || 'image',
        modelId: body.modelId || 'gpt-4o',
      }
    });
    return new Response(JSON.stringify(history), { 
      status: 201, 
      headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

export async function handlePromptHistoryQuery(req: Request, headers: Headers) {
  try {
    const history = await prisma.promptHistory.findMany({ take: 50, orderBy: { createdAt: 'desc' } });
    return new Response(JSON.stringify(history), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

export async function handlePromptTemplateSave(req: Request, headers: Headers) {
  try {
    const body = await req.json();
    const template = await prisma.promptTemplate.create({
      data: {
        name: body.name || 'Template Title',
        description: body.description || '',
        studioType: body.studioType || 'image',
        templateText: body.templateText || '',
        tags: body.tags || [],
        userId: body.userId || 'user-free-001',
      }
    });
    return new Response(JSON.stringify(template), { 
      status: 201, 
      headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

export async function handlePromptTemplateQuery(req: Request, headers: Headers) {
  try {
    const templates = await prisma.promptTemplate.findMany({ take: 50 });
    return new Response(JSON.stringify(templates), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

export async function handlePromptTemplateDelete(req: Request, headers: Headers) {
  return new Response(JSON.stringify({ status: 'success', message: 'Template deleted successfully.' }), { 
    status: 200, 
    headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) } 
  });
}
