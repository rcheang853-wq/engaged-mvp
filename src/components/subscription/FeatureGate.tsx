'use client';

import { ReactNode } from 'react';
import { useSubscription } from '@/hooks/use-subscription';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Crown, Lock, Zap } from 'lucide-react';
import Link from 'next/link';

interface FeatureGateProps {
  feature: 'advancedFilters' | 'earlyAccess' | 'prioritySupport' | 'unlimitedSwipes';
  children: ReactNode;
  fallback?: ReactNode;
  showUpgrade?: boolean;
}

export function FeatureGate({
  feature,
  children,
  fallback,
  showUpgrade = true,
}: FeatureGateProps) {
  const { data: subscriptionData, isLoading } = useSubscription();

  if (isLoading) {
    return (
      <div className="h-32 bg-gray-100 rounded-lg animate-pulse" />
    );
  }

  const isPro = subscriptionData?.subscription?.status === 'active';
  const usageLimits = subscriptionData?.usageLimits;

  // Check if user has access to the feature
  const hasAccess = (() => {
    if (!isPro) return false;

    switch (feature) {
      case 'advancedFilters':
        return usageLimits?.canUseAdvancedFilters ?? false;
      case 'earlyAccess':
        return usageLimits?.hasEarlyAccess ?? false;
      case 'prioritySupport':
        return isPro;
      case 'unlimitedSwipes':
        return usageLimits?.dailySwipes === -1;
      default:
        return false;
    }
  })();

  if (hasAccess) {
    return <>{children}</>;
  }

  // Show custom fallback if provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Show upgrade prompt if enabled
  if (showUpgrade) {
    return <UpgradePrompt feature={feature} />;
  }

  // Hide the feature entirely
  return null;
}

interface UpgradePromptProps {
  feature: string;
}

function UpgradePrompt({ feature }: UpgradePromptProps) {
  const featureNames = {
    advancedFilters: 'Advanced Filters',
    earlyAccess: 'Early Access',
    prioritySupport: 'Priority Support',
    unlimitedSwipes: 'Unlimited Swipes',
  };

  const featureDescriptions = {
    advancedFilters: 'Filter events by multiple criteria including price range, venue type, and more.',
    earlyAccess: 'Get notified about new events before they\'re public.',
    prioritySupport: 'Get faster responses and dedicated support.',
    unlimitedSwipes: 'Swipe through unlimited events without daily restrictions.',
  };

  return (
    <Card className="border-2 border-blue-200 bg-blue-50">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <Crown className="h-6 w-6 text-blue-600" />
        </div>
        <CardTitle className="flex items-center justify-center gap-2">
          <Lock className="h-5 w-5 text-blue-600" />
          {featureNames[feature as keyof typeof featureNames]} - Pro Only
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <p className="text-gray-600">
          {featureDescriptions[feature as keyof typeof featureDescriptions]}
        </p>
        <div className="space-y-2">
          <Link href="/pricing">
            <Button className="w-full bg-blue-600 hover:bg-blue-700">
              <Zap className="h-4 w-4 mr-2" />
              Upgrade to Pro - $38 HKD/month
            </Button>
          </Link>
          <p className="text-xs text-gray-500">
            Unlock all premium features and unlimited access
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Hook for checking feature access in components
export function useFeatureAccess(feature: FeatureGateProps['feature']) {
  const { data: subscriptionData } = useSubscription();

  const isPro = subscriptionData?.subscription?.status === 'active';
  const usageLimits = subscriptionData?.usageLimits;

  const hasAccess = (() => {
    if (!isPro) return false;

    switch (feature) {
      case 'advancedFilters':
        return usageLimits?.canUseAdvancedFilters ?? false;
      case 'earlyAccess':
        return usageLimits?.hasEarlyAccess ?? false;
      case 'prioritySupport':
        return isPro;
      case 'unlimitedSwipes':
        return usageLimits?.dailySwipes === -1;
      default:
        return false;
    }
  })();

  return { hasAccess, isPro, usageLimits };
}