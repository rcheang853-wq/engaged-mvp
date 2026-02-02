import Stripe from 'stripe';
import { loadStripe } from '@stripe/stripe-js';

// Re-export subscription config (no Stripe initialization)
export * from './subscription-config';

// Lazy initialization of server-side Stripe instance
let stripeInstance: Stripe | null = null;

export function getServerStripe(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
      typescript: true,
    });
  }
  return stripeInstance;
}

// For backward compatibility (deprecated - use getServerStripe() instead)
export const stripe = new Proxy({} as Stripe, {
  get(target, prop) {
    return getServerStripe()[prop as keyof Stripe];
  }
});

// Client-side Stripe instance
let stripePromise: Promise<Stripe | null> | null = null;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
};
