// Mock modules before importing
const mockStripe = {
  customers: {
    create: jest.fn(),
  },
  checkout: {
    sessions: {
      create: jest.fn(),
    },
  },
  billingPortal: {
    sessions: {
      create: jest.fn(),
    },
  },
  invoices: {
    retrieve: jest.fn(),
  },
};

const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        order: jest.fn(() => ({
          limit: jest.fn(() => ({
            single: jest.fn(),
          })),
        })),
      })),
    })),
    insert: jest.fn(),
    update: jest.fn(() => ({
      eq: jest.fn(),
    })),
  })),
};

jest.mock('@/lib/stripe', () => ({
  stripe: mockStripe,
  SUBSCRIPTION_PLANS: {
    PRO: {
      stripePriceId: 'price_test_123',
    },
  },
}));

jest.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}));

import { SubscriptionService } from '@/services/subscription-service';

describe('SubscriptionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCustomer', () => {
    it('should create a Stripe customer and update user profile', async () => {
      const mockCustomer = { id: 'cus_test_123' };

      mockStripe.customers.create.mockResolvedValue(mockCustomer);

      const mockUpdate = {
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue(mockUpdate),
      });

      const result = await SubscriptionService.createCustomer(
        'user-1',
        'test@example.com',
        'Test User'
      );

      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test User',
        metadata: {
          userId: 'user-1',
        },
      });

      expect(result).toBe('cus_test_123');
    });

    it('should handle Stripe errors', async () => {
      mockStripe.customers.create.mockRejectedValue(
        new Error('Stripe error')
      );

      await expect(
        SubscriptionService.createCustomer('user-1', 'test@example.com')
      ).rejects.toThrow('Failed to create customer');
    });
  });

  describe('getOrCreateCustomer', () => {
    it('should return existing customer ID', async () => {
      const mockProfile = {
        stripe_customer_id: 'cus_existing_123',
        email: 'test@example.com',
        full_name: 'Test User',
      };

      const mockSelect = {
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: mockProfile }),
        })),
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockSelect),
      });

      const result = await SubscriptionService.getOrCreateCustomer('user-1');
      expect(result).toBe('cus_existing_123');
    });

    it('should create new customer if none exists', async () => {
      const mockProfile = {
        stripe_customer_id: null,
        email: 'test@example.com',
        full_name: 'Test User',
      };

      const mockSelect = {
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: mockProfile }),
        })),
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockSelect),
      });

      jest.spyOn(SubscriptionService, 'createCustomer').mockResolvedValue('cus_new_123');

      const result = await SubscriptionService.getOrCreateCustomer('user-1');
      expect(result).toBe('cus_new_123');
      expect(SubscriptionService.createCustomer).toHaveBeenCalledWith(
        'user-1',
        'test@example.com',
        'Test User'
      );
    });
  });

  describe('createCheckoutSession', () => {
    it('should create a checkout session', async () => {
      const mockSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/...',
      };

      jest.spyOn(SubscriptionService, 'getOrCreateCustomer').mockResolvedValue('cus_test_123');
      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession);

      const result = await SubscriptionService.createCheckoutSession(
        'user-1',
        'https://example.com/success',
        'https://example.com/cancel'
      );

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_test_123',
        payment_method_types: ['card'],
        line_items: [
          {
            price: 'price_test_123',
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
        metadata: {
          userId: 'user-1',
        },
        subscription_data: {
          metadata: {
            userId: 'user-1',
          },
        },
      });

      expect(result).toBe(mockSession);
    });
  });

  describe('handleSubscriptionCreated', () => {
    it('should create subscription record and update user profile', async () => {
      const mockSubscription = {
        id: 'sub_test_123',
        status: 'active',
        current_period_start: 1640995200, // 2022-01-01 00:00:00 UTC
        current_period_end: 1643673600, // 2022-02-01 00:00:00 UTC
        cancel_at_period_end: false,
        currency: 'hkd',
        items: {
          data: [
            {
              price: {
                unit_amount: 3800,
              },
            },
          ],
        },
        metadata: {
          userId: 'user-1',
        },
      };

      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      const mockUpdate = {
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      mockSupabase.from
        .mockReturnValueOnce({
          insert: mockInsert,
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue(mockUpdate),
        });

      await SubscriptionService.handleSubscriptionCreated(mockSubscription as any);

      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'user-1',
        stripe_subscription_id: 'sub_test_123',
        status: 'active',
        plan_type: 'pro',
        current_period_start: '2022-01-01T00:00:00.000Z',
        current_period_end: '2022-02-01T00:00:00.000Z',
        cancel_at_period_end: false,
        amount: 3800,
        currency: 'hkd',
      });
    });

    it('should throw error if userId is missing', async () => {
      const mockSubscription = {
        id: 'sub_test_123',
        metadata: {},
      };

      await expect(
        SubscriptionService.handleSubscriptionCreated(mockSubscription as any)
      ).rejects.toThrow('User ID not found in subscription metadata');
    });
  });

  describe('getUserSubscription', () => {
    it('should return user subscription', async () => {
      const mockSubscription = {
        id: 'sub_db_123',
        user_id: 'user-1',
        stripe_subscription_id: 'sub_stripe_123',
        status: 'active',
        plan_type: 'pro',
        current_period_start: '2022-01-01T00:00:00Z',
        current_period_end: '2022-02-01T00:00:00Z',
        cancel_at_period_end: false,
        amount: 3800,
        currency: 'HKD',
        created_at: '2022-01-01T00:00:00Z',
        updated_at: '2022-01-01T00:00:00Z',
      };

      const mockSelect = {
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({ data: mockSubscription }),
            })),
          })),
        })),
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockSelect),
      });

      const result = await SubscriptionService.getUserSubscription('user-1');

      expect(result).toEqual({
        id: 'sub_db_123',
        userId: 'user-1',
        stripeSubscriptionId: 'sub_stripe_123',
        status: 'active',
        planType: 'pro',
        currentPeriodStart: new Date('2022-01-01T00:00:00Z'),
        currentPeriodEnd: new Date('2022-02-01T00:00:00Z'),
        cancelAtPeriodEnd: false,
        amount: 3800,
        currency: 'HKD',
        createdAt: new Date('2022-01-01T00:00:00Z'),
        updatedAt: new Date('2022-01-01T00:00:00Z'),
      });
    });

    it('should return null if no subscription found', async () => {
      const mockSelect = {
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({ data: null }),
            })),
          })),
        })),
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockSelect),
      });

      const result = await SubscriptionService.getUserSubscription('user-1');
      expect(result).toBeNull();
    });
  });
});