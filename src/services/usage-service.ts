import { createBrowserSupabaseClient } from '@/lib/supabase/auth';

const supabase = createBrowserSupabaseClient();
import { getDailySwipeLimit } from '@/lib/subscription-config';
import { UserUsage, UsageLimits } from '@/types';

export class UsageService {
  // Get or create today's usage record for a user
  static async getTodaysUsage(userId: string): Promise<UserUsage> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    try {
      // Try to get existing record
      const { data: usage } = await supabase
        .from('user_usage')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .single();

      if (usage) {
        return {
          id: usage.id,
          userId: usage.user_id,
          date: new Date(usage.date),
          swipesCount: usage.swipes_count,
          superlikesCount: usage.superlikes_count,
          searchesCount: usage.searches_count,
          advancedFiltersUsed: usage.advanced_filters_used,
          earlyAlertsSent: usage.early_alerts_sent,
          createdAt: new Date(usage.created_at),
        };
      }

      // Create new record for today
      const { data: newUsage } = await supabase
        .from('user_usage')
        .insert({
          user_id: userId,
          date: today,
          swipes_count: 0,
          superlikes_count: 0,
          searches_count: 0,
          advanced_filters_used: 0,
          early_alerts_sent: 0,
        })
        .select()
        .single();

      if (!newUsage) {
        throw new Error('Failed to create usage record');
      }

      return {
        id: newUsage.id,
        userId: newUsage.user_id,
        date: new Date(newUsage.date),
        swipesCount: newUsage.swipes_count,
        superlikesCount: newUsage.superlikes_count,
        searchesCount: newUsage.searches_count,
        advancedFiltersUsed: newUsage.advanced_filters_used,
        earlyAlertsSent: newUsage.early_alerts_sent,
        createdAt: new Date(newUsage.created_at),
      };
    } catch (error) {
      console.error('Error getting today\'s usage:', error);
      throw new Error('Failed to get usage data');
    }
  }

  // Check if user can perform a swipe action
  static async canSwipe(userId: string, isPro: boolean): Promise<boolean> {
    if (isPro) {
      return true; // Pro users have unlimited swipes
    }

    const usage = await this.getTodaysUsage(userId);
    const dailyLimit = getDailySwipeLimit(isPro);

    return usage.swipesCount < dailyLimit;
  }

  // Record a swipe action
  static async recordSwipe(userId: string, swipeType: 'like' | 'pass' | 'superlike'): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];

    try {
      // Get user profile to check Pro status
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_pro')
        .eq('id', userId)
        .single();

      if (!profile) {
        throw new Error('User profile not found');
      }

      // Check if user can swipe
      const canPerformSwipe = await this.canSwipe(userId, profile.is_pro);
      if (!canPerformSwipe) {
        return false; // Limit exceeded
      }

      // Update usage count
      const incrementField = swipeType === 'superlike' ? 'superlikes_count' : 'swipes_count';

      const { error } = await supabase
        .from('user_usage')
        .upsert({
          user_id: userId,
          date: today,
          [incrementField]: supabase.rpc('increment_usage_count', {
            user_id: userId,
            usage_date: today,
            field_name: incrementField,
          }),
        }, {
          onConflict: 'user_id,date',
        });

      if (error) {
        console.error('Error recording swipe:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error recording swipe:', error);
      return false;
    }
  }

  // Record advanced filter usage
  static async recordAdvancedFilterUsage(userId: string): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];

    try {
      const { error } = await supabase
        .from('user_usage')
        .upsert({
          user_id: userId,
          date: today,
          advanced_filters_used: supabase.rpc('increment_usage_count', {
            user_id: userId,
            usage_date: today,
            field_name: 'advanced_filters_used',
          }),
        }, {
          onConflict: 'user_id,date',
        });

      return !error;
    } catch (error) {
      console.error('Error recording advanced filter usage:', error);
      return false;
    }
  }

  // Get user's current usage limits and status
  static async getUserUsageLimits(userId: string): Promise<UsageLimits> {
    try {
      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_pro')
        .eq('id', userId)
        .single();

      if (!profile) {
        throw new Error('User profile not found');
      }

      const isPro = profile.is_pro;
      const usage = await this.getTodaysUsage(userId);
      const dailySwipeLimit = getDailySwipeLimit(isPro);

      return {
        dailySwipes: dailySwipeLimit,
        currentSwipes: usage.swipesCount,
        superlikes: isPro ? 5 : 0,
        currentSuperlikes: usage.superlikesCount,
        canUseAdvancedFilters: isPro,
        hasEarlyAccess: isPro,
      };
    } catch (error) {
      console.error('Error getting usage limits:', error);
      // Return free tier defaults on error
      return {
        dailySwipes: 40,
        currentSwipes: 0,
        superlikes: 0,
        currentSuperlikes: 0,
        canUseAdvancedFilters: false,
        hasEarlyAccess: false,
      };
    }
  }

  // Check if user has reached their daily swipe limit
  static async hasReachedSwipeLimit(userId: string): Promise<boolean> {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_pro')
        .eq('id', userId)
        .single();

      if (!profile) {
        return true; // Err on the side of caution
      }

      if (profile.is_pro) {
        return false; // Pro users have unlimited swipes
      }

      const usage = await this.getTodaysUsage(userId);
      const dailyLimit = getDailySwipeLimit(false);

      return usage.swipesCount >= dailyLimit;
    } catch (error) {
      console.error('Error checking swipe limit:', error);
      return true; // Err on the side of caution
    }
  }

  // Get usage analytics for a date range
  static async getUserUsageAnalytics(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<UserUsage[]> {
    try {
      const { data: usageData } = await supabase
        .from('user_usage')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      return (usageData || []).map(usage => ({
        id: usage.id,
        userId: usage.user_id,
        date: new Date(usage.date),
        swipesCount: usage.swipes_count,
        superlikesCount: usage.superlikes_count,
        searchesCount: usage.searches_count,
        advancedFiltersUsed: usage.advanced_filters_used,
        earlyAlertsSent: usage.early_alerts_sent,
        createdAt: new Date(usage.created_at),
      }));
    } catch (error) {
      console.error('Error getting usage analytics:', error);
      return [];
    }
  }
}

// Database function to increment usage counts (needs to be created in Supabase)
// This is the SQL for the function:
/*
CREATE OR REPLACE FUNCTION increment_usage_count(
  user_id uuid,
  usage_date date,
  field_name text
) RETURNS integer AS $$
DECLARE
  current_count integer := 0;
BEGIN
  -- Get current count or create record if it doesn't exist
  INSERT INTO user_usage (user_id, date, swipes_count, superlikes_count, searches_count, advanced_filters_used, early_alerts_sent)
  VALUES (user_id, usage_date, 0, 0, 0, 0, 0)
  ON CONFLICT (user_id, date) DO NOTHING;

  -- Increment the specified field
  CASE field_name
    WHEN 'swipes_count' THEN
      UPDATE user_usage SET swipes_count = swipes_count + 1
      WHERE user_usage.user_id = increment_usage_count.user_id AND date = usage_date
      RETURNING swipes_count INTO current_count;
    WHEN 'superlikes_count' THEN
      UPDATE user_usage SET superlikes_count = superlikes_count + 1
      WHERE user_usage.user_id = increment_usage_count.user_id AND date = usage_date
      RETURNING superlikes_count INTO current_count;
    WHEN 'searches_count' THEN
      UPDATE user_usage SET searches_count = searches_count + 1
      WHERE user_usage.user_id = increment_usage_count.user_id AND date = usage_date
      RETURNING searches_count INTO current_count;
    WHEN 'advanced_filters_used' THEN
      UPDATE user_usage SET advanced_filters_used = advanced_filters_used + 1
      WHERE user_usage.user_id = increment_usage_count.user_id AND date = usage_date
      RETURNING advanced_filters_used INTO current_count;
    WHEN 'early_alerts_sent' THEN
      UPDATE user_usage SET early_alerts_sent = early_alerts_sent + 1
      WHERE user_usage.user_id = increment_usage_count.user_id AND date = usage_date
      RETURNING early_alerts_sent INTO current_count;
  END CASE;

  RETURN current_count;
END;
$$ LANGUAGE plpgsql;
*/