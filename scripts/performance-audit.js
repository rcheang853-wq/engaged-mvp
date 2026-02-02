#!/usr/bin/env node
/**
 * Performance Audit Script
 * Runs Lighthouse audit and analyzes bundle size
 */

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');
const path = require('path');

// Configuration
const AUDIT_CONFIG = {
  urls: [
    'http://localhost:3000',
    'http://localhost:3000/discover',
    'http://localhost:3000/calendar',
    'http://localhost:3000/ai-match',
  ],
  outputPath: './performance-reports',
  thresholds: {
    performance: 85,
    accessibility: 95,
    'best-practices': 90,
    seo: 90,
    // Core Web Vitals
    'largest-contentful-paint': 2500,
    'first-input-delay': 100,
    'cumulative-layout-shift': 0.1,
    'first-contentful-paint': 1800,
    'speed-index': 3400,
    'time-to-interactive': 3800,
  },
};

async function runLighthouseAudit(url, chrome) {
  const options = {
    logLevel: 'info',
    output: 'html',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    port: chrome.port,
    settings: {
      formFactor: 'desktop',
      throttling: {
        rttMs: 40,
        throughputKbps: 10240,
        cpuSlowdownMultiplier: 1,
        requestLatencyMs: 0,
        downloadThroughputKbps: 0,
        uploadThroughputKbps: 0,
      },
      screenEmulation: {
        mobile: false,
        width: 1350,
        height: 940,
        deviceScaleFactor: 1,
        disabled: false,
      },
    },
  };

  console.log(`Running Lighthouse audit for: ${url}`);
  const runnerResult = await lighthouse(url, options);

  return runnerResult;
}

function analyzeResults(results) {
  const analysis = {
    passed: true,
    issues: [],
    recommendations: [],
    scores: {},
  };

  results.forEach(result => {
    const { lhr, url } = result;

    // Check category scores
    Object.entries(lhr.categories).forEach(([category, data]) => {
      const score = data.score * 100;
      const threshold = AUDIT_CONFIG.thresholds[category];

      analysis.scores[`${url}_${category}`] = score;

      if (score < threshold) {
        analysis.passed = false;
        analysis.issues.push({
          url,
          category,
          score,
          threshold,
          message: `${category} score (${score.toFixed(1)}) below threshold (${threshold})`,
        });
      }
    });

    // Check Core Web Vitals
    const audits = lhr.audits;
    const webVitals = [
      'largest-contentful-paint',
      'first-input-delay',
      'cumulative-layout-shift',
      'first-contentful-paint',
      'speed-index',
      'time-to-interactive',
    ];

    webVitals.forEach(metric => {
      if (audits[metric]) {
        const value = audits[metric].numericValue;
        const threshold = AUDIT_CONFIG.thresholds[metric];

        if (value > threshold) {
          analysis.passed = false;
          analysis.issues.push({
            url,
            metric,
            value,
            threshold,
            message: `${metric} (${value.toFixed(1)}ms) exceeds threshold (${threshold}ms)`,
          });
        }
      }
    });

    // Generate recommendations
    Object.values(audits).forEach(audit => {
      if (audit.score !== null && audit.score < 0.9 && audit.details?.items?.length > 0) {
        analysis.recommendations.push({
          url,
          audit: audit.id,
          title: audit.title,
          description: audit.description,
          score: audit.score,
          items: audit.details.items.slice(0, 3), // Top 3 items
        });
      }
    });
  });

  return analysis;
}

function generateReport(analysis, results) {
  const reportPath = path.join(AUDIT_CONFIG.outputPath, 'performance-analysis.json');
  const htmlReportPath = path.join(AUDIT_CONFIG.outputPath, 'performance-summary.html');

  // Ensure output directory exists
  if (!fs.existsSync(AUDIT_CONFIG.outputPath)) {
    fs.mkdirSync(AUDIT_CONFIG.outputPath, { recursive: true });
  }

  // Save JSON analysis
  fs.writeFileSync(reportPath, JSON.stringify(analysis, null, 2));

  // Generate HTML summary
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Performance Audit Summary</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .status { font-size: 24px; font-weight: bold; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .section { margin: 20px 0; }
        .issue, .recommendation { background: #f8f9fa; margin: 10px 0; padding: 15px; border-radius: 8px; }
        .issue.error { border-left: 4px solid #dc3545; }
        .recommendation { border-left: 4px solid #ffc107; }
        .scores { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .score-card { background: white; border: 1px solid #dee2e6; padding: 15px; border-radius: 8px; text-align: center; }
        .score { font-size: 32px; font-weight: bold; }
        .score.good { color: #28a745; }
        .score.needs-improvement { color: #ffc107; }
        .score.poor { color: #dc3545; }
    </style>
</head>
<body>
    <div class="header">
        <div class="status ${analysis.passed ? 'passed' : 'failed'}">
            Performance Audit: ${analysis.passed ? 'PASSED' : 'FAILED'}
        </div>
        <p>Generated on: ${new Date().toISOString()}</p>
    </div>

    <div class="section">
        <h2>Scores Overview</h2>
        <div class="scores">
            ${Object.entries(analysis.scores).map(([key, score]) => {
              const [url, category] = key.split('_');
              const scoreClass = score >= 90 ? 'good' : score >= 50 ? 'needs-improvement' : 'poor';
              return `
                <div class="score-card">
                    <div class="score ${scoreClass}">${score.toFixed(1)}</div>
                    <div>${category}</div>
                    <div style="font-size: 12px; color: #6c757d;">${url}</div>
                </div>
              `;
            }).join('')}
        </div>
    </div>

    ${analysis.issues.length > 0 ? `
    <div class="section">
        <h2>Issues Found (${analysis.issues.length})</h2>
        ${analysis.issues.map(issue => `
            <div class="issue error">
                <strong>${issue.url}</strong><br>
                ${issue.message}
            </div>
        `).join('')}
    </div>
    ` : ''}

    ${analysis.recommendations.length > 0 ? `
    <div class="section">
        <h2>Recommendations (${analysis.recommendations.length})</h2>
        ${analysis.recommendations.slice(0, 10).map(rec => `
            <div class="recommendation">
                <strong>${rec.title}</strong> (Score: ${(rec.score * 100).toFixed(1)})<br>
                <em>${rec.url}</em><br>
                ${rec.description}
            </div>
        `).join('')}
    </div>
    ` : ''}
</body>
</html>
  `;

  fs.writeFileSync(htmlReportPath, htmlContent);

  // Save individual Lighthouse reports
  results.forEach((result, index) => {
    const url = new URL(result.url);
    const filename = `lighthouse-${url.pathname.replace(/\//g, '_') || 'home'}.html`;
    const filePath = path.join(AUDIT_CONFIG.outputPath, filename);
    fs.writeFileSync(filePath, result.report);
  });

  console.log('\n📊 Performance Audit Complete!');
  console.log(`📁 Reports saved to: ${AUDIT_CONFIG.outputPath}`);
  console.log(`📈 Summary: ${htmlReportPath}`);
  console.log(`📋 Analysis: ${reportPath}`);
}

async function runPerformanceAudit() {
  console.log('🚀 Starting Performance Audit...');

  // Launch Chrome
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  console.log(`Chrome launched on port ${chrome.port}`);

  try {
    const results = [];

    // Run audits for each URL
    for (const url of AUDIT_CONFIG.urls) {
      const result = await runLighthouseAudit(url, chrome);
      results.push({
        url,
        lhr: result.lhr,
        report: result.report,
      });
    }

    // Analyze results
    const analysis = analyzeResults(results);

    // Generate reports
    generateReport(analysis, results);

    // Exit with appropriate code
    process.exit(analysis.passed ? 0 : 1);

  } catch (error) {
    console.error('❌ Audit failed:', error);
    process.exit(1);
  } finally {
    await chrome.kill();
  }
}

// Run the audit
if (require.main === module) {
  runPerformanceAudit().catch(console.error);
}