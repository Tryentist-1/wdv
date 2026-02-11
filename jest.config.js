/**
 * Jest config for API tests.
 * API tests require a running server. Start with: npm run serve
 * Optional: API_BASE_URL env var (default: http://localhost:8001/api/index.php/v1)
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/tests/api/**/*.test.js'
  ],
  collectCoverageFrom: [
    'api/**/*.php',
    '!api/config*.php',
    '!api/test_*.php'
  ],
  coverageDirectory: 'tests/api/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/api/setup.js'],
  testTimeout: 30000, // 30 seconds for API tests
  verbose: true
};
