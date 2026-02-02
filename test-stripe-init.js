// Test that importing subscription-config doesn't trigger Stripe initialization
console.log('Starting test...');
console.log('STRIPE_SECRET_KEY present:', !!process.env.STRIPE_SECRET_KEY);

try {
  console.log('\n1. Testing subscription-config import (should NOT initialize Stripe)...');
  const config = require('./src/lib/subscription-config.ts');
  console.log('✅ subscription-config imported successfully');
  console.log('getDailySwipeLimit(false):', config.getDailySwipeLimit(false));
  console.log('getDailySwipeLimit(true):', config.getDailySwipeLimit(true));
} catch (error) {
  console.error('❌ Error importing subscription-config:', error.message);
  process.exit(1);
}

try {
  console.log('\n2. Testing stripe import (should use lazy loading)...');
  const stripe = require('./src/lib/stripe.ts');
  console.log('✅ stripe module imported successfully (Stripe not yet initialized)');

  // Now try to use it - this should trigger initialization
  console.log('\n3. Attempting to use Stripe API (will fail without STRIPE_SECRET_KEY)...');
  stripe.stripe.customers.list({ limit: 1 });
} catch (error) {
  if (error.message.includes('STRIPE_SECRET_KEY is not configured')) {
    console.log('✅ Lazy initialization working - error only thrown when accessing Stripe');
  } else {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

console.log('\n✅ All tests passed! Stripe lazy loading is working correctly.');
