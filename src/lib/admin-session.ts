export const ADMIN_COOKIE = 'admin_session';

/** Server verifies this value matches what login sets (httpOnly cookie). */
export function adminCookieValue() {
  return '1';
}
