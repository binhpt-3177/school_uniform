/**
 * Reads the `csrf_token` cookie set by the backend on login/refresh.
 *
 * Backend sets this cookie as JS-readable (non-HttpOnly) on purpose so that
 * the SPA can echo its value in the X-CSRF-Token header on every state-changing
 * request — the double-submit cookie pattern.
 *
 * Returns undefined when the cookie is absent (pre-login or after logout).
 */
const CSRF_COOKIE_NAME = 'csrf_token';

export function getCsrfToken() {
  if (typeof document === 'undefined' || !document.cookie) return undefined;

  const prefix = `${CSRF_COOKIE_NAME}=`;
  const parts = document.cookie.split(';');

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }

  return undefined;
}
