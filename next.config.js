/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Repo relocated into a larger workspace folder that also contains another lockfile.
  // Pin Next's tracing/workspace root to this repo to avoid dev/build warnings.
  outputFileTracingRoot: __dirname,
  turbopack: {
    root: __dirname,
  },
  experimental: {
    optimizePackageImports: [
      '@tanstack/react-query',
      '@tanstack/react-query-devtools',
      'date-fns',
      'zustand',
      'framer-motion',
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-slot',
      'react-big-calendar',
      'class-variance-authority',
      'clsx',
      'tailwind-merge',
    ],
  },
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? { exclude: ['error', 'warn'] }
        : false,
  },
  webpack: (config, { dev, isServer }) => {
    const webpackConfig = config;

    if (!dev && !isServer) {
      webpackConfig.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20000,
        maxSize: 200000,
        cacheGroups: {
          reactFramework: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: 'react-framework',
            chunks: 'all',
            priority: 50,
            enforce: true,
            maxSize: 150000,
          },
          nextFramework: {
            test: /[\\/]node_modules[\\/]next[\\/]/,
            name: 'next-framework',
            chunks: 'all',
            priority: 45,
            enforce: true,
            maxSize: 150000,
          },
          reactQuery: {
            test: /[\\/]node_modules[\\/](@tanstack\/react-query)[\\/]/,
            name: 'react-query',
            chunks: 'all',
            priority: 30,
            enforce: true,
            maxSize: 150000,
          },
          ui: {
            test: /[\\/]node_modules[\\/](@radix-ui|framer-motion|lucide-react)[\\/]/,
            name: 'ui-libraries',
            chunks: 'all',
            priority: 30,
            enforce: true,
            maxSize: 150000,
          },
          calendar: {
            test: /[\\/]node_modules[\\/](react-big-calendar|date-fns)[\\/]/,
            name: 'calendar-libs',
            chunks: 'all',
            priority: 25,
            enforce: true,
            maxSize: 150000,
          },
          auth: {
            test: /[\\/]node_modules[\\/](@supabase)[\\/]/,
            name: 'supabase',
            chunks: 'all',
            priority: 25,
            enforce: true,
            maxSize: 150000,
          },
          stripe: {
            test: /[\\/]node_modules[\\/](@stripe|stripe)[\\/]/,
            name: 'stripe',
            chunks: 'all',
            priority: 25,
            enforce: true,
            maxSize: 100000,
          },
          forms: {
            test: /[\\/]node_modules[\\/](react-hook-form|@hookform)[\\/]/,
            name: 'forms',
            chunks: 'all',
            priority: 25,
            enforce: true,
            maxSize: 100000,
          },
          utils: {
            test: /[\\/]node_modules[\\/](zod|clsx|tailwind-merge|class-variance-authority)[\\/]/,
            name: 'utils',
            chunks: 'all',
            priority: 20,
            enforce: true,
            maxSize: 100000,
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name(module) {
              const packageName = module.context.match(
                /[\\/]node_modules[\\/](.*?)([\\/]|$)/
              )?.[1];
              return `vendor-${packageName?.replace('@', '')}`;
            },
            chunks: 'all',
            priority: 10,
            minChunks: 1,
            maxSize: 100000,
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 5,
            enforce: true,
            maxSize: 100000,
          },
        },
      };

      webpackConfig.optimization.usedExports = true;
      webpackConfig.optimization.sideEffects = false;
      webpackConfig.optimization.moduleIds = 'deterministic';

      webpackConfig.resolve = webpackConfig.resolve || {};
      webpackConfig.resolve.alias = {
        ...webpackConfig.resolve.alias,
        'date-fns': 'date-fns',
        lodash: 'lodash-es',
      };
    }

    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('@next/bundle-analyzer')();
      webpackConfig.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
          reportFilename: isServer
            ? 'server-bundle-analysis.html'
            : 'client-bundle-analysis.html',
        })
      );
    }

    return webpackConfig;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/assets/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }],
      },
    ];
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
};

// Keep master CJS format; wrap with Sentry when installed.
let withSentryConfig;
try {
  ({ withSentryConfig } = require('@sentry/nextjs'));
} catch {
  withSentryConfig = null;
}

module.exports = withSentryConfig
  ? withSentryConfig(nextConfig, {
      silent: true,
      disableSourceMapUpload: true,
    })
  : nextConfig;
