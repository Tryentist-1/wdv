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
 * Parses a score value from a string (e.g., 'X', '10', 'M') into a number.
 * @param {string|number} score The score to parse.
 * @returns {number} The numeric value of the score.
 */
function parseScoreValue(score) {
    if (typeof score === 'string') {
        const upperScore = score.toUpperCase().trim();
        if (upperScore === 'X') return 10;
        if (upperScore === 'M') return 0;
        const num = parseInt(upperScore, 10);
        return isNaN(num) ? 0 : num;
    }
    if (typeof score === 'number' && !isNaN(score)) {
        return score;
    }
    return 0;
}

/**
 * Gets the appropriate CSS class for a given score value for color-coding.
 * @param {string|number} score The score value.
 * @returns {string} The CSS class name.
 */
function getScoreColor(score) {
    if (score === '' || score === null || score === undefined) return 'score-empty';
    const strScore = String(score).toUpperCase().trim();
    if (strScore === 'X') return 'score-x';
    if (strScore === 'M') return 'score-m';
    if (strScore === '10') return 'score-10';
    if (strScore === '9') return 'score-9';
    if (strScore === '8') return 'score-8';
    if (strScore === '7') return 'score-7';
    if (strScore === '6') return 'score-6';
    if (strScore === '5') return 'score-5';
    if (strScore === '4') return 'score-4';
    if (strScore === '3') return 'score-3';
    if (strScore === '2') return 'score-2';
    if (strScore === '1') return 'score-1';
    return 'score-empty';
}

// Export for Node.js environment (for testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parseScoreValue,
        getScoreColor
    };
} 