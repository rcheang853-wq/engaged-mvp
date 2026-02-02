'use client';

import { Button } from '@/components/ui/button';
import { Check, Crown, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SubscriptionPlan } from '@/types';

interface PricingCardProps {
  plan: SubscriptionPlan;
  isCurrentPlan?: boolean;
  isPopular?: boolean;
  onSelectPlan: () => void;
  loading?: boolean;
}

export function PricingCard({
  plan,
  isCurrentPlan = false,
  isPopular = false,
  onSelectPlan,
  loading = false,
}: PricingCardProps) {
  const isFreePlan = plan.amount === 0;

  return (
    <div
      className={cn(
        'relative rounded-lg border p-6 shadow-sm transition-all hover:shadow-md',
        isPopular && 'border-blue-500 ring-2 ring-blue-500 ring-opacity-20',
        isCurrentPlan && 'border-green-500 bg-green-50'
      )}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 transform">
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500 px-3 py-1 text-xs font-medium text-white">
            <Crown className="h-3 w-3" />
            Most Popular
          </span>
        </div>
      )}

      {isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 transform">
          <span className="inline-flex items-center gap-1 rounded-full bg-green-500 px-3 py-1 text-xs font-medium text-white">
            <Check className="h-3 w-3" />
            Current Plan
          </span>
        </div>
      )}

      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          {!isFreePlan && <Zap className="h-5 w-5 text-blue-500" />}
          <h3 className="text-xl font-semibold">{plan.name}</h3>
        </div>

        <div className="mb-6">
          <span className="text-4xl font-bold">
            ${(plan.amount / 100).toFixed(0)}
          </span>
          <span className="text-gray-600 ml-1">HKD</span>
          {!isFreePlan && (
            <span className="text-gray-600 block text-sm">per month</span>
          )}
        </div>

        <Button
          onClick={onSelectPlan}
          disabled={isCurrentPlan || loading}
          className={cn(
            'w-full mb-6',
            isPopular && 'bg-blue-500 hover:bg-blue-600',
            isCurrentPlan && 'bg-green-500 hover:bg-green-600'
          )}
          variant={isCurrentPlan ? 'default' : isPopular ? 'default' : 'outline'}
        >
          {loading
            ? 'Processing...'
            : isCurrentPlan
            ? 'Current Plan'
            : isFreePlan
            ? 'Get Started'
            : 'Upgrade Now'}
        </Button>

        <div className="space-y-3 text-left">
          {plan.features.map((feature, index) => (
            <div key={index} className="flex items-start gap-3">
              <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span className="text-sm text-gray-700">{feature}</span>
            </div>
          ))}
        </div>

        {!isFreePlan && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-xs text-gray-500 space-y-1">
              <div>• Daily swipes: {plan.limits.dailySwipes === -1 ? 'Unlimited' : plan.limits.dailySwipes}</div>
              <div>• Super likes: {plan.limits.superlikes}/day</div>
              {plan.limits.advancedFilters && <div>• Advanced filters</div>}
              {plan.limits.earlyAccess && <div>• Early access to events</div>}
              {plan.limits.prioritySupport && <div>• Priority support</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}