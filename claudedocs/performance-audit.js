// Performance Audit Script for Engaged App
// This script runs comprehensive Lighthouse audits on all key pages

const { chromium } = require('playwright');
const lighthouse = require('lighthouse');
const { launch } = require('chrome-launcher');
const fs = require('fs').promises;
const path = require('path');

const pages = [
  { name: 'Home', url: 'http://localhost:3000/' },
  { name: 'Discover', url: 'http://localhost:3000/discover' },
  { name: 'Calendar', url: 'http://localhost:3000/calendar' },
  { name: 'Sign In', url: 'http://localhost:3000/auth/signin' }
];

async function runLighthouseAudit(url, pageName) {
  console.log(`Running Lighthouse audit for ${pageName}...`);

  const chrome = await launch({
    chromeFlags: ['--headless', '--no-sandbox', '--disable-dev-shm-usage']
  });

  try {
    const options = {
      logLevel: 'info',
      output: 'json',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      port: chrome.port,
    };

    const runnerResult = await lighthouse(url, options);

    // Extract key metrics
    const lhr = runnerResult.lhr;
    const scores = {
      performance: Math.round(lhr.categories.performance.score * 100),
      accessibility: Math.round(lhr.categories.accessibility.score * 100),
      bestPractices: Math.round(lhr.categories['best-practices'].score * 100),
      seo: Math.round(lhr.categories.seo.score * 100)
    };

    // Core Web Vitals
    const metrics = lhr.audits;
    const coreWebVitals = {
      LCP: metrics['largest-contentful-paint']?.numericValue || 0,
      FID: metrics['max-potential-fid']?.numericValue || 0,
      CLS: metrics['cumulative-layout-shift']?.numericValue || 0,
      FCP: metrics['first-contentful-paint']?.numericValue || 0,
      TTI: metrics['interactive']?.numericValue || 0,
      TBT: metrics['total-blocking-time']?.numericValue || 0
    };

    // Performance opportunities
    const opportunities = Object.keys(metrics)
      .filter(key => metrics[key].details?.type === 'opportunity' && metrics[key].numericValue > 0)
      .map(key => ({
        id: key,
        title: metrics[key].title,
        description: metrics[key].description,
        savings: metrics[key].numericValue,
        displayValue: metrics[key].displayValue
      }))
      .sort((a, b) => b.savings - a.savings);

    // Diagnostics
    const diagnostics = Object.keys(metrics)
      .filter(key => metrics[key].details?.type === 'debugdata' ||
                     (metrics[key].score !== null && metrics[key].score < 0.9))
      .map(key => ({
        id: key,
        title: metrics[key].title,
        description: metrics[key].description,
        score: metrics[key].score,
        displayValue: metrics[key].displayValue
      }));

    return {
      url,
      pageName,
      scores,
      coreWebVitals,
      opportunities,
      diagnostics,
      timestamp: new Date().toISOString()
    };

  } finally {
    await chrome.kill();
  }
}

async function checkPageAvailability(url) {
  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const response = await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 10000
    });

    const isAvailable = response.status() < 400;
    await browser.close();

    return isAvailable;
  } catch (error) {
    return false;
  }
}

async function runFullAudit() {
  console.log('Starting comprehensive performance audit...\n');

  const results = [];

  for (const page of pages) {
    try {
      // Check if page is available first
      const isAvailable = await checkPageAvailability(page.url);

      if (!isAvailable) {
        console.log(`⚠️  ${page.name} page not accessible - skipping audit`);
        results.push({
          ...page,
          error: 'Page not accessible',
          timestamp: new Date().toISOString()
        });
        continue;
      }

      const result = await runLighthouseAudit(page.url, page.name);
      results.push(result);

      console.log(`✅ ${page.name} audit completed`);
      console.log(`   Performance: ${result.scores.performance}/100`);
      console.log(`   LCP: ${(result.coreWebVitals.LCP / 1000).toFixed(2)}s`);
      console.log(`   CLS: ${result.coreWebVitals.CLS.toFixed(3)}\n`);

    } catch (error) {
      console.error(`❌ Error auditing ${page.name}:`, error.message);
      results.push({
        ...page,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Save detailed results
  const outputDir = path.join(__dirname, 'performance-results');
  await fs.mkdir(outputDir, { recursive: true });

  await fs.writeFile(
    path.join(outputDir, `audit-${Date.now()}.json`),
    JSON.stringify(results, null, 2)
  );

  // Generate summary report
  generateSummaryReport(results);

  return results;
}

function generateSummaryReport(results) {
  console.log('\n' + '='.repeat(60));
  console.log('PERFORMANCE AUDIT SUMMARY');
  console.log('='.repeat(60));

  const validResults = results.filter(r => !r.error);

  if (validResults.length === 0) {
    console.log('❌ No pages could be audited successfully');
    return;
  }

  // Overall scores
  console.log('\nLIGHTHOUSE SCORES:');
  validResults.forEach(result => {
    console.log(`\n${result.pageName}:`);
    console.log(`  Performance: ${result.scores.performance}/100`);
    console.log(`  Accessibility: ${result.scores.accessibility}/100`);
    console.log(`  Best Practices: ${result.scores.bestPractices}/100`);
    console.log(`  SEO: ${result.scores.seo}/100`);
  });

  // Core Web Vitals
  console.log('\nCORE WEB VITALS:');
  validResults.forEach(result => {
    const cwv = result.coreWebVitals;
    console.log(`\n${result.pageName}:`);
    console.log(`  LCP: ${(cwv.LCP / 1000).toFixed(2)}s ${cwv.LCP > 2500 ? '❌' : cwv.LCP > 1200 ? '⚠️' : '✅'}`);
    console.log(`  FID: ${cwv.FID.toFixed(0)}ms ${cwv.FID > 100 ? '❌' : cwv.FID > 40 ? '⚠️' : '✅'}`);
    console.log(`  CLS: ${cwv.CLS.toFixed(3)} ${cwv.CLS > 0.1 ? '❌' : cwv.CLS > 0.05 ? '⚠️' : '✅'}`);
    console.log(`  FCP: ${(cwv.FCP / 1000).toFixed(2)}s`);
    console.log(`  TTI: ${(cwv.TTI / 1000).toFixed(2)}s`);
  });

  // Top opportunities
  console.log('\nTOP OPTIMIZATION OPPORTUNITIES:');
  const allOpportunities = validResults
    .flatMap(r => r.opportunities.map(o => ({ ...o, page: r.pageName })))
    .sort((a, b) => b.savings - a.savings)
    .slice(0, 10);

  allOpportunities.forEach((opp, index) => {
    console.log(`\n${index + 1}. ${opp.title} (${opp.page})`);
    console.log(`   Potential savings: ${(opp.savings / 1000).toFixed(2)}s`);
    console.log(`   ${opp.description}`);
  });

  // Target compliance
  console.log('\nTARGET COMPLIANCE:');
  const targets = {
    performance: 90,
    lcp: 2.5,
    fid: 100,
    cls: 0.1
  };

  validResults.forEach(result => {
    const cwv = result.coreWebVitals;
    const perfMet = result.scores.performance >= targets.performance;
    const lcpMet = (cwv.LCP / 1000) <= targets.lcp;
    const fidMet = cwv.FID <= targets.fid;
    const clsMet = cwv.CLS <= targets.cls;

    console.log(`\n${result.pageName}:`);
    console.log(`  Performance Score >90: ${perfMet ? '✅' : '❌'} (${result.scores.performance}/100)`);
    console.log(`  LCP <2.5s: ${lcpMet ? '✅' : '❌'} (${(cwv.LCP / 1000).toFixed(2)}s)`);
    console.log(`  FID <100ms: ${fidMet ? '✅' : '❌'} (${cwv.FID.toFixed(0)}ms)`);
    console.log(`  CLS <0.1: ${clsMet ? '✅' : '❌'} (${cwv.CLS.toFixed(3)})`);
  });

  console.log('\n' + '='.repeat(60));
}

// Run the audit
if (require.main === module) {
  runFullAudit().catch(console.error);
}

module.exports = { runFullAudit, runLighthouseAudit };