module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000',
        'http://localhost:3000/discover',
        'http://localhost:3000/calendar',
        'http://localhost:3000/ai-match',
        'http://localhost:3000/auth/signin',
      ],
      startServerCommand: 'npm run start',
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--no-sandbox --disable-dev-shm-usage',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.85 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],

        // Core Web Vitals
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'first-input-delay': ['error', { maxNumericValue: 100 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],

        // Other important metrics
        'first-contentful-paint': ['warn', { maxNumericValue: 1800 }],
        'speed-index': ['warn', { maxNumericValue: 3400 }],
        'time-to-interactive': ['warn', { maxNumericValue: 3800 }],

        // Resource usage
        'total-byte-weight': ['warn', { maxNumericValue: 1000000 }], // 1MB
        'unused-javascript': ['warn', { maxNumericValue: 300000 }], // 300KB
        'unused-css-rules': ['warn', { maxNumericValue: 100000 }], // 100KB

        // SEO
        'meta-description': 'error',
        'document-title': 'error',
        'crawlable-anchors': 'error',
        'robots-txt': 'error',
        'canonical': 'error',

        // Accessibility
        'color-contrast': 'error',
        'image-alt': 'error',
        'label': 'error',
        'link-name': 'error',

        // Best Practices
        'uses-https': 'error',
        'no-vulnerable-libraries': 'error',
        'is-on-https': 'error',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};