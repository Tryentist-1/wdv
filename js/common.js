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
 * Gets the appropriate Tailwind CSS classes for a given score value for color-coding.
 * @param {string|number} score The score value.
 * @returns {string} The Tailwind CSS class names (background and text color).
 */
function getScoreColor(score) {
    if (score === '' || score === null || score === undefined) return '';
    const strScore = String(score).toUpperCase().trim();
    // Gold: X, 10, 9
    if (strScore === 'X' || strScore === '10' || strScore === '9') {
        return 'bg-score-gold text-black dark:text-black';
    }
    // Red: 8, 7
    if (strScore === '8' || strScore === '7') {
        return 'bg-score-red text-white';
    }
    // Blue: 6, 5
    if (strScore === '6' || strScore === '5') {
        return 'bg-score-blue text-white';
    }
    // Black: 4, 3
    if (strScore === '4' || strScore === '3') {
        return 'bg-score-black text-white';
    }
    // White: 2, 1, M
    if (strScore === '2' || strScore === '1' || strScore === 'M') {
        return 'bg-score-white text-black dark:text-black';
    }
    return '';
}

/**
 * Generates a UUID v4 (random).
 * @returns {string} A UUID string in the format 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Gets a cookie value by name.
 * @param {string} name The name of the cookie.
 * @returns {string|null} The cookie value, or null if not found.
 */
function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

/**
 * Sets a cookie with a given name, value, and expiration days.
 * @param {string} name The name of the cookie.
 * @param {string} value The value of the cookie.
 * @param {number} days The number of days until the cookie expires.
 */
function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

/**
 * Gets or creates the archer cookie (oas_archer_id).
 * This is used to identify the archer across sessions.
 * @returns {string} The archer ID (UUID).
 */
function getArcherCookie() {
    let archerId = getCookie('oas_archer_id');
    if (!archerId) {
        archerId = generateUUID();
        setCookie('oas_archer_id', archerId, 365); // 1 year expiry
        console.log('[OAS Cookie] Created new archer ID:', archerId);
    }
    return archerId;
}

/**
 * Initializes dark mode from localStorage or system preference.
 * Should be called immediately (before DOMContentLoaded) to prevent flash.
 */
function initDarkMode() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

/**
 * Toggles dark mode and saves preference to localStorage and cookie.
 * @param {boolean} forceDark Optional. If provided, sets dark mode to this value instead of toggling.
 */
function toggleDarkMode(forceDark) {
    const htmlElement = document.documentElement;
    const isCurrentlyDark = htmlElement.classList.contains('dark');
    const shouldBeDark = forceDark !== undefined ? forceDark : !isCurrentlyDark;
    
    if (shouldBeDark) {
        htmlElement.classList.add('dark');
    } else {
        htmlElement.classList.remove('dark');
    }
    
    const theme = shouldBeDark ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
    // Also save to cookie as backup (365 days expiry)
    setCookie('theme', theme, 365);
}

/**
 * Gets the current dark mode preference.
 * @returns {string} 'dark' or 'light'
 */
function getDarkModePreference() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
        return savedTheme;
    }
    // Fallback to cookie if localStorage not available
    const cookieTheme = getCookie('theme');
    if (cookieTheme === 'dark' || cookieTheme === 'light') {
        return cookieTheme;
    }
    // Fallback to system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Export for Node.js environment (for testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parseScoreValue,
        getScoreColor,
        generateUUID,
        getCookie,
        setCookie,
        getArcherCookie,
        initDarkMode,
        toggleDarkMode,
        getDarkModePreference
    };
} 