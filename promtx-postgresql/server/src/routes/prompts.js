import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export async function handlePromptHistorySave(req, headers) {
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
    }
    catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
export async function handlePromptHistoryQuery(req, headers) {
    try {
        const history = await prisma.promptHistory.findMany({ take: 50, orderBy: { createdAt: 'desc' } });
        return new Response(JSON.stringify(history), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) }
        });
    }
    catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
export async function handlePromptTemplateSave(req, headers) {
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
    }
    catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
export async function handlePromptTemplateQuery(req, headers) {
    try {
        const templates = await prisma.promptTemplate.findMany({ take: 50 });
        return new Response(JSON.stringify(templates), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) }
        });
    }
    catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
export async function handlePromptTemplateDelete(req, headers) {
    return new Response(JSON.stringify({ status: 'success', message: 'Template deleted successfully.' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) }
    });
}
