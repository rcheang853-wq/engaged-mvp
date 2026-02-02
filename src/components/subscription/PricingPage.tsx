'use client';

import { useAuth } from '@/hooks/use-auth';
import { useSubscription, useCreateCheckoutSession } from '@/hooks/use-subscription';
import { PricingCard } from './PricingCard';
import { SUBSCRIPTION_PLANS } from '@/lib/subscription-config';
import { SubscriptionPlan } from '@/types';

export function PricingPage() {
  const { user } = useAuth();
  const { data: subscriptionData } = useSubscription();
  const createCheckoutSession = useCreateCheckoutSession();

  const plans: SubscriptionPlan[] = [
    {
      id: SUBSCRIPTION_PLANS.FREE.id,
      name: SUBSCRIPTION_PLANS.FREE.name,
      stripePriceId: SUBSCRIPTION_PLANS.FREE.stripePriceId || '',
      amount: SUBSCRIPTION_PLANS.FREE.amount,
      currency: SUBSCRIPTION_PLANS.FREE.currency,
      interval: SUBSCRIPTION_PLANS.FREE.interval,
      features: SUBSCRIPTION_PLANS.FREE.features,
      limits: SUBSCRIPTION_PLANS.FREE.limits,
    },
    {
      id: SUBSCRIPTION_PLANS.PRO.id,
      name: SUBSCRIPTION_PLANS.PRO.name,
      stripePriceId: SUBSCRIPTION_PLANS.PRO.stripePriceId,
      amount: SUBSCRIPTION_PLANS.PRO.amount,
      currency: SUBSCRIPTION_PLANS.PRO.currency,
      interval: SUBSCRIPTION_PLANS.PRO.interval,
      features: SUBSCRIPTION_PLANS.PRO.features,
      limits: SUBSCRIPTION_PLANS.PRO.limits,
    },
  ];

  const currentPlanType = subscriptionData?.subscription?.status === 'active' ? 'pro' : 'free';

  const handleSelectPlan = (planId: string) => {
    if (!user?.id || planId === 'free') return;

    const successUrl = `${window.location.origin}/subscription/success`;
    const cancelUrl = `${window.location.origin}/subscription/canceled`;

    createCheckoutSession.mutate({
      userId: user.id,
      successUrl,
      cancelUrl,
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Choose Your Plan
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Discover amazing events in Macau, Hong Kong, and the Greater Bay Area.
          Upgrade to Pro for unlimited access and exclusive features.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {plans.map((plan, index) => (
          <PricingCard
            key={plan.id}
            plan={plan}
            isCurrentPlan={plan.id === currentPlanType}
            isPopular={plan.id === 'pro'}
            onSelectPlan={() => handleSelectPlan(plan.id)}
            loading={createCheckoutSession.isPending}
          />
        ))}
      </div>

      <div className="mt-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">
          Frequently Asked Questions
        </h2>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto text-left">
          <div>
            <h3 className="font-semibold text-lg mb-2">Can I cancel anytime?</h3>
            <p className="text-gray-600">
              Yes, you can cancel your Pro subscription at any time. You'll continue
              to have access to Pro features until the end of your current billing period.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">What payment methods do you accept?</h3>
            <p className="text-gray-600">
              We accept all major credit cards (Visa, MasterCard, American Express)
              and other payment methods through Stripe.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">Is there a free trial?</h3>
            <p className="text-gray-600">
              Every new user starts with our free plan which includes 40 swipes per day.
              You can upgrade to Pro at any time to unlock unlimited features.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">Can I change my plan later?</h3>
            <p className="text-gray-600">
              Yes, you can upgrade or downgrade your plan at any time. Changes will
              be prorated and reflected in your next billing cycle.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}