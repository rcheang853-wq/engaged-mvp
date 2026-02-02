import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import ReactQueryProvider from '@/lib/react-query';
import AuthProvider from '@/providers/auth-provider';
import { defaultSEO, generateOrganizationStructuredData, generateWebSiteStructuredData } from '@/lib/seo';
import { StructuredData } from '@/components/structured-data';
import PerformanceMonitor from '@/components/performance-monitor';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap', // Optimize font loading
  preload: true,
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap', // Optimize font loading
  preload: false, // Only preload primary font
});

export const metadata: Metadata = defaultSEO;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://api.supabase.com" />
        <link rel="dns-prefetch" href="https://api.stripe.com" />

        {/* Preload critical resources */}
        <link
          rel="preload"
          href="/_next/static/css/app/layout.css"
          as="style"
        />

        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Theme color for mobile browsers */}
        <meta name="theme-color" content="#3b82f6" />
        <meta name="color-scheme" content="light" />

        {/* Apple Touch Icon */}
        <link rel="apple-touch-icon" href="/icon-192x192.png" />

        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />

        {/* Structured Data */}
        <StructuredData data={generateOrganizationStructuredData()} />
        <StructuredData data={generateWebSiteStructuredData()} />

        {/* Performance monitoring script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Early performance monitoring
              window.performanceMarks = {
                navigationStart: performance.now(),
                loadStart: Date.now()
              };

              // Track First Paint
              if ('PerformanceObserver' in window) {
                const observer = new PerformanceObserver((list) => {
                  list.getEntries().forEach((entry) => {
                    if (entry.name === 'first-paint') {
                      window.performanceMarks.firstPaint = entry.startTime;
                    }
                    if (entry.name === 'first-contentful-paint') {
                      window.performanceMarks.firstContentfulPaint = entry.startTime;
                    }
                  });
                });
                observer.observe({ entryTypes: ['paint'] });
              }
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ReactQueryProvider>
          <AuthProvider>
            {children}
            <PerformanceMonitor />
          </AuthProvider>
        </ReactQueryProvider>

      </body>
    </html>
  );
}
