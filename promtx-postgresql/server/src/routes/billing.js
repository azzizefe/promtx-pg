import { PrismaClient } from '@prisma/client';
import { createCustomerPortalSession, carryOverCredits, createSubscriptionCheckout, changeSubscriptionPlan, cancelSubscriptionAtPeriodEnd, resumeSubscription, getSubscriptionInvoices } from '../services/billing';
const prisma = new PrismaClient();
export async function handleBillingWallet(req, headers) {
    try {
        const wallet = await prisma.wallet.findFirst();
        return new Response(JSON.stringify(wallet), { status: 200, headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) } });
    }
    catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
export async function handleBillingTopup(req, headers) {
    return new Response(JSON.stringify({ checkoutUrl: 'https://stripe.com/checkout/mock-session' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) }
    });
}
export async function handleBillingPaymentIntent(req, headers) {
    return new Response(JSON.stringify({ clientSecret: 'pi_mock_secret_123456' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) }
    });
}
export async function handleBillingWebhooks(req, headers) {
    try {
        const body = await req.json();
        const event = body;
        if (event.type === 'invoice.paid') {
            const invoice = event.data.object;
            const customerId = invoice.customer;
            const subscription = await prisma.subscription.findFirst({
                where: { stripeCustomerId: customerId },
            });
            if (subscription) {
                await carryOverCredits(subscription.userId);
            }
        }
        return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) }
        });
    }
    catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) }
        });
    }
}
export async function handleBillingLedger(req, headers) {
    try {
        const ledger = await prisma.ledgerEntry.findMany({ take: 20 });
        return new Response(JSON.stringify(ledger), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) }
        });
    }
    catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
export async function handlePromoCodeValidate(req, headers) {
    return new Response(JSON.stringify({ valid: true, discountPercent: 20, code: 'WELCOME2026' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) }
    });
}
export async function handleIapVerify(req, headers) {
    return new Response(JSON.stringify({ verified: true, status: 'active' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) }
    });
}
export async function handleReceiptDownload(req, headers) {
    return new Response('%PDF-1.4 [Mock PDF Generated for Promtx Receipt]', {
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="receipt.pdf"',
            ...Object.fromEntries(headers)
        }
    });
}
export async function handleBillingSubscriptionManage(req, headers) {
    try {
        let userId = 'mock-user-id';
        try {
            const body = await req.clone().json();
            if (body.userId)
                userId = body.userId;
        }
        catch (e) {
            // No body or not JSON
        }
        const user = await prisma.user.findFirst();
        if (user && userId === 'mock-user-id') {
            userId = user.id;
        }
        const portalUrl = await createCustomerPortalSession(userId);
        return new Response(JSON.stringify({ url: portalUrl }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) }
        });
    }
    catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) }
        });
    }
}
export async function handleBillingSubscriptionCheckout(req, headers) {
    try {
        const body = await req.json();
        let userId = body.userId || 'mock-user-id';
        const priceId = body.priceId;
        if (!priceId) {
            return new Response(JSON.stringify({ error: 'priceId is required' }), { status: 400 });
        }
        const user = await prisma.user.findFirst();
        if (user && userId === 'mock-user-id') {
            userId = user.id;
        }
        const url = await createSubscriptionCheckout(userId, priceId);
        return new Response(JSON.stringify({ url }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) }
        });
    }
    catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
export async function handleBillingSubscriptionStatus(req, headers) {
    try {
        let userId = 'mock-user-id';
        const user = await prisma.user.findFirst();
        if (user) {
            userId = user.id;
        }
        const subscription = await prisma.subscription.findUnique({
            where: { userId },
        });
        return new Response(JSON.stringify(subscription), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) }
        });
    }
    catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
export async function handleBillingSubscriptionChange(req, headers) {
    try {
        const body = await req.json();
        let userId = body.userId || 'mock-user-id';
        const newPlan = body.plan;
        const newPriceId = body.priceId;
        if (!newPlan || !newPriceId) {
            return new Response(JSON.stringify({ error: 'plan and priceId are required' }), { status: 400 });
        }
        const user = await prisma.user.findFirst();
        if (user && userId === 'mock-user-id') {
            userId = user.id;
        }
        await changeSubscriptionPlan(userId, newPlan, newPriceId);
        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) }
        });
    }
    catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
export async function handleBillingSubscriptionCancel(req, headers) {
    try {
        let userId = 'mock-user-id';
        const user = await prisma.user.findFirst();
        if (user)
            userId = user.id;
        await cancelSubscriptionAtPeriodEnd(userId);
        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) }
        });
    }
    catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
export async function handleBillingSubscriptionResume(req, headers) {
    try {
        let userId = 'mock-user-id';
        const user = await prisma.user.findFirst();
        if (user)
            userId = user.id;
        await resumeSubscription(userId);
        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) }
        });
    }
    catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
export async function handleBillingInvoices(req, headers) {
    try {
        let userId = 'mock-user-id';
        const user = await prisma.user.findFirst();
        if (user)
            userId = user.id;
        const invoices = await getSubscriptionInvoices(userId);
        return new Response(JSON.stringify(invoices), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) }
        });
    }
    catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
export async function handleBillingCreditsUsage(req, headers) {
    try {
        let userId = 'mock-user-id';
        const user = await prisma.user.findFirst();
        if (user)
            userId = user.id;
        const subscription = await prisma.subscription.findUnique({
            where: { userId },
            select: { monthlyCredits: true, creditsUsedThisPeriod: true }
        });
        return new Response(JSON.stringify(subscription), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) }
        });
    }
    catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
