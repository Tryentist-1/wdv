/**
 * Jest setup for API tests
 * Global configuration and utilities
 */

// Global test timeout
jest.setTimeout(30000);

// Global test utilities
global.print_info = (message) => console.log(`ℹ️  ${message}`);
global.print_success = (message) => console.log(`✅ ${message}`);
global.print_error = (message) => console.log(`❌ ${message}`);

// Setup and teardown
beforeAll(async () => {
  print_info('Starting API test suite...');
});

afterAll(async () => {
  print_success('API test suite completed');
});
