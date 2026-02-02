import { Metadata } from 'next';

// Base URL for production (update with your actual domain)
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://engaged-app.com';

// Default SEO configuration
export const defaultSEO: Metadata = {
  title: {
    default: 'Engaged - Personal Calendar',
    template: '%s | Engaged',
  },
  description:
    'A simple, private calendar to create, manage, and share events.',
  keywords: [
    'events',
    'calendar',
    'scheduling',
    'event planning',
  ],
  authors: [{ name: 'Engaged Team' }],
  creator: 'Engaged Team',
  publisher: 'Engaged',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(BASE_URL),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: BASE_URL,
    siteName: 'Engaged',
    title: 'Engaged - Personal Calendar',
    description: 'A simple, private calendar to create, manage, and share events.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Engaged - Discover Local Events',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Engaged - Personal Calendar',
    description: 'A simple, private calendar to create, manage, and share events.',
    images: ['/og-image.jpg'],
    creator: '@engaged_app',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    yandex: process.env.YANDEX_VERIFICATION,
    yahoo: process.env.YAHOO_VERIFICATION,
  },
  other: {
    'theme-color': '#3b82f6',
    'color-scheme': 'light',
    'msapplication-TileColor': '#3b82f6',
  },
};

// Page-specific SEO generators
export function generatePageSEO(page: {
  title: string;
  description: string;
  path: string;
  image?: string;
  keywords?: string[];
}): Metadata {
  return {
    title: page.title,
    description: page.description,
    keywords: page.keywords || defaultSEO.keywords,
    alternates: {
      canonical: page.path,
    },
    openGraph: {
      title: page.title,
      description: page.description,
      url: `${BASE_URL}${page.path}`,
      images: page.image ? [page.image] : defaultSEO.openGraph?.images,
    },
    twitter: {
      title: page.title,
      description: page.description,
      images: page.image ? [page.image] : ['/og-image.jpg'],
    },
  };
}

// Event-specific SEO generator
export function generateEventSEO(event: {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  venue: string;
  address: string;
  image?: string;
  organizer: string;
  price?: string;
}): Metadata {
  const eventDate = new Date(event.startDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return {
    title: `${event.title} - ${eventDate}`,
    description: `${event.description.substring(0, 150)}... Join us at ${event.venue} on ${eventDate}.`,
    keywords: [
      'event',
      event.title,
      event.venue,
      'Macau',
      'Hong Kong',
      'Greater Bay Area',
    ],
    openGraph: {
      title: event.title,
      description: event.description,
      type: 'article',
      article: {
        publishedTime: event.startDate,
        authors: [event.organizer],
      },
      images: event.image ? [{ url: event.image, width: 1200, height: 630 }] : undefined,
    },
    twitter: {
      title: event.title,
      description: event.description,
      images: event.image ? [event.image] : undefined,
    },
  };
}

// Structured data generators
export function generateEventStructuredData(event: {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  venue: string;
  address: string;
  image?: string;
  organizer: string;
  price?: string;
  url?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.description,
    startDate: event.startDate,
    endDate: event.endDate,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: event.venue,
      address: {
        '@type': 'PostalAddress',
        streetAddress: event.address,
        addressLocality: 'Macau',
        addressCountry: 'MO',
      },
    },
    organizer: {
      '@type': 'Organization',
      name: event.organizer,
    },
    ...(event.image && {
      image: [event.image],
    }),
    ...(event.price && {
      offers: {
        '@type': 'Offer',
        price: event.price,
        priceCurrency: 'MOP',
        availability: 'https://schema.org/InStock',
        url: event.url || BASE_URL,
      },
    }),
  };
}

export function generateOrganizationStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Engaged',
    url: BASE_URL,
    logo: `${BASE_URL}/logo.png`,
    description: 'A simple calendar for personal events.',
    sameAs: [
      // Add social media URLs here
      'https://twitter.com/engaged_app',
      'https://facebook.com/engaged_app',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: 'support@engaged-app.com',
    },
  };
}

export function generateWebSiteStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Engaged',
    url: BASE_URL,
    description: defaultSEO.description,
  };
}

// Breadcrumb structured data
export function generateBreadcrumbStructuredData(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${BASE_URL}${item.url}`,
    })),
  };
}

// Sitemap generation helper
export function generateSitemapUrls() {
  const staticPages = [
    { url: '/', changefreq: 'daily', priority: 1.0 },
    { url: '/calendar', changefreq: 'daily', priority: 0.8 },
    { url: '/auth/signin', changefreq: 'monthly', priority: 0.5 },
    { url: '/auth/signup', changefreq: 'monthly', priority: 0.5 },
    { url: '/auth/reset-password', changefreq: 'monthly', priority: 0.3 },
  ];

  return staticPages.map(page => ({
    url: `${BASE_URL}${page.url}`,
    lastModified: new Date().toISOString(),
    changeFrequency: page.changefreq,
    priority: page.priority,
  }));
}
