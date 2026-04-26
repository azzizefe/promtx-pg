import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function handleLlmGenerate(req: Request, headers: Headers) {
  try {
    const body = await req.json();
    let userId = 'mock-user-id';
    if (body.userId) userId = body.userId;

    const user = await prisma.user.findFirst();
    if (user && userId === 'mock-user-id') {
      userId = user.id;
    }

    const wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet || Number(wallet.credits) <= 0) {
      const subscription = await prisma.subscription.findUnique({
        where: { userId },
      });
      
      const plan = subscription?.plan || 'starter';
      
      if (plan === 'starter') {
        return new Response(
          JSON.stringify({ error: 'Krediniz bitti. Aboneliğinizi yükseltin.' }), 
          { status: 402, headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) } }
        );
      } else {
        return new Response(
          JSON.stringify({ error: 'Krediniz bitti. Ek kredi satın alın.' }), 
          { status: 402, headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) } }
        );
      }
    }

    await prisma.wallet.update({
      where: { userId },
      data: {
        credits: { decrement: 1 },
      }
    });

    await prisma.subscription.update({
      where: { userId },
      data: {
        creditsUsedThisPeriod: { increment: 1 },
      } as any
    });

    return new Response(
      JSON.stringify({ 
        status: 'success', 
        text: `[Mock Response] Promtx LLM completed your query: ${body.prompt || ''}`,
        usage: { inputTokens: 120, outputTokens: 250, costUsd: 0.005 }
      }), 
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) }
      }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

export async function handleLlmGenerateParallel(req: Request, headers: Headers) {
  try {
    const body = await req.json();
    const prompts = body.prompts || [];
    const results = prompts.map((p: string, i: number) => ({
      prompt: p,
      text: `[Parallel Result ${i + 1}] Mock output for batch processing.`
    }));

    return new Response(
      JSON.stringify({ status: 'success', results }), 
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) }
      }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

export async function handleLlmStream(req: Request, headers: Headers) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode('data: {"text": "Promtx"}\n\n'));
      await new Promise(r => setTimeout(r, 100));
      controller.enqueue(encoder.encode('data: {"text": " streaming"}\n\n'));
      await new Promise(r => setTimeout(r, 100));
      controller.enqueue(encoder.encode('data: {"text": " output"}\n\n'));
      await new Promise(r => setTimeout(r, 100));
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      ...Object.fromEntries(headers)
    }
  });
}

export async function handleLlmAbort(req: Request, headers: Headers) {
  return new Response(
    JSON.stringify({ status: 'success', message: 'Request successfully aborted.' }), 
    {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) }
    }
  );
}

export async function handleLlmUsageHistory(req: Request, headers: Headers) {
  try {
    const usages = await prisma.tokenUsage.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' }
    });
    
    return new Response(
      JSON.stringify(usages), 
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) }
      }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

export async function handleLlmUsageSummary(req: Request, headers: Headers) {
  try {
    const summary = await prisma.tokenUsage.aggregate({
      _sum: {
        inputTokens: true,
        outputTokens: true,
        costUsd: true
      },
      _count: {
        id: true
      }
    });

    return new Response(
      JSON.stringify({
        totalRequests: summary._count.id,
        totalInputTokens: summary._sum.inputTokens || 0,
        totalOutputTokens: summary._sum.outputTokens || 0,
        totalCostUsd: summary._sum.costUsd || 0
      }), 
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) }
      }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
