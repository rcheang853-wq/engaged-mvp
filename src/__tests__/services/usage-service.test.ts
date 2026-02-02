// Mock Supabase before importing
const mockSupabase: any = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
    upsert: jest.fn(),
  })),
  rpc: jest.fn(),
};

jest.mock('@/lib/supabase/auth', () => ({
  createBrowserSupabaseClient: jest.fn(() => mockSupabase),
}));

jest.mock('@/lib/stripe', () => ({
  getDailySwipeLimit: jest.fn(isPro => (isPro ? -1 : 40)),
}));

import { UsageService } from '@/services/usage-service';

describe('UsageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTodaysUsage', () => {
    it('should return existing usage record', async () => {
      const mockUsage = {
        id: 'usage-1',
        user_id: 'user-1',
        date: '2025-09-22',
        swipes_count: 10,
        superlikes_count: 2,
        searches_count: 5,
        advanced_filters_used: 1,
        early_alerts_sent: 0,
        created_at: '2025-09-22T00:00:00Z',
      };

      const mockSelect = {
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: mockUsage }),
        })),
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockSelect),
      });

      const result = await UsageService.getTodaysUsage('user-1');

      expect(result).toEqual({
        id: 'usage-1',
        userId: 'user-1',
        date: new Date('2025-09-22'),
        swipesCount: 10,
        superlikesCount: 2,
        searchesCount: 5,
        advancedFiltersUsed: 1,
        earlyAlertsSent: 0,
        createdAt: new Date('2025-09-22T00:00:00Z'),
      });
    });

    it('should create new usage record if none exists', async () => {
      const mockNewUsage = {
        id: 'usage-2',
        user_id: 'user-1',
        date: '2025-09-22',
        swipes_count: 0,
        superlikes_count: 0,
        searches_count: 0,
        advanced_filters_used: 0,
        early_alerts_sent: 0,
        created_at: '2025-09-22T00:00:00Z',
      };

      // Mock no existing record
      const mockSelect = {
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: null }),
        })),
      };

      // Mock insert
      const mockInsert = {
        select: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: mockNewUsage }),
        })),
      };

      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue(mockSelect),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockReturnValue(mockInsert),
        });

      const result = await UsageService.getTodaysUsage('user-1');

      expect(result.swipesCount).toBe(0);
      expect(result.userId).toBe('user-1');
    });
  });

  describe('canSwipe', () => {
    it('should return true for Pro users', async () => {
      // Mock existing usage
      jest.spyOn(UsageService, 'getTodaysUsage').mockResolvedValue({
        id: 'usage-1',
        userId: 'user-1',
        date: new Date(),
        swipesCount: 50, // Above free limit
        superlikesCount: 0,
        searchesCount: 0,
        advancedFiltersUsed: 0,
        earlyAlertsSent: 0,
        createdAt: new Date(),
      });

      const result = await UsageService.canSwipe('user-1', true);
      expect(result).toBe(true);
    });

    it('should return false for free users at limit', async () => {
      jest.spyOn(UsageService, 'getTodaysUsage').mockResolvedValue({
        id: 'usage-1',
        userId: 'user-1',
        date: new Date(),
        swipesCount: 40, // At free limit
        superlikesCount: 0,
        searchesCount: 0,
        advancedFiltersUsed: 0,
        earlyAlertsSent: 0,
        createdAt: new Date(),
      });

      const result = await UsageService.canSwipe('user-1', false);
      expect(result).toBe(false);
    });

    it('should return true for free users under limit', async () => {
      jest.spyOn(UsageService, 'getTodaysUsage').mockResolvedValue({
        id: 'usage-1',
        userId: 'user-1',
        date: new Date(),
        swipesCount: 30, // Under free limit
        superlikesCount: 0,
        searchesCount: 0,
        advancedFiltersUsed: 0,
        earlyAlertsSent: 0,
        createdAt: new Date(),
      });

      const result = await UsageService.canSwipe('user-1', false);
      expect(result).toBe(true);
    });
  });

  describe('recordSwipe', () => {
    it('should record swipe for user under limit', async () => {
      // Mock user profile
      const mockProfile = { is_pro: false };
      const mockSelect = {
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: mockProfile }),
        })),
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockSelect),
        upsert: jest.fn().mockResolvedValue({ error: null }),
      });

      // Mock canSwipe to return true
      jest.spyOn(UsageService, 'canSwipe').mockResolvedValue(true);

      const result = await UsageService.recordSwipe('user-1', 'like');
      expect(result).toBe(true);
    });

    it('should not record swipe for user at limit', async () => {
      // Mock user profile
      const mockProfile = { is_pro: false };
      const mockSelect = {
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: mockProfile }),
        })),
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockSelect),
      });

      // Mock canSwipe to return false
      jest.spyOn(UsageService, 'canSwipe').mockResolvedValue(false);

      const result = await UsageService.recordSwipe('user-1', 'like');
      expect(result).toBe(false);
    });
  });

  describe('getUserUsageLimits', () => {
    it('should return Pro user limits', async () => {
      const mockProfile = { is_pro: true };
      const mockUsage = {
        id: 'usage-1',
        userId: 'user-1',
        date: new Date(),
        swipesCount: 100,
        superlikesCount: 3,
        searchesCount: 10,
        advancedFiltersUsed: 5,
        earlyAlertsSent: 2,
        createdAt: new Date(),
      };

      const mockSelect = {
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: mockProfile }),
        })),
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockSelect),
      });

      jest.spyOn(UsageService, 'getTodaysUsage').mockResolvedValue(mockUsage);

      const result = await UsageService.getUserUsageLimits('user-1');

      expect(result).toEqual({
        dailySwipes: -1, // Unlimited for Pro
        currentSwipes: 100,
        superlikes: 5,
        currentSuperlikes: 3,
        canUseAdvancedFilters: true,
        hasEarlyAccess: true,
      });
    });

    it('should return free user limits', async () => {
      const mockProfile = { is_pro: false };
      const mockUsage = {
        id: 'usage-1',
        userId: 'user-1',
        date: new Date(),
        swipesCount: 25,
        superlikesCount: 0,
        searchesCount: 3,
        advancedFiltersUsed: 0,
        earlyAlertsSent: 0,
        createdAt: new Date(),
      };

      const mockSelect = {
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: mockProfile }),
        })),
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockSelect),
      });

      jest.spyOn(UsageService, 'getTodaysUsage').mockResolvedValue(mockUsage);

      const result = await UsageService.getUserUsageLimits('user-1');

      expect(result).toEqual({
        dailySwipes: 40,
        currentSwipes: 25,
        superlikes: 0,
        currentSuperlikes: 0,
        canUseAdvancedFilters: false,
        hasEarlyAccess: false,
      });
    });
  });

  describe('hasReachedSwipeLimit', () => {
    it('should return false for Pro users', async () => {
      const mockProfile = { is_pro: true };
      const mockSelect = {
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: mockProfile }),
        })),
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockSelect),
      });

      const result = await UsageService.hasReachedSwipeLimit('user-1');
      expect(result).toBe(false);
    });

    it('should return true for free users at limit', async () => {
      const mockProfile = { is_pro: false };
      const mockUsage = {
        id: 'usage-1',
        userId: 'user-1',
        date: new Date(),
        swipesCount: 40, // At limit
        superlikesCount: 0,
        searchesCount: 0,
        advancedFiltersUsed: 0,
        earlyAlertsSent: 0,
        createdAt: new Date(),
      };

      const mockSelect = {
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: mockProfile }),
        })),
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockSelect),
      });

      jest.spyOn(UsageService, 'getTodaysUsage').mockResolvedValue(mockUsage);

      const result = await UsageService.hasReachedSwipeLimit('user-1');
      expect(result).toBe(true);
    });
  });
});
