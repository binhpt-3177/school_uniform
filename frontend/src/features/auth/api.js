import { http } from '../../lib/http.js';

/**
 * Auth API surface. All endpoints rely on cookies — no tokens ever leave or
 * enter the JS heap. Errors propagate as ApiError so callers can react to
 * status codes and resolve message keys through i18n (e.g. "auth.invalid_credentials").
 */

export function login({ email, password }) {
  return http.post('/auth/login', { email, password });
}

export function logout() {
  return http.post('/auth/logout');
}

export function me() {
  return http.get('/auth/me');
}
