export * from './database';
export * from './scraping';
export * from './auth';

// Event related types
export interface Event {
  id: string;
  title: string;
  description?: string | null;
  shortDescription?: string | null;
  startTime: Date;
  endTime: Date;
  timezone: string;
  allDay: boolean;
  venue?: {
    id: string;
    name: string;
    address: string;
    city: string;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  customLocation?: string | null;
  organizer?: {
    id: string;
    organizationName: string;
    isVerified: boolean;
    logoUrl?: string | null;
  } | null;
  category?: {
    id: string;
    name: string;
    slug: string;
    icon?: string | null;
    color: string;
  } | null;
  posterUrl?: string | null;
  galleryUrls: string[];
  tags: string[];
  isFree: boolean;
  priceRange: number[];
  ticketUrl?: string | null;
  registrationRequired: boolean;
  capacity?: number | null;
  popularityScore: number;
  qualityScore: number;
  status: string;
  isFeatured: boolean;
  isTrending: boolean;
  sourceUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date | null;
}

export interface EventFilters {
  categories?: string[] | undefined;
  dateRange?:
    | {
        start: Date;
        end: Date;
      }
    | undefined;
  location?: string | undefined;
  search?: string | undefined;
}

// User related types
export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  preferences?: UserPreferences;
  isPro: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  categories?: string[];
  locations?: string[];
  notifications?: {
    email: boolean;
    push: boolean;
  };
  privacy?: {
    shareProfile: boolean;
    shareActivity: boolean;
  };
}

// AI Matching types
export interface SwipeAction {
  eventId: string;
  action: 'like' | 'dislike' | 'save';
  timestamp: Date;
}

export interface MatchingPreferences {
  categoryWeights: Record<string, number>;
  locationWeights: Record<string, number>;
  timePreferences: {
    weekdays: boolean;
    weekends: boolean;
    mornings: boolean;
    afternoons: boolean;
    evenings: boolean;
  };
}

// Subscription and Payment types
export interface Subscription {
  id: string;
  userId: string;
  stripeSubscriptionId: string;
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing';
  planType: 'pro' | 'premium';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  amount: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  userId: string;
  subscriptionId?: string;
  stripePaymentIntentId: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'failed' | 'pending' | 'canceled';
  createdAt: Date;
}

export interface UserUsage {
  id: string;
  userId: string;
  date: Date;
  swipesCount: number;
  superlikesCount: number;
  searchesCount: number;
  advancedFiltersUsed: number;
  earlyAlertsSent: number;
  createdAt: Date;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  stripePriceId: string;
  amount: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  limits: {
    dailySwipes: number;
    superlikes: number;
    advancedFilters: boolean;
    earlyAccess: boolean;
    prioritySupport: boolean;
  };
}

export interface UsageLimits {
  dailySwipes: number;
  currentSwipes: number;
  superlikes: number;
  currentSuperlikes: number;
  canUseAdvancedFilters: boolean;
  hasEarlyAccess: boolean;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}
