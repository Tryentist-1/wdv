/**
 * common.js
 * 
 * This file contains shared, reusable functions for the Archery Score Management Suite.
 * These functions are intended to be used across multiple scoring applications to ensure
 * consistency and reduce code duplication.
 * 
 * All functions in this file should be pure functions with no side effects, and they
 * must be accompanied by unit tests in the /tests directory.
 */

/**
 * Parses a raw score input string and returns its numerical value.
 * Handles special archery values 'X' (10) and 'M' (0).
 * 
 * @param {string | number} value The score to parse. Can be 'X', 'M', or a number.
 * @returns {number} The numerical value of the score. Returns 0 for invalid inputs.
 */
function parseScoreValue(value) {
  if (typeof value === 'string') {
    const upperVal = value.trim().toUpperCase();
    if (upperVal === 'X') {
      return 10;
    }
    if (upperVal === 'M') {
      return 0;
    }
    const num = parseInt(upperVal, 10);
    return isNaN(num) ? 0 : num;
  }
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }
  return 0;
}

/**
 * Determines the appropriate CSS class for a score value based on standard
 * Olympic archery target colors.
 * 
 * @param {string | number} value The score value ('X', 'M', 1-10).
 * @returns {string} The corresponding CSS class name (e.g., 'score-x', 'score-9', etc.).
 *                   Returns 'score-empty' for non-scoring values.
 */
function getScoreColor(value) {
    const strValue = String(value).trim().toUpperCase();

    switch (strValue) {
        case 'X':
            return 'score-x';
        case '10':
            return 'score-10';
        case '9':
            return 'score-9';
        case '8':
            return 'score-8';
        case '7':
            return 'score-7';
        case '6':
            return 'score-6';
        case '5':
            return 'score-5';
        case '4':
            return 'score-4';
        case '3':
            return 'score-3';
        case '2':
            return 'score-2';
        case '1':
            return 'score-1';
        case 'M':
            return 'score-m';
        default:
            return 'score-empty';
    }
}

// Export for Node.js environment (for testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parseScoreValue,
        getScoreColor
    };
} 