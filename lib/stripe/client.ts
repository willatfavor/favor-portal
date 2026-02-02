import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-01-28.clover',
});

export async function createCustomer(email: string, name: string) {
  return stripe.customers.create({
    email,
    name,
  });
}

export async function createSubscription(
  customerId: string, 
  priceId: string, 
  amount: number
) {
  // For demo purposes - in production you'd use Stripe Checkout or Elements
  return {
    id: `sub_${Math.random().toString(36).substring(7)}`,
    status: 'active',
    amount,
  };
}

export async function updateSubscriptionAmount(subscriptionId: string, newAmount: number) {
  // In production, this would update the Stripe subscription
  console.log('Would update subscription', subscriptionId, 'to amount', newAmount);
  return { success: true };
}

export async function cancelSubscription(subscriptionId: string) {
  // In production, this would cancel the Stripe subscription
  console.log('Would cancel subscription', subscriptionId);
  return { success: true };
}

export async function pauseSubscription(subscriptionId: string) {
  // In production, this would pause the Stripe subscription
  console.log('Would pause subscription', subscriptionId);
  return { success: true };
}

export { stripe };
