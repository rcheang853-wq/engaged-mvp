const { chromium } = require('playwright');

async function testPasswordReset() {
  console.log('🚀 Starting password reset test...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Listen for console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
    console.log(`[${msg.type()}] ${msg.text()}`);
  });

  // Listen for errors
  const pageErrors = [];
  page.on('pageerror', error => {
    pageErrors.push(error.message);
    console.error(`❌ Page Error: ${error.message}`);
  });

  try {
    // Navigate to password reset page
    console.log('📍 Navigating to http://localhost:3000/auth/reset-password');
    await page.goto('http://localhost:3000/auth/reset-password', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: '.playwright-mcp/password-reset-page.png' });
    console.log('📸 Screenshot saved: password-reset-page.png\n');

    // Check for the specific error we fixed
    const hasLocationError = pageErrors.some(err => err.includes('location is not defined'));
    if (hasLocationError) {
      console.log('❌ FAIL: "location is not defined" error still exists!');
    } else {
      console.log('✅ PASS: No "location is not defined" error found');
    }

    // Check if form is rendered
    const emailInput = await page.locator('input[type="email"]').count();
    const submitButton = await page.locator('button:has-text("Send reset link")').count();

    console.log(`\n📋 Form elements check:`);
    console.log(`   Email input: ${emailInput > 0 ? '✅ Found' : '❌ Not found'}`);
    console.log(`   Submit button: ${submitButton > 0 ? '✅ Found' : '❌ Not found'}`);

    // Test form submission with a test email
    if (emailInput > 0 && submitButton > 0) {
      console.log('\n🧪 Testing form submission...');
      await page.fill('input[type="email"]', 'test@example.com');
      await page.screenshot({ path: '.playwright-mcp/password-reset-filled.png' });

      // Click submit and wait for response
      await page.click('button:has-text("Send reset link")');
      await page.waitForTimeout(3000);

      await page.screenshot({ path: '.playwright-mcp/password-reset-submitted.png' });
      console.log('📸 Form submission screenshots saved');

      // Check for success or error message
      const successMsg = await page.locator('text=Check your email').count();
      const errorMsg = await page.locator('text=Failed to fetch').count();

      console.log(`\n📬 Submission result:`);
      if (successMsg > 0) {
        console.log('   ✅ Success message displayed');
      } else if (errorMsg > 0) {
        console.log('   ❌ "Failed to fetch" error displayed');
      } else {
        console.log('   ⏳ Request in progress or other state');
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total console messages: ${consoleMessages.length}`);
    console.log(`Total page errors: ${pageErrors.length}`);

    if (pageErrors.length > 0) {
      console.log('\n❌ Errors found:');
      pageErrors.forEach((err, i) => console.log(`   ${i + 1}. ${err}`));
    } else {
      console.log('\n✅ No page errors detected!');
    }

    console.log('\n✨ Test completed successfully');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    await page.screenshot({ path: '.playwright-mcp/password-reset-error.png' });
  } finally {
    await browser.close();
  }
}

testPasswordReset().catch(console.error);
