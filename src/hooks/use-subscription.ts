import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { Subscription, UsageLimits, Payment } from '@/types';
import { getStripe } from '@/lib/stripe';

interface SubscriptionStatus {
  subscription: Subscription | null;
  usageLimits: UsageLimits;
  recentPayments: Payment[];
}

// Hook to get subscription status
export function useSubscription() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async (): Promise<SubscriptionStatus | null> => {
      if (!user?.id) return null;

      const response = await fetch(`/api/subscription/status?userId=${user.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch subscription status');
      }

      return response.json();
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook to create checkout session
export function useCreateCheckoutSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      successUrl,
      cancelUrl,
    }: {
      userId: string;
      successUrl: string;
      cancelUrl: string;
    }) => {
      const response = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          successUrl,
          cancelUrl,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout session');
      }

      return response.json();
    },
    onSuccess: async (data) => {
      // Redirect to Stripe checkout
      const stripe = await getStripe();
      if (!stripe) {
        throw new Error('Stripe failed to initialize');
      }

      const { error } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (error) {
        throw new Error(error.message);
      }
    },
    onSettled: () => {
      // Refetch subscription data after checkout attempt
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });
}

// Hook to create billing portal session
export function useBillingPortal() {
  return useMutation({
    mutationFn: async ({
      userId,
      returnUrl,
    }: {
      userId: string;
      returnUrl: string;
    }) => {
      const response = await fetch('/api/subscription/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          returnUrl,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create billing portal session');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Redirect to billing portal
      window.location.href = data.url;
    },
  });
}

// Hook to get usage limits
export function useUsageLimits() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['usage-limits', user?.id],
    queryFn: async (): Promise<UsageLimits | null> => {
      if (!user?.id) return null;

      const response = await fetch(`/api/usage/swipe?userId=${user.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch usage limits');
      }

      const data = await response.json();
      return data.usageLimits;
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000, // 1 minute
  });
}

// Hook to record swipe action
export function useSwipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      swipeType,
    }: {
      userId: string;
      swipeType: 'like' | 'pass' | 'superlike';
    }) => {
      const response = await fetch('/api/usage/swipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          swipeType,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to record swipe');
      }

      return response.json();
    },
    onSuccess: () => {
      // Refetch usage limits
      queryClient.invalidateQueries({ queryKey: ['usage-limits'] });
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });
}