import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function handleBillingWallet(req: Request, headers: Headers) {
  try {
    const wallet = await prisma.wallet.findFirst();
    return new Response(JSON.stringify(wallet), { status: 200, headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

export async function handleBillingTopup(req: Request, headers: Headers) {
  return new Response(JSON.stringify({ checkoutUrl: 'https://stripe.com/checkout/mock-session' }), { 
    status: 200, 
    headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) } 
  });
}

export async function handleBillingPaymentIntent(req: Request, headers: Headers) {
  return new Response(JSON.stringify({ clientSecret: 'pi_mock_secret_123456' }), { 
    status: 200, 
    headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) } 
  });
}

export async function handleBillingWebhooks(req: Request, headers: Headers) {
  return new Response(JSON.stringify({ received: true }), { 
    status: 200, 
    headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) } 
  });
}

export async function handleBillingLedger(req: Request, headers: Headers) {
  try {
    const ledger = await prisma.ledgerEntry.findMany({ take: 20 });
    return new Response(JSON.stringify(ledger), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

export async function handlePromoCodeValidate(req: Request, headers: Headers) {
  return new Response(JSON.stringify({ valid: true, discountPercent: 20, code: 'WELCOME2026' }), { 
    status: 200, 
    headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) } 
  });
}

export async function handleIapVerify(req: Request, headers: Headers) {
  return new Response(JSON.stringify({ verified: true, status: 'active' }), { 
    status: 200, 
    headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) } 
  });
}

export async function handleReceiptDownload(req: Request, headers: Headers) {
  return new Response(
    '%PDF-1.4 [Mock PDF Generated for Promtx Receipt]', 
    { 
      headers: { 
        'Content-Type': 'application/pdf', 
        'Content-Disposition': 'attachment; filename="receipt.pdf"',
        ...Object.fromEntries(headers) 
      } 
    }
  );
}
