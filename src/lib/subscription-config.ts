// Subscription plan configuration (no Stripe initialization)
export const SUBSCRIPTION_PLANS = {
  FREE: {
    id: 'free',
    name: 'Free',
    stripePriceId: null,
    amount: 0,
    currency: 'HKD',
    interval: 'month' as const,
    features: [
      '40 swipes per day',
      'Basic event discovery',
      'Calendar integration',
      'Save events',
    ],
    limits: {
      dailySwipes: 40,
      superlikes: 0,
      advancedFilters: false,
      earlyAccess: false,
      prioritySupport: false,
    },
  },
  PRO: {
    id: 'pro',
    name: 'Pro',
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID,
    amount: 3800, // HKD 38.00 in cents
    currency: 'HKD',
    interval: 'month' as const,
    features: [
      'Unlimited swipes',
      'Super likes',
      'Advanced filters',
      'Early access to events',
      'Priority support',
      'Detailed analytics',
    ],
    limits: {
      dailySwipes: -1, // Unlimited
      superlikes: 5,
      advancedFilters: true,
      earlyAccess: true,
      prioritySupport: true,
    },
  },
} as const;

// Helper to get plan by ID
export function getSubscriptionPlan(planId: string) {
  switch (planId) {
    case 'free':
      return SUBSCRIPTION_PLANS.FREE;
    case 'pro':
      return SUBSCRIPTION_PLANS.PRO;
    default:
      return SUBSCRIPTION_PLANS.FREE;
  }
}

// Helper to check if user has specific feature
export function hasFeature(
  isPro: boolean,
  feature: keyof typeof SUBSCRIPTION_PLANS.PRO.limits
): boolean {
  if (!isPro) {
    return SUBSCRIPTION_PLANS.FREE.limits[feature] as boolean;
  }
  return SUBSCRIPTION_PLANS.PRO.limits[feature] as boolean;
}

// Helper to get daily swipe limit
export function getDailySwipeLimit(isPro: boolean): number {
  return isPro ? SUBSCRIPTION_PLANS.PRO.limits.dailySwipes : SUBSCRIPTION_PLANS.FREE.limits.dailySwipes;
}
