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
