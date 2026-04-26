import { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { carryOverCredits } from '../../server/src/services/billing';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

const prisma = new PrismaClient();

export const config = { api: { bodyParser: false } };

async function buffer(readable: any) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const sig = req.headers['stripe-signature'] as string;
  let buf;
  try {
    buf = await buffer(req);
  } catch (e: any) {
    return res.status(400).send(`Buffer Error: ${e.message}`);
  }
  
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Idempotency
  const existing = await prisma.stripeEvent.findUnique({ where: { id: event.id } });
  if (existing?.processedAt) {
    return res.json({ received: true, duplicate: true });
  }
  
  // Event kaydet
  await prisma.stripeEvent.upsert({
    where: { id: event.id },
    update: {},
    create: { 
      id: event.id, 
      eventType: event.type, 
      data: event.data as any,
      status: 'pending'
    },
  });

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        const customerId = subscription.customer as string;
        const priceId = subscription.items.data[0].price.id;
        const status = subscription.status;
        
        const localSub = await prisma.subscription.findFirst({
          where: { stripeCustomerId: customerId } as any,
        });

        if (localSub) {
          await prisma.subscription.update({
            where: { id: localSub.id },
            data: {
              stripeSubscriptionId: subscription.id,
              stripePriceId: priceId,
              status: status === 'active' ? 'active' : 'inactive',
              currentPeriodStart: new Date(subscription.current_period_start * 1000),
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
            } as any
          });
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        const localSub = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: subscription.id } as any,
        });

        if (localSub) {
          await prisma.subscription.update({
            where: { id: localSub.id },
            data: {
              status: 'canceled',
              canceledAt: new Date(),
            } as any
          });
        }
        break;
      }
      case 'invoice.paid': {
        const invoice = event.data.object as any;
        const customerId = invoice.customer as string;
        
        const localSub = await prisma.subscription.findFirst({
          where: { stripeCustomerId: customerId } as any,
        });

        if (localSub) {
          await carryOverCredits(localSub.userId);
        }
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        const customerId = invoice.customer as string;
        
        const localSub = await prisma.subscription.findFirst({
          where: { stripeCustomerId: customerId } as any,
        });

        if (localSub) {
          await prisma.subscription.update({
            where: { id: localSub.id },
            data: {
              status: 'past_due',
            } as any
          });
        }
        break;
      }
    }

    // Islendi olarak isaretle
    await prisma.stripeEvent.update({
      where: { id: event.id },
      data: { 
        processedAt: new Date(), 
        status: 'completed' 
      },
    });

    res.json({ received: true });
  } catch (error: any) {
    await prisma.stripeEvent.update({
      where: { id: event.id },
      data: { 
        status: 'failed',
        errorMessage: error.message,
        retryCount: { increment: 1 }
      },
    });
    res.status(500).json({ error: error.message });
  }
}
