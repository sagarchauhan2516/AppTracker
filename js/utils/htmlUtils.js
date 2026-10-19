/**
 * Vacancy Radar India - Shared HTML Utility Functions
 * Centralised escapeHtml to prevent XSS and eliminate duplication across UI modules.
 */

/**
 * Escapes HTML special characters in a string to prevent XSS injection.
 * @param {string} str - Raw string to escape
 * @returns {string} HTML-safe string
 */
export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Formats a date string or Date object into a human-readable locale string.
 * @param {string|Date} dateInput - Date to format
 * @param {object} [options] - Intl.DateTimeFormat options
 * @returns {string} Formatted date string, or 'N/A' if invalid
 */
export function formatDate(dateInput, options = {}) {
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options
    });
  } catch (_) {
    return 'N/A';
  }
}

/**
 * Truncates a string to maxLen characters, adding ellipsis if needed.
 * @param {string} str - String to truncate
 * @param {number} maxLen - Maximum length
 * @returns {string} Truncated string
 */
export function truncate(str, maxLen = 100) {
  if (!str || str.length <= maxLen) return str || '';
  return str.slice(0, maxLen - 1) + '…';
}
