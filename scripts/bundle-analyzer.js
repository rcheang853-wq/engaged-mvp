#!/usr/bin/env node
/**
 * Bundle Analysis Script
 * Analyzes Next.js bundle size and provides optimization recommendations
 */

const fs = require('fs');
const path = require('path');

// Bundle size thresholds (in bytes)
const THRESHOLDS = {
  TOTAL_JS: 1024 * 1024, // 1MB
  CHUNK_SIZE: 244 * 1024, // 244KB
  CSS_SIZE: 50 * 1024,    // 50KB
  VENDOR_SIZE: 500 * 1024, // 500KB
};

function analyzeBundleSize() {
  const buildDir = path.join(process.cwd(), '.next');
  const staticDir = path.join(buildDir, 'static');

  if (!fs.existsSync(buildDir)) {
    console.error('❌ Build directory not found. Run `npm run build` first.');
    process.exit(1);
  }

  console.log('📊 Analyzing bundle size...\n');

  const analysis = {
    totalJS: 0,
    totalCSS: 0,
    chunks: [],
    vendors: [],
    recommendations: [],
    passed: true,
  };

  // Analyze JavaScript chunks
  const chunksDir = path.join(staticDir, 'chunks');
  if (fs.existsSync(chunksDir)) {
    const chunks = fs.readdirSync(chunksDir)
      .filter(file => file.endsWith('.js'))
      .map(file => {
        const filePath = path.join(chunksDir, file);
        const stats = fs.statSync(filePath);
        const size = stats.size;

        analysis.totalJS += size;

        return {
          file,
          size,
          sizeKB: (size / 1024).toFixed(2),
          type: file.includes('framework') ? 'framework' :
                file.includes('vendor') ? 'vendor' :
                file.includes('pages') ? 'pages' : 'chunk',
        };
      })
      .sort((a, b) => b.size - a.size);

    analysis.chunks = chunks;

    // Identify vendor chunks
    analysis.vendors = chunks.filter(chunk =>
      chunk.type === 'vendor' || chunk.type === 'framework'
    );
  }

  // Analyze CSS files
  const cssDir = path.join(staticDir, 'css');
  if (fs.existsSync(cssDir)) {
    const cssFiles = fs.readdirSync(cssDir)
      .filter(file => file.endsWith('.css'))
      .forEach(file => {
        const filePath = path.join(cssDir, file);
        const stats = fs.statSync(filePath);
        analysis.totalCSS += stats.size;
      });
  }

  // Generate recommendations
  generateRecommendations(analysis);

  // Display results
  displayResults(analysis);

  return analysis;
}

function generateRecommendations(analysis) {
  // Check total JS size
  if (analysis.totalJS > THRESHOLDS.TOTAL_JS) {
    analysis.passed = false;
    analysis.recommendations.push({
      type: 'error',
      title: 'Total JavaScript Bundle Too Large',
      message: `Total JS size (${(analysis.totalJS / 1024 / 1024).toFixed(2)}MB) exceeds recommended limit (1MB)`,
      solutions: [
        'Implement code splitting with dynamic imports',
        'Remove unused dependencies',
        'Use tree shaking for libraries',
        'Consider lazy loading for non-critical components',
      ],
    });
  }

  // Check individual chunk sizes
  const largeChunks = analysis.chunks.filter(chunk => chunk.size > THRESHOLDS.CHUNK_SIZE);
  if (largeChunks.length > 0) {
    analysis.passed = false;
    analysis.recommendations.push({
      type: 'warning',
      title: 'Large Chunks Detected',
      message: `${largeChunks.length} chunks exceed 244KB limit`,
      chunks: largeChunks.slice(0, 5),
      solutions: [
        'Split large chunks into smaller pieces',
        'Review if all code in chunk is necessary',
        'Consider moving vendor code to separate chunks',
      ],
    });
  }

  // Check vendor bundle size
  const totalVendorSize = analysis.vendors.reduce((total, vendor) => total + vendor.size, 0);
  if (totalVendorSize > THRESHOLDS.VENDOR_SIZE) {
    analysis.recommendations.push({
      type: 'warning',
      title: 'Large Vendor Bundle',
      message: `Vendor bundles total ${(totalVendorSize / 1024).toFixed(2)}KB`,
      solutions: [
        'Audit dependencies for unnecessary libraries',
        'Use more lightweight alternatives',
        'Implement selective imports from large libraries',
      ],
    });
  }

  // Check for duplicate dependencies
  const duplicatePatterns = [
    'react', 'lodash', 'moment', 'date-fns', 'axios'
  ];

  duplicatePatterns.forEach(pattern => {
    const matches = analysis.chunks.filter(chunk =>
      chunk.file.toLowerCase().includes(pattern)
    );

    if (matches.length > 1) {
      analysis.recommendations.push({
        type: 'info',
        title: `Potential Duplicate: ${pattern}`,
        message: `Found ${matches.length} chunks containing '${pattern}'`,
        solutions: [
          'Check for multiple versions of the same library',
          'Use webpack alias to resolve to single version',
          'Review import statements for consistency',
        ],
      });
    }
  });

  // CSS recommendations
  if (analysis.totalCSS > THRESHOLDS.CSS_SIZE) {
    analysis.recommendations.push({
      type: 'info',
      title: 'Large CSS Bundle',
      message: `CSS size (${(analysis.totalCSS / 1024).toFixed(2)}KB) could be optimized`,
      solutions: [
        'Use CSS purging to remove unused styles',
        'Consider CSS-in-JS for component-scoped styles',
        'Minify and compress CSS files',
      ],
    });
  }
}

function displayResults(analysis) {
  console.log('📦 Bundle Analysis Results');
  console.log('=' .repeat(50));

  // Overall status
  const status = analysis.passed ? '✅ PASSED' : '❌ FAILED';
  const statusColor = analysis.passed ? '\x1b[32m' : '\x1b[31m';
  console.log(`${statusColor}%s\x1b[0m`, status);
  console.log();

  // Size summary
  console.log('📊 Size Summary:');
  console.log(`   Total JavaScript: ${(analysis.totalJS / 1024 / 1024).toFixed(2)}MB`);
  console.log(`   Total CSS: ${(analysis.totalCSS / 1024).toFixed(2)}KB`);
  console.log(`   Number of chunks: ${analysis.chunks.length}`);
  console.log();

  // Top 10 largest chunks
  console.log('🔍 Largest Chunks:');
  analysis.chunks.slice(0, 10).forEach((chunk, index) => {
    const sizeIndicator = chunk.size > THRESHOLDS.CHUNK_SIZE ? '⚠️ ' : '✅ ';
    console.log(`   ${index + 1}. ${sizeIndicator}${chunk.file} (${chunk.sizeKB}KB) [${chunk.type}]`);
  });
  console.log();

  // Recommendations
  if (analysis.recommendations.length > 0) {
    console.log('💡 Recommendations:');
    analysis.recommendations.forEach((rec, index) => {
      const icon = rec.type === 'error' ? '❌' : rec.type === 'warning' ? '⚠️ ' : 'ℹ️ ';
      console.log(`\n   ${icon} ${rec.title}`);
      console.log(`      ${rec.message}`);

      if (rec.chunks) {
        rec.chunks.forEach(chunk => {
          console.log(`      - ${chunk.file} (${chunk.sizeKB}KB)`);
        });
      }

      if (rec.solutions) {
        console.log('      Solutions:');
        rec.solutions.forEach(solution => {
          console.log(`      • ${solution}`);
        });
      }
    });
  } else {
    console.log('✅ No optimization recommendations at this time.');
  }

  console.log('\n' + '='.repeat(50));

  // Save detailed report
  const reportPath = path.join(process.cwd(), 'bundle-analysis.json');
  fs.writeFileSync(reportPath, JSON.stringify(analysis, null, 2));
  console.log(`📄 Detailed report saved to: ${reportPath}`);
}

// Run analysis
if (require.main === module) {
  try {
    const analysis = analyzeBundleSize();
    process.exit(analysis.passed ? 0 : 1);
  } catch (error) {
    console.error('❌ Bundle analysis failed:', error);
    process.exit(1);
  }
}