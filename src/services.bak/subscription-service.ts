import { stripe, SUBSCRIPTION_PLANS } from '@/lib/stripe';
import { createBrowserSupabaseClient } from '@/lib/supabase/auth';

const supabase = createBrowserSupabaseClient();
import { Subscription, Payment, UserUsage } from '@/types';
import Stripe from 'stripe';

export class SubscriptionService {
  // Create a Stripe customer for a user
  static async createCustomer(userId: string, email: string, name?: string): Promise<string> {
    try {
      const customer = await stripe.customers.create({
        email,
        name,
        metadata: {
          userId,
        },
      });

      // Update user profile with Stripe customer ID
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customer.id })
        .eq('id', userId);

      return customer.id;
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw new Error('Failed to create customer');
    }
  }

  // Get or create Stripe customer for user
  static async getOrCreateCustomer(userId: string): Promise<string> {
    // Check if user already has a Stripe customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email, full_name')
      .eq('id', userId)
      .single();

    if (!profile) {
      throw new Error('User profile not found');
    }

    if (profile.stripe_customer_id) {
      return profile.stripe_customer_id;
    }

    // Create new customer
    return await this.createCustomer(userId, profile.email, profile.full_name || undefined);
  }

  // Create a checkout session for Pro subscription
  static async createCheckoutSession(
    userId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<Stripe.Checkout.Session> {
    try {
      const customerId = await this.getOrCreateCustomer(userId);

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: SUBSCRIPTION_PLANS.PRO.stripePriceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId,
        },
        subscription_data: {
          metadata: {
            userId,
          },
        },
      });

      return session;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw new Error('Failed to create checkout session');
    }
  }

  // Create a billing portal session
  static async createBillingPortalSession(
    userId: string,
    returnUrl: string
  ): Promise<Stripe.BillingPortal.Session> {
    try {
      const customerId = await this.getOrCreateCustomer(userId);

      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      return session;
    } catch (error) {
      console.error('Error creating billing portal session:', error);
      throw new Error('Failed to create billing portal session');
    }
  }

  // Handle successful subscription creation
  static async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata.userId;
    if (!userId) {
      throw new Error('User ID not found in subscription metadata');
    }

    try {
      // Create subscription record
      await supabase.from('subscriptions').insert({
        user_id: userId,
        stripe_subscription_id: subscription.id,
        status: subscription.status,
        plan_type: 'pro',
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        amount: subscription.items.data[0]?.price?.unit_amount || 0,
        currency: subscription.currency,
      });

      // Update user profile
      await supabase
        .from('profiles')
        .update({
          is_pro: true,
          pro_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
        })
        .eq('id', userId);
    } catch (error) {
      console.error('Error handling subscription created:', error);
      throw error;
    }
  }

  // Handle subscription updates
  static async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    try {
      const isPro = subscription.status === 'active';

      // Update subscription record
      await supabase
        .from('subscriptions')
        .update({
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
        })
        .eq('stripe_subscription_id', subscription.id);

      // Update user profile
      await supabase
        .from('profiles')
        .update({
          is_pro: isPro,
          pro_expires_at: isPro
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null,
        })
        .eq('stripe_customer_id', subscription.customer as string);
    } catch (error) {
      console.error('Error handling subscription updated:', error);
      throw error;
    }
  }

  // Handle subscription deletion/cancellation
  static async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    try {
      // Update subscription record
      await supabase
        .from('subscriptions')
        .update({
          status: 'canceled',
        })
        .eq('stripe_subscription_id', subscription.id);

      // Update user profile
      await supabase
        .from('profiles')
        .update({
          is_pro: false,
          pro_expires_at: null,
        })
        .eq('stripe_customer_id', subscription.customer as string);
    } catch (error) {
      console.error('Error handling subscription deleted:', error);
      throw error;
    }
  }

  // Handle successful payment
  static async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const userId = paymentIntent.metadata.userId;
    if (!userId) {
      console.warn('User ID not found in payment intent metadata');
      return;
    }

    try {
      // Get subscription if this is a subscription payment
      let subscriptionId = null;
      if (paymentIntent.invoice) {
        const invoice = await stripe.invoices.retrieve(paymentIntent.invoice as string);
        if (invoice.subscription) {
          const { data: subscription } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('stripe_subscription_id', invoice.subscription)
            .single();
          subscriptionId = subscription?.id || null;
        }
      }

      // Create payment record
      await supabase.from('payments').insert({
        user_id: userId,
        subscription_id: subscriptionId,
        stripe_payment_intent_id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
      });
    } catch (error) {
      console.error('Error handling payment succeeded:', error);
      throw error;
    }
  }

  // Get user's current subscription
  static async getUserSubscription(userId: string): Promise<Subscription | null> {
    try {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!subscription) {
        return null;
      }

      return {
        id: subscription.id,
        userId: subscription.user_id,
        stripeSubscriptionId: subscription.stripe_subscription_id,
        status: subscription.status as any,
        planType: subscription.plan_type as any,
        currentPeriodStart: new Date(subscription.current_period_start),
        currentPeriodEnd: new Date(subscription.current_period_end),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        amount: subscription.amount,
        currency: subscription.currency,
        createdAt: new Date(subscription.created_at),
        updatedAt: new Date(subscription.updated_at),
      };
    } catch (error) {
      console.error('Error getting user subscription:', error);
      return null;
    }
  }

  // Get user's payment history
  static async getUserPayments(userId: string, limit = 10): Promise<Payment[]> {
    try {
      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      return (payments || []).map(payment => ({
        id: payment.id,
        userId: payment.user_id,
        subscriptionId: payment.subscription_id,
        stripePaymentIntentId: payment.stripe_payment_intent_id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status as any,
        createdAt: new Date(payment.created_at),
      }));
    } catch (error) {
      console.error('Error getting user payments:', error);
      return [];
    }
  }
}