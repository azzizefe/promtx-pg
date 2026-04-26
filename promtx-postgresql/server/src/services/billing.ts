import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-04-22.dahlia' as any,
});

const prisma = new PrismaClient();

export async function getOrCreateCustomer(userId: string, email: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (user?.stripeCustomerId) {
    // Sync to Subscription if missing
    const sub = await prisma.subscription.findUnique({ where: { userId } });
    if (!sub) {
      await prisma.subscription.create({
        data: {
          userId,
          stripeCustomerId: user.stripeCustomerId,
          plan: 'starter',
          status: 'active',
        }
      });
    }
    return user.stripeCustomerId;
  }

  // Check Subscription table directly too
  const existingSub = await prisma.subscription.findUnique({
    where: { userId },
    select: { stripeCustomerId: true },
  });

  if (existingSub?.stripeCustomerId) {
    return existingSub.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    email,
    metadata: {
      user_id: userId,
      promtx_plan: 'starter',
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  });

  await prisma.subscription.upsert({
    where: { userId },
    update: { stripeCustomerId: customer.id },
    create: {
      userId,
      stripeCustomerId: customer.id,
      plan: 'starter',
      status: 'active',
    },
  });

  return customer.id;
}

export async function createSubscriptionCheckout(
  userId: string,
  priceId: string,
  trialDays?: number
): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, stripeCustomerId: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    customerId = await getOrCreateCustomer(userId, user.email);
  }

  const isProd = process.env.NODE_ENV === 'production';
  const baseUrl = isProd 
    ? 'https://promtx.ai' 
    : (process.env.VITE_API_URL?.includes('vercel.app') 
        ? 'https://promtx.vercel.app' 
        : 'http://localhost:1420');

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    subscription_data: {
      ...(trialDays ? { trial_period_days: trialDays } : {}),
      metadata: {
        user_id: userId,
      },
    },
    allow_promotion_codes: true,
    success_url: `${baseUrl}/subscription/success`,
    cancel_url: `${baseUrl}/subscription/cancel`,
  });

  if (!session.url) {
    throw new Error('Failed to create Stripe Checkout session');
  }

  return session.url;
}

export async function createCheckoutSession(
  userId: string,
  amount: number, // In cents
  currency: string = 'usd',
  description: string = 'Top-up credits'
): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, stripeCustomerId: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    customerId = await getOrCreateCustomer(userId, user.email);
  }

  const isProd = process.env.NODE_ENV === 'production';
  const baseUrl = isProd ? 'https://promtx.ai' : (process.env.VITE_API_URL?.includes('vercel.app') ? 'https://promtx.vercel.app' : 'http://localhost:1420');

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: customerId,
    line_items: [
      {
        price_data: {
          currency,
          product_data: {
            name: description,
          },
          unit_amount: amount,
        },
        quantity: 1,
      },
    ],
    metadata: {
      user_id: userId,
      type: 'topup',
    },
    success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/checkout/cancel`,
  });

  if (!session.url) {
    throw new Error('Failed to create Stripe Checkout session');
  }

  return session.url;
}

export async function createCustomerPortalSession(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (!user?.stripeCustomerId) {
    throw new Error('User has no Stripe Customer ID');
  }

  const isProd = process.env.NODE_ENV === 'production';
  const baseUrl = isProd 
    ? 'https://promtx.ai' 
    : (process.env.VITE_API_URL?.includes('vercel.app') 
        ? 'https://promtx.vercel.app' 
        : 'http://localhost:1420');

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${baseUrl}/settings`,
  });

  return session.url;
}

export async function changeSubscriptionPlan(
  userId: string,
  newPlan: 'starter' | 'creator' | 'studio_pro',
  newPriceId: string
): Promise<void> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription || !subscription.stripeSubscriptionId) {
    throw new Error('No active subscription found for user');
  }

  const stripeSub = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
  const subscriptionItemId = stripeSub.items.data[0].id;

  const planHierarchy = { starter: 0, creator: 1, studio_pro: 2 };
  const currentPlan = subscription.plan as 'starter' | 'creator' | 'studio_pro';
  
  const currentLevel = planHierarchy[currentPlan];
  const newLevel = planHierarchy[newPlan];

  if (newLevel > currentLevel) {
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      items: [{ id: subscriptionItemId, price: newPriceId }],
      proration_behavior: 'create_prorations',
    });
  } else if (newLevel < currentLevel) {
    if (newPlan === 'starter') {
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    } else {
      try {
        const schedule = await stripe.subscriptionSchedules.create({
          from_subscription: subscription.stripeSubscriptionId,
        });
        
        const retrievedSchedule = await stripe.subscriptionSchedules.retrieve(schedule.id);
        const currentPhase = retrievedSchedule.phases[0];
        const currentPriceId = typeof currentPhase.items[0].price === 'string' 
          ? currentPhase.items[0].price 
          : (currentPhase.items[0].price as any).id;

        await stripe.subscriptionSchedules.update(schedule.id, {
          phases: [
            {
              items: [{ price: currentPriceId, quantity: 1 }],
              start_date: currentPhase.start_date,
              end_date: currentPhase.end_date,
            } as any,
            {
              items: [{ price: newPriceId, quantity: 1 }],
              iterations: 1,
            } as any,
          ],
        });
      } catch (e) {
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          items: [{ id: subscriptionItemId, price: newPriceId }],
          proration_behavior: 'none',
        });
      }
    }
  }

  if (newPlan === 'starter') {
    await prisma.subscription.update({
      where: { userId },
      data: { 
        cancelAtPeriodEnd: true,
      }
    });
  } else if (newLevel > currentLevel) {
    await prisma.subscription.update({
      where: { userId },
      data: { 
        plan: newPlan,
        stripePriceId: newPriceId,
      }
    });
    
    await prisma.user.update({
      where: { id: userId },
      data: { role: newPlan === 'studio_pro' ? 'Enterprise' : 'Pro' }
    });
  }

  await prisma.subscriptionHistory.create({
    data: {
      userId,
      fromPlan: currentPlan,
      toPlan: newPlan,
      fromPrice: subscription.stripePriceId,
      toPrice: newPriceId,
      reason: newLevel > currentLevel ? 'upgrade' : 'downgrade',
    }
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: 'subscription_change',
      resourceType: 'subscription',
      resourceId: subscription.id,
      metadata: { fromPlan: currentPlan, toPlan: newPlan },
    }
  });
}
