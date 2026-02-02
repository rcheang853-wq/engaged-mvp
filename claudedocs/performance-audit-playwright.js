// Performance Audit Script using Playwright
const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

const pages = [
  { name: 'Home', url: 'http://localhost:3000/' },
  { name: 'Discover', url: 'http://localhost:3000/discover' },
  { name: 'Calendar', url: 'http://localhost:3000/calendar' },
  { name: 'Sign In', url: 'http://localhost:3000/auth/signin' }
];

async function measurePagePerformance(page, url, pageName) {
  console.log(`Measuring performance for ${pageName}...`);

  // Navigate to page and wait for it to load
  const response = await page.goto(url, {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  if (!response.ok()) {
    throw new Error(`Page ${pageName} returned ${response.status()}: ${response.statusText()}`);
  }

  // Wait a bit more for dynamic content
  await page.waitForTimeout(2000);

  // Measure Core Web Vitals and other performance metrics
  const metrics = await page.evaluate(() => {
    return new Promise((resolve) => {
      // Core Web Vitals
      const observer = new PerformanceObserver((list) => {
        // This is a simplified version - in a real audit we'd use the web-vitals library
      });

      // Get performance timing data
      const navigation = performance.getEntriesByType('navigation')[0];
      const paint = performance.getEntriesByType('paint');

      const results = {
        // Navigation timing
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,

        // Paint timing
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,

        // Resource counts
        resourceCount: performance.getEntriesByType('resource').length,

        // Memory (if available)
        usedJSHeapSize: performance.memory?.usedJSHeapSize || 0,
        totalJSHeapSize: performance.memory?.totalJSHeapSize || 0,

        // Transfer sizes
        totalTransferSize: performance.getEntriesByType('resource')
          .reduce((total, resource) => total + (resource.transferSize || 0), 0),

        // Response timing
        responseTime: navigation.responseEnd - navigation.responseStart,

        // DOM nodes count
        domNodes: document.querySelectorAll('*').length,

        // Images count
        images: document.querySelectorAll('img').length,

        // Scripts count
        scripts: document.querySelectorAll('script').length,

        // Stylesheets count
        stylesheets: document.querySelectorAll('link[rel="stylesheet"]').length
      };

      resolve(results);
    });
  });

  // Network analysis
  const resourceRequests = [];
  page.on('response', response => {
    resourceRequests.push({
      url: response.url(),
      status: response.status(),
      size: 0, // We'll get this from headers if available
      type: response.request().resourceType()
    });
  });

  // Take screenshot for visual analysis
  const screenshotPath = path.join(__dirname, 'performance-results', `${pageName.toLowerCase()}-screenshot.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  // Analyze bundle sizes by checking script tags
  const bundleAnalysis = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    return scripts.map(script => ({
      src: script.src,
      async: script.async,
      defer: script.defer
    }));
  });

  // Check for accessibility issues (basic)
  const accessibilityIssues = await page.evaluate(() => {
    const issues = [];

    // Check for images without alt text
    const imagesWithoutAlt = document.querySelectorAll('img:not([alt])');
    if (imagesWithoutAlt.length > 0) {
      issues.push(`${imagesWithoutAlt.length} images without alt text`);
    }

    // Check for buttons without accessible names
    const buttonsWithoutNames = document.querySelectorAll('button:not([aria-label]):not([title])');
    const buttonsWithoutText = Array.from(buttonsWithoutNames).filter(btn => !btn.textContent.trim());
    if (buttonsWithoutText.length > 0) {
      issues.push(`${buttonsWithoutText.length} buttons without accessible names`);
    }

    // Check for form inputs without labels
    const inputsWithoutLabels = document.querySelectorAll('input:not([aria-label]):not([title])');
    const orphanedInputs = Array.from(inputsWithoutLabels).filter(input => {
      const id = input.id;
      return !id || !document.querySelector(`label[for="${id}"]`);
    });
    if (orphanedInputs.length > 0) {
      issues.push(`${orphanedInputs.length} form inputs without labels`);
    }

    return issues;
  });

  // SEO analysis
  const seoAnalysis = await page.evaluate(() => {
    const head = document.head;
    const body = document.body;

    return {
      title: document.title,
      titleLength: document.title.length,
      description: head.querySelector('meta[name="description"]')?.content || '',
      descriptionLength: head.querySelector('meta[name="description"]')?.content?.length || 0,
      h1Count: body.querySelectorAll('h1').length,
      hasViewport: !!head.querySelector('meta[name="viewport"]'),
      hasLangAttribute: !!document.documentElement.getAttribute('lang'),
      canonical: head.querySelector('link[rel="canonical"]')?.href || '',
      ogTags: Array.from(head.querySelectorAll('meta[property^="og:"]')).map(tag => ({
        property: tag.property,
        content: tag.content
      })),
      twitterTags: Array.from(head.querySelectorAll('meta[name^="twitter:"]')).map(tag => ({
        name: tag.name,
        content: tag.content
      }))
    };
  });

  return {
    url,
    pageName,
    status: response.status(),
    metrics,
    bundleAnalysis,
    accessibilityIssues,
    seoAnalysis,
    resourceRequests: resourceRequests.slice(0, 20), // Limit to avoid huge data
    timestamp: new Date().toISOString()
  };
}

async function runPerformanceAudit() {
  console.log('Starting performance audit with Playwright...\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });

  const results = [];

  try {
    // Create results directory
    const outputDir = path.join(__dirname, 'performance-results');
    await fs.mkdir(outputDir, { recursive: true });

    for (const pageConfig of pages) {
      const page = await browser.newPage();

      try {
        const result = await measurePagePerformance(page, pageConfig.url, pageConfig.name);
        results.push(result);

        console.log(`✅ ${pageConfig.name} analysis completed`);
        console.log(`   Status: ${result.status}`);
        console.log(`   FCP: ${result.metrics.firstContentfulPaint.toFixed(0)}ms`);
        console.log(`   Resources: ${result.metrics.resourceCount}`);
        console.log(`   DOM nodes: ${result.metrics.domNodes}`);
        console.log(`   Transfer size: ${(result.metrics.totalTransferSize / 1024).toFixed(0)}KB\n`);

      } catch (error) {
        console.error(`❌ Error analyzing ${pageConfig.name}:`, error.message);
        results.push({
          ...pageConfig,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      } finally {
        await page.close();
      }
    }

    // Save detailed results
    await fs.writeFile(
      path.join(outputDir, `audit-${Date.now()}.json`),
      JSON.stringify(results, null, 2)
    );

    generateDetailedReport(results);

  } finally {
    await browser.close();
  }

  return results;
}

function generateDetailedReport(results) {
  console.log('\n' + '='.repeat(80));
  console.log('DETAILED PERFORMANCE ANALYSIS REPORT');
  console.log('='.repeat(80));

  const validResults = results.filter(r => !r.error);

  if (validResults.length === 0) {
    console.log('❌ No pages could be analyzed successfully');
    return;
  }

  validResults.forEach(result => {
    console.log(`\n${'='.repeat(40)}`);
    console.log(`${result.pageName.toUpperCase()} PAGE ANALYSIS`);
    console.log(`${'='.repeat(40)}`);

    // Performance Metrics
    console.log('\n📊 PERFORMANCE METRICS:');
    console.log(`   First Paint: ${result.metrics.firstPaint.toFixed(0)}ms`);
    console.log(`   First Contentful Paint: ${result.metrics.firstContentfulPaint.toFixed(0)}ms`);
    console.log(`   DOM Content Loaded: ${result.metrics.domContentLoaded.toFixed(0)}ms`);
    console.log(`   Load Complete: ${result.metrics.loadComplete.toFixed(0)}ms`);
    console.log(`   Response Time: ${result.metrics.responseTime.toFixed(0)}ms`);

    // Resource Analysis
    console.log('\n📦 RESOURCE ANALYSIS:');
    console.log(`   Total Resources: ${result.metrics.resourceCount}`);
    console.log(`   Images: ${result.metrics.images}`);
    console.log(`   Scripts: ${result.metrics.scripts}`);
    console.log(`   Stylesheets: ${result.metrics.stylesheets}`);
    console.log(`   Total Transfer Size: ${(result.metrics.totalTransferSize / 1024).toFixed(0)}KB`);
    console.log(`   DOM Nodes: ${result.metrics.domNodes}`);

    // Memory Usage
    if (result.metrics.usedJSHeapSize > 0) {
      console.log('\n🧠 MEMORY USAGE:');
      console.log(`   Used JS Heap: ${(result.metrics.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB`);
      console.log(`   Total JS Heap: ${(result.metrics.totalJSHeapSize / 1024 / 1024).toFixed(1)}MB`);
    }

    // Bundle Analysis
    if (result.bundleAnalysis.length > 0) {
      console.log('\n📝 BUNDLE ANALYSIS:');
      result.bundleAnalysis.forEach((script, index) => {
        if (index < 10) { // Limit output
          const filename = script.src.split('/').pop();
          console.log(`   ${filename} ${script.async ? '(async)' : ''}${script.defer ? '(defer)' : ''}`);
        }
      });
      if (result.bundleAnalysis.length > 10) {
        console.log(`   ... and ${result.bundleAnalysis.length - 10} more scripts`);
      }
    }

    // SEO Analysis
    console.log('\n🔍 SEO ANALYSIS:');
    console.log(`   Title: "${result.seoAnalysis.title}" (${result.seoAnalysis.titleLength} chars)`);
    console.log(`   Description: ${result.seoAnalysis.descriptionLength > 0 ? `${result.seoAnalysis.descriptionLength} chars` : 'Missing'}`);
    console.log(`   H1 tags: ${result.seoAnalysis.h1Count}`);
    console.log(`   Viewport meta: ${result.seoAnalysis.hasViewport ? 'Present' : 'Missing'}`);
    console.log(`   Lang attribute: ${result.seoAnalysis.hasLangAttribute ? 'Present' : 'Missing'}`);
    console.log(`   OpenGraph tags: ${result.seoAnalysis.ogTags.length}`);
    console.log(`   Twitter tags: ${result.seoAnalysis.twitterTags.length}`);

    // Accessibility Issues
    if (result.accessibilityIssues.length > 0) {
      console.log('\n♿ ACCESSIBILITY ISSUES:');
      result.accessibilityIssues.forEach(issue => {
        console.log(`   ⚠️  ${issue}`);
      });
    } else {
      console.log('\n♿ ACCESSIBILITY: No major issues detected');
    }
  });

  // Performance Summary
  console.log(`\n${'='.repeat(40)}`);
  console.log('PERFORMANCE TARGETS ANALYSIS');
  console.log(`${'='.repeat(40)}`);

  validResults.forEach(result => {
    const fcp = result.metrics.firstContentfulPaint;
    const transferSize = result.metrics.totalTransferSize / 1024; // KB
    const domNodes = result.metrics.domNodes;

    console.log(`\n${result.pageName}:`);
    console.log(`  FCP: ${fcp.toFixed(0)}ms ${fcp > 1800 ? '❌ Needs improvement' : fcp > 1000 ? '⚠️  Could be better' : '✅ Good'}`);
    console.log(`  Bundle Size: ${transferSize.toFixed(0)}KB ${transferSize > 1000 ? '❌ Too large' : transferSize > 500 ? '⚠️  Large' : '✅ Reasonable'}`);
    console.log(`  DOM Complexity: ${domNodes} nodes ${domNodes > 1500 ? '❌ Too complex' : domNodes > 800 ? '⚠️  Complex' : '✅ Simple'}`);
  });

  console.log('\n' + '='.repeat(80));
}

// Run the audit
if (require.main === module) {
  runPerformanceAudit().catch(console.error);
}

module.exports = { runPerformanceAudit };