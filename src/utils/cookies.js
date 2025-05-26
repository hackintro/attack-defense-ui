/**
 * Set a cookie with expiration
 * @param {string} name - Cookie name
 * @param {string} value - Cookie value
 * @param {number} days - Days until expiration
 */
export function setCookie(name, value, days = 7) {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = 'expires=' + date.toUTCString();
  const cookieString = name + '=' + value + ';' + expires + ';path=/';
  document.cookie = cookieString;
}

/**
 * Get a cookie value by name
 * @param {string} name - Cookie name
 * @returns {string|null} Cookie value or null if not found
 */
export function getCookie(name) {
  console.log('All cookies:', document.cookie); // Debug log
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      const value = c.substring(nameEQ.length, c.length);
      return value;
    }
  }
  return null;
}

/**
 * Delete a cookie by name
 * @param {string} name - Cookie name
 */
export function deleteCookie(name) {
  document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
}

/**
 * Check if a cookie exists
 * @param {string} name - Cookie name
 * @returns {boolean} True if cookie exists
 */
export function cookieExists(name) {
  return getCookie(name) !== null;
}
