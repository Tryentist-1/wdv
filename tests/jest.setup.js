// tests/jest.setup.js

// Attempt to load QUnit. This might require adjustments
// based on how QUnit is structured and where it's located.
// Assuming QUnit is globally available when loaded via a script tag
// or that its modules are exposed in a specific way.

// A simple attempt to make QUnit available globally if it's not already.
// This might need refinement depending on the QUnit version and build used.

// Try to require the QUnit library file directly
try {
  require('../tests/qunit-2.20.0.js');
} catch (e) {
  console.error("Failed to load QUnit in Jest setup:", e);
  // If require fails, try to find QUnit in the global scope if running in JSDOM
  if (typeof QUnit === 'undefined') {
    console.warn("QUnit is not available globally after attempting require.");
    // Further steps might be needed here depending on how QUnit is intended to be loaded
    // in this environment. For now, just log a warning.
  }
}

// You might need to expose QUnit globally if the tests expect it
// and the require or other loading method doesn't do it automatically.
// This is often necessary when migrating browser tests to a Node.js/JSDOM environment.
if (typeof global !== 'undefined' && typeof QUnit !== 'undefined') {
  global.QUnit = QUnit;
} else if (typeof window !== 'undefined' && typeof QUnit !== 'undefined') {
    // In case JSDOM provides 'window' but not 'global' in the expected way
    window.QUnit = QUnit;
}

console.log("Jest setup file executed. Attempted to load QUnit.");

// You might need to add other setup logic here, e.g., mocking browser APIs
// that are not fully supported by JSDOM or setting up test data.