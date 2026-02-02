# Performance Optimization Plan - Engaged App

## Executive Summary

Based on the comprehensive performance audit conducted on the Engaged App, this report identifies key optimization opportunities to achieve the target performance metrics:

- **Lighthouse Performance Score: >90**
- **Core Web Vitals: LCP <2.5s, FID <100ms, CLS <0.1**
- **SEO and Accessibility Improvements**

## Current Performance Baseline

### Lighthouse Scores (Estimated from Playwright Analysis)
| Page | FCP | Bundle Size | DOM Nodes | Status |
|------|-----|-------------|-----------|---------|
| Home | 204ms ✅ | 994KB ⚠️ | 91 ✅ | Good |
| Discover | 1052ms ⚠️ | 1033KB ❌ | 185 ✅ | Needs Work |
| Calendar | 548ms ✅ | 1331KB ❌ | 87 ✅ | Bundle Issue |
| Sign In | 248ms ✅ | 1218KB ❌ | 112 ✅ | Bundle Issue |

### Key Issues Identified
1. **Bundle Size**: All pages exceed 1MB (target: <500KB)
2. **Code Splitting**: Limited page-specific optimization
3. **SEO**: Missing meta descriptions on some pages
4. **Accessibility**: Minor form labeling issues
5. **Development Build**: Performance measured on dev build (actual production will be better)

## Priority 1: Critical Performance Fixes

### 1.1 Bundle Size Optimization
**Target: Reduce bundle size by 50-70%**

**Issues:**
- Large React Query bundle loading on all pages
- Heavyweight dependencies loaded unconditionally
- Missing lazy loading for non-critical components

**Solutions:**
```typescript
// 1. Conditional React Query loading
// Move ReactQueryDevtools to development only
const ReactQueryDevtools = dynamic(
  () => import('@tanstack/react-query-devtools').then(mod => ({ default: mod.ReactQueryDevtools })),
  { ssr: false }
);

// 2. Code splitting for heavy libraries
const BigCalendar = dynamic(() => import('react-big-calendar'), {
  loading: () => <CalendarSkeleton />,
  ssr: false
});

// 3. Optimize package imports
import { format } from 'date-fns/format';
import { parseISO } from 'date-fns/parseISO';
// Instead of: import { format, parseISO } from 'date-fns';
```

### 1.2 Next.js Configuration Enhancements
**Optimize bundling and loading strategies**

```typescript
// next.config.ts additions
const nextConfig: NextConfig = {
  // ... existing config

  // Enhanced experimental features
  experimental: {
    optimizePackageImports: [
      '@tanstack/react-query',
      'date-fns',
      'zustand',
      'framer-motion',
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu'
    ],
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            enforce: true,
          },
        },
      };
    }

    return config;
  },

  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};
```

### 1.3 Font Optimization
**Improve font loading performance**

```typescript
// Optimized font loading with preload
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap', // Add font-display: swap
  preload: true,
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
  preload: false, // Only preload primary font
});
```

## Priority 2: Core Web Vitals Optimization

### 2.1 Largest Contentful Paint (LCP) Optimization
**Target: <2.5s on all pages**

**Current Issues:**
- Discover page: 1052ms (needs improvement)
- Heavy JavaScript bundles blocking render

**Solutions:**
1. **Resource Hints and Preloading**
```typescript
// In layout.tsx or page components
export function generateMetadata(): Metadata {
  return {
    // ... existing metadata
    other: {
      // Preload critical resources
      'preload-font': '/fonts/geist-sans.woff2',
      'preconnect': 'https://api.supabase.com',
    },
  };
}
```

2. **Component Lazy Loading**
```typescript
// Lazy load heavy components
const EventCard = dynamic(() => import('@/components/event-card'), {
  loading: () => <EventSkeleton />,
});

const CalendarView = dynamic(() => import('@/components/calendar-view'), {
  loading: () => <CalendarSkeleton />,
  ssr: false, // Client-side only for interactive components
});
```

### 2.2 Cumulative Layout Shift (CLS) Optimization
**Target: <0.1**

**Solutions:**
1. **Skeleton Components**
```typescript
// Add skeleton loaders to prevent layout shifts
export function EventCardSkeleton() {
  return (
    <div className="animate-pulse bg-gray-200 rounded-lg">
      <div className="h-48 bg-gray-300 rounded-t-lg"></div>
      <div className="p-4 space-y-2">
        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
        <div className="h-3 bg-gray-300 rounded w-1/2"></div>
      </div>
    </div>
  );
}
```

2. **Fixed Dimensions**
```css
/* Prevent layout shifts with fixed aspect ratios */
.event-card-image {
  aspect-ratio: 16/9;
  width: 100%;
  height: auto;
}

.calendar-container {
  min-height: 600px; /* Reserve space */
}
```

### 2.3 First Input Delay (FID) Optimization
**Target: <100ms**

**Solutions:**
1. **Reduce JavaScript Execution Time**
```typescript
// Use React.memo for expensive components
export const EventList = React.memo(({ events }: EventListProps) => {
  return (
    <div className="space-y-4">
      {events.map(event => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
});

// Optimize re-renders with useMemo
const filteredEvents = useMemo(() => {
  return events.filter(event =>
    event.title.toLowerCase().includes(searchTerm.toLowerCase())
  );
}, [events, searchTerm]);
```

2. **Web Workers for Heavy Computations**
```typescript
// Move filtering and sorting to web worker
export function useEventFiltering(events: Event[], filters: FilterOptions) {
  return useQuery({
    queryKey: ['filtered-events', events, filters],
    queryFn: () => {
      // Use web worker for complex filtering
      return filterEventsInWorker(events, filters);
    },
    staleTime: 5 * 60 * 1000,
  });
}
```

## Priority 3: SEO and Metadata Optimization

### 3.1 Missing Meta Descriptions
**Fix SEO issues identified in audit**

```typescript
// Add page-specific metadata
// src/app/discover/page.tsx
export const metadata: Metadata = {
  title: 'Discover Events - Engaged',
  description: 'Discover amazing local events in Macau, Hong Kong, and the Greater Bay Area. AI-powered event matching for your perfect experience.',
  openGraph: {
    title: 'Discover Events - Engaged',
    description: 'Find events that match your interests with our AI-powered discovery platform.',
    images: ['/og-discover.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Discover Events - Engaged',
    description: 'Find events that match your interests with our AI-powered discovery platform.',
  },
};

// src/app/calendar/page.tsx
export const metadata: Metadata = {
  title: 'My Calendar - Engaged',
  description: 'Manage your saved events and personal calendar. Sync with Google Calendar and Apple Calendar.',
  openGraph: {
    title: 'My Calendar - Engaged',
    description: 'Keep track of your events in one place.',
  },
};

// src/app/auth/signin/page.tsx
export const metadata: Metadata = {
  title: 'Sign In - Engaged',
  description: 'Sign in to your Engaged account to save events and get personalized recommendations.',
};
```

### 3.2 Structured Data
**Add JSON-LD for better search engine understanding**

```typescript
// Add structured data for events
export function EventStructuredData({ event }: { event: Event }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": event.title,
    "description": event.description,
    "startDate": event.startDate,
    "endDate": event.endDate,
    "location": {
      "@type": "Place",
      "name": event.venue,
      "address": event.address,
    },
    "organizer": {
      "@type": "Organization",
      "name": event.organizer,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
```

## Priority 4: Image and Asset Optimization

### 4.1 Image Optimization Strategy
**Implement responsive images and lazy loading**

```typescript
// Optimized image component
import Image from 'next/image';

export function OptimizedEventImage({ src, alt, className }: ImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={800}
      height={450}
      className={className}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      priority={false} // Use priority={true} for above-the-fold images
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyrurhzWG4iCJQmfcadbMRWv2SnabfSZ4y6uRNdwCqSVlHFP0/H4sNhT67R5IQiN1aLMBxBY9yw7nH9/9k="
    />
  );
}
```

### 4.2 Asset Preloading
**Strategic resource preloading**

```typescript
// In layout.tsx
export default function RootLayout({ children }: LayoutProps) {
  return (
    <html lang="en">
      <head>
        {/* Preload critical resources */}
        <link
          rel="preload"
          href="/fonts/geist-sans.woff2"
          as="font"
          type="font/woff2"
          crossOrigin=""
        />
        <link rel="preconnect" href="https://api.supabase.com" />
        <link rel="dns-prefetch" href="https://api.stripe.com" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
```

## Priority 5: Accessibility Improvements

### 5.1 Form Accessibility
**Fix form labeling issues identified in audit**

```typescript
// Fix input labeling in sign-in form
export function SignInForm() {
  return (
    <form>
      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="sr-only">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="Email address"
            aria-label="Email address"
          />
        </div>
        <div>
          <label htmlFor="password" className="sr-only">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="Password"
            aria-label="Password"
          />
        </div>
        <button
          type="submit"
          aria-label="Sign in to your account"
        >
          Sign In
        </button>
      </div>
    </form>
  );
}
```

## Implementation Timeline

### Phase 1: Quick Wins (Week 1)
- [x] Fix missing Supabase server configuration
- [ ] Add conditional ReactQueryDevtools loading
- [ ] Optimize font loading with display: swap
- [ ] Add missing meta descriptions
- [ ] Fix form accessibility issues

### Phase 2: Bundle Optimization (Week 2)
- [ ] Implement code splitting for heavy components
- [ ] Optimize package imports
- [ ] Add dynamic imports for calendar components
- [ ] Configure webpack optimizations

### Phase 3: Core Web Vitals (Week 3)
- [ ] Add skeleton components
- [ ] Implement image optimization
- [ ] Add resource preloading
- [ ] Optimize JavaScript execution

### Phase 4: Advanced Optimizations (Week 4)
- [ ] Add structured data
- [ ] Implement web workers
- [ ] Set up performance monitoring
- [ ] Create performance budget

## Performance Monitoring

### 4.1 Lighthouse CI Integration
```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on:
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npm install -g @lhci/cli
      - run: lhci autorun
```

### 4.2 Performance Budget
```json
// lighthouse-budget.json
{
  "resourceSizes": [
    {
      "resourceType": "script",
      "budget": 400
    },
    {
      "resourceType": "total",
      "budget": 1000
    }
  ],
  "resourceCounts": [
    {
      "resourceType": "third-party",
      "budget": 5
    }
  ]
}
```

## Expected Results

After implementing all optimizations:

### Target Metrics
- **Lighthouse Performance**: >90 (currently ~75-80 estimated)
- **LCP**: <2.5s (currently 0.2-1.0s, should improve to <1.5s)
- **FID**: <100ms (likely already meeting this)
- **CLS**: <0.1 (need to measure after skeleton implementation)
- **Bundle Size**: <500KB (currently 1MB+)

### Business Impact
- **15-25% improvement** in page load speed
- **Better SEO rankings** from improved Core Web Vitals
- **Enhanced user experience** with faster interactions
- **Reduced bounce rate** from faster loading pages
- **Better accessibility** compliance

## Next Steps

1. **Immediate**: Implement Phase 1 quick wins
2. **Short-term**: Execute bundle optimization strategy
3. **Medium-term**: Implement comprehensive performance monitoring
4. **Long-term**: Establish performance culture with automated testing

This optimization plan provides a systematic approach to achieving the target performance metrics while maintaining code quality and user experience.