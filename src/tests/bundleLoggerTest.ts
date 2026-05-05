// nexus-panel/bot/src/tests/bundleLoggerTest.ts

/**
 * 🧪 BUNDLE LOGGER TEST
 * Basic testing script for bundle logging system
 */

import { bundleLogger, LogLevel, logBundleCommand, logBundleError, logBundleSuccess, logBundleApi } from '../utils/bundleLogger';

// Test all log levels
console.log('🧪 Testing Bundle Logger System...\n');

// Test 1: Log Level Configuration
console.log('📊 Test 1: Log Level Configuration');
bundleLogger.setLogLevel(LogLevel.DEBUG);

// Test 2: Command Logging
console.log('\n🎁 Test 2: Command Logging');
logBundleCommand('browse', {
  guildId: '123456789',
  userId: '987654321',
  action: 'browse',
  data: { username: 'testuser#1234' }
});

// Test 3: API Call Logging
console.log('\n🔍 Test 3: API Call Logging');
logBundleApi('/api/bundles/public/guild/123456789', {
  guildId: '123456789'
});

// Test 4: Success Logging
console.log('\n✅ Test 4: Success Logging');
logBundleSuccess('getGuildBundles', {
  guildId: '123456789',
  bundleCount: 3,
  data: { cacheMiss: false }
});

// Test 5: Error Logging
console.log('\n❌ Test 5: Error Logging');
logBundleError('getBundleDetails', {
  bundleId: 'nonexistent123',
  error: 'Bundle not found',
  data: { attemptCount: 1 }
});

// Test 6: Button Interaction Logging
console.log('\n🔘 Test 6: Button Interaction Logging');
bundleLogger.logButtonInteraction('purchase_bundle_abc123', {
  guildId: '123456789',
  userId: '987654321',
  bundleId: 'abc123',
  action: 'purchase'
});

// Test 7: Checkout Logging
console.log('\n💳 Test 7: Checkout Logging');
bundleLogger.logCheckout('start', {
  bundleId: 'abc123',
  userId: '987654321',
  guildId: '123456789'
});

bundleLogger.logCheckout('success', {
  bundleId: 'abc123',
  userId: '987654321',
  guildId: '123456789',
  orderId: 'PAY-123456789',
  data: { provider: 'paypal', amount: '19.99' }
});

// Test 8: Performance Timer
console.log('\n⚡ Test 8: Performance Timer');
const timer = bundleLogger.startTimer('testOperation');
setTimeout(() => {
  timer(); // Should log performance after ~100ms
}, 100);

// Test 9: Bundle Data Logging
console.log('\n📊 Test 9: Bundle Data Logging');
const mockBundles = [
  {
    id: 'bundle1',
    name: 'Premium Pack',
    finalPrice: '19.99',
    isActive: true,
    roles: [{ id: 'role1' }, { id: 'role2' }]
  },
  {
    id: 'bundle2',
    name: 'Starter Pack',
    finalPrice: '9.99',
    isActive: true,
    roles: [{ id: 'role3' }]
  }
];

bundleLogger.logBundleData(mockBundles, {
  guildId: '123456789'
});

// Test 10: Different Log Levels
console.log('\n📈 Test 10: Log Level Filtering');
console.log('Setting to ERROR level (should only show errors):');
bundleLogger.setLogLevel(LogLevel.ERROR);

logBundleCommand('browse', { guildId: '123' }); // Should NOT appear
logBundleSuccess('test', { guildId: '123' }); // Should NOT appear
logBundleError('test', { error: 'This should appear', guildId: '123' }); // Should appear

console.log('\nResetting to INFO level:');
bundleLogger.setLogLevel(LogLevel.INFO);

console.log('\n✅ Bundle Logger Test Complete!');
console.log('🔍 Check above output for structured JSON logs with timestamps');
console.log('📊 All log types tested successfully');