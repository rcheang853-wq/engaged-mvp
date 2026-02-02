'use client';

import { useSubscription, useBillingPortal } from '@/hooks/use-subscription';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, CreditCard, Settings, TrendingUp, Zap } from 'lucide-react';
import { format } from 'date-fns';

export function SubscriptionDashboard() {
  const { user } = useAuth();
  const { data: subscriptionData, isLoading } = useSubscription();
  const billingPortal = useBillingPortal();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-48 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-32 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!subscriptionData) {
    return (
      <Card>
        <CardContent className="p-6">
          <p>No subscription data available.</p>
        </CardContent>
      </Card>
    );
  }

  const { subscription, usageLimits, recentPayments } = subscriptionData;
  const isPro = subscription?.status === 'active';

  const handleManageBilling = () => {
    if (!user?.id) return;

    billingPortal.mutate({
      userId: user.id,
      returnUrl: window.location.href,
    });
  };

  return (
    <div className="space-y-6">
      {/* Subscription Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {isPro ? <Zap className="h-5 w-5 text-blue-500" /> : null}
              Current Plan: {isPro ? 'Pro' : 'Free'}
            </CardTitle>
            <Badge variant={isPro ? 'default' : 'secondary'}>
              {subscription?.status || 'Free'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscription && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Next billing date</p>
                <p className="font-medium">
                  {format(subscription.currentPeriodEnd, 'MMM dd, yyyy')}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Amount</p>
                <p className="font-medium">
                  ${(subscription.amount / 100).toFixed(0)} HKD/month
                </p>
              </div>
            </div>
          )}

          {isPro && (
            <Button
              onClick={handleManageBilling}
              disabled={billingPortal.isPending}
              variant="outline"
              className="w-full"
            >
              <Settings className="h-4 w-4 mr-2" />
              {billingPortal.isPending ? 'Loading...' : 'Manage Billing'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Usage Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            Today's Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Daily Swipes</span>
                <span className="text-sm font-medium">
                  {usageLimits.currentSwipes} / {usageLimits.dailySwipes === -1 ? '∞' : usageLimits.dailySwipes}
                </span>
              </div>
              {usageLimits.dailySwipes !== -1 && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min((usageLimits.currentSwipes / usageLimits.dailySwipes) * 100, 100)}%`,
                    }}
                  />
                </div>
              )}
            </div>

            {isPro && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Super Likes</span>
                  <span className="text-sm font-medium">
                    {usageLimits.currentSuperlikes} / {usageLimits.superlikes}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min((usageLimits.currentSuperlikes / usageLimits.superlikes) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Advanced Filters</p>
                <p className="font-medium text-lg">
                  {usageLimits.canUseAdvancedFilters ? 'Available' : 'Locked'}
                </p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Early Access</p>
                <p className="font-medium text-lg">
                  {usageLimits.hasEarlyAccess ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Payments */}
      {recentPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-500" />
              Recent Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="font-medium">
                        ${(payment.amount / 100).toFixed(2)} {payment.currency}
                      </p>
                      <p className="text-sm text-gray-600">
                        {format(payment.createdAt, 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      payment.status === 'succeeded'
                        ? 'default'
                        : payment.status === 'failed'
                        ? 'destructive'
                        : 'secondary'
                    }
                  >
                    {payment.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}