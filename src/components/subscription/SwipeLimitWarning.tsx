'use client';

import { useSubscription } from '@/hooks/use-subscription';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Crown, Zap } from 'lucide-react';
import Link from 'next/link';

interface SwipeLimitWarningProps {
  onClose?: () => void;
}

export function SwipeLimitWarning({ onClose }: SwipeLimitWarningProps) {
  const { data: subscriptionData } = useSubscription();

  if (!subscriptionData) return null;

  const { usageLimits } = subscriptionData;
  const isPro = subscriptionData.subscription?.status === 'active';

  // Don't show warning for Pro users
  if (isPro) return null;

  const remainingSwipes = usageLimits.dailySwipes - usageLimits.currentSwipes;
  const usagePercentage = (usageLimits.currentSwipes / usageLimits.dailySwipes) * 100;

  // Show warning when user has used 80% or more of their daily limit
  if (usagePercentage < 80) return null;

  const isLimitReached = remainingSwipes <= 0;

  return (
    <Alert className={`border-2 ${isLimitReached ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'}`}>
      <AlertTriangle className={`h-4 w-4 ${isLimitReached ? 'text-red-600' : 'text-yellow-600'}`} />
      <AlertDescription className="flex flex-col space-y-3">
        <div>
          <p className="font-medium">
            {isLimitReached
              ? 'Daily swipe limit reached!'
              : `Only ${remainingSwipes} swipes remaining today`}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {isLimitReached
              ? 'You\'ve used all 40 of your daily swipes. Your limit resets tomorrow or upgrade to Pro for unlimited swipes.'
              : 'You\'re approaching your daily limit. Upgrade to Pro for unlimited swipes and more features.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Link href="/pricing" className="flex-1">
            <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700">
              <Crown className="h-4 w-4 mr-2" />
              Upgrade to Pro
            </Button>
          </Link>
          {onClose && (
            <Button
              size="sm"
              variant="outline"
              onClick={onClose}
              className="sm:w-auto"
            >
              Dismiss
            </Button>
          )}
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex justify-between">
            <span>Today's usage:</span>
            <span>{usageLimits.currentSwipes} / {usageLimits.dailySwipes}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${
                isLimitReached ? 'bg-red-500' : 'bg-yellow-500'
              }`}
              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
            />
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}

// Hook to check if warning should be shown
export function useSwipeLimitWarning() {
  const { data: subscriptionData } = useSubscription();

  if (!subscriptionData) return { shouldShow: false, isLimitReached: false };

  const { usageLimits } = subscriptionData;
  const isPro = subscriptionData.subscription?.status === 'active';

  if (isPro) return { shouldShow: false, isLimitReached: false };

  const remainingSwipes = usageLimits.dailySwipes - usageLimits.currentSwipes;
  const usagePercentage = (usageLimits.currentSwipes / usageLimits.dailySwipes) * 100;
  const isLimitReached = remainingSwipes <= 0;
  const shouldShow = usagePercentage >= 80;

  return {
    shouldShow,
    isLimitReached,
    remainingSwipes,
    usagePercentage,
  };
}