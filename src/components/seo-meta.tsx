'use client';

import Head from 'next/head';
import { usePathname } from 'next/navigation';

interface SEOMetaProps {
  title?: string;
  description?: string;
  image?: string;
  keywords?: string[];
  type?: 'website' | 'article' | 'event';
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  noIndex?: boolean;
}

const DEFAULT_TITLE = 'Engaged - Discover Local Events';
const DEFAULT_DESCRIPTION = 'Discover and save local events in Macau, Hong Kong, and the Greater Bay Area with AI-powered event matching.';
const DEFAULT_IMAGE = '/og-image.jpg';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://engaged-app.com';

export default function SEOMeta({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  keywords = [],
  type = 'website',
  publishedTime,
  modifiedTime,
  author,
  noIndex = false,
}: SEOMetaProps) {
  const pathname = usePathname();
  const fullTitle = title ? `${title} | Engaged` : DEFAULT_TITLE;
  const canonicalUrl = `${BASE_URL}${pathname}`;
  const imageUrl = image.startsWith('http') ? image : `${BASE_URL}${image}`;

  const allKeywords = [
    'events',
    'Macau',
    'Hong Kong',
    'Greater Bay Area',
    'calendar',
    'discovery',
    'AI matching',
    ...keywords,
  ];

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={allKeywords.join(', ')} />
      <meta name="author" content={author || 'Engaged Team'} />

      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />

      {/* Robots */}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="Engaged" />
      <meta property="og:locale" content="en_US" />

      {/* Article specific */}
      {type === 'article' && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {type === 'article' && modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}
      {type === 'article' && author && (
        <meta property="article:author" content={author} />
      )}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:site" content="@engaged_app" />
      <meta name="twitter:creator" content="@engaged_app" />

      {/* Additional SEO */}
      <meta name="format-detection" content="telephone=no" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="Engaged" />

      {/* Structured Data for Events */}
      {type === 'event' && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Event',
              name: title,
              description: description,
              image: imageUrl,
              url: canonicalUrl,
              ...(publishedTime && { startDate: publishedTime }),
              organizer: {
                '@type': 'Organization',
                name: 'Engaged',
                url: BASE_URL,
              },
            }),
          }}
        />
      )}
    </Head>
  );
}