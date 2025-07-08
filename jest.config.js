// jest.config.js
module.exports = {
  // Set the test environment to simulate a browser
  testEnvironment: 'jsdom',

  // Specify the pattern Jest should use to find test files
  // Looks for .js files inside the 'tests' directory
  testMatch: [
    "**/tests/**/*.js"
  ],

  // Configure module name mapping to handle imports
  // This helps Jest understand how to load modules
  moduleNameMapper: {
    // This regex matches the require('../js/common.js') pattern
    // and maps it to the actual common.js file path relative to the project root
    "^/home/user/wdv/js/common\\.js$": "/home/user/wdv/js/common.js"
  },

  // Specify setup files to run before each test file
  // This can be useful for global setups or polyfills
  // We'll add a placeholder here in case we need it for QUnit setup
  setupFilesAfterEnv: ['./tests/jest.setup.js'],
};

// Ignore the QUnit library file so Jest doesn't try to run it as a test suite
module.exports.testPathIgnorePatterns = [
  "<rootDir>/tests/qunit-2.20.0.js"
  ,"<rootDir>/tests/jest.setup.js"
];
