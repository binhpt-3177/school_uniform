import { getCsrfToken } from './csrf.js';

/**
 * Thin fetch wrapper for talking to the NestJS backend.
 *
 * - Always sends cookies (`credentials: 'include'`) so the HttpOnly access &
 *   refresh tokens travel with each request.
 * - Adds X-CSRF-Token on writes (POST/PUT/PATCH/DELETE) when the csrf_token
 *   cookie is present. Login itself runs @SkipCsrf() server-side so a missing
 *   token is acceptable pre-auth.
 * - Parses JSON responses; throws ApiError with backend's error envelope
 *   ({ error, message, statusCode }) on non-2xx responses.
 * - NEVER touches localStorage/sessionStorage for tokens — OWASP A02 safety.
 */

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export class ApiError extends Error {
  constructor({ status, errorCode, message }) {
    super(message || `HTTP ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.errorCode = errorCode;
  }
}

function resolveBaseUrl() {
  const runtime = typeof window !== 'undefined' ? window.env?.REACT_APP_API_URL : undefined;
  return (runtime || 'http://localhost:3000').replace(/\/$/, '');
}

async function request(method, path, body) {
  const url = `${resolveBaseUrl()}${path}`;
  const headers = { Accept: 'application/json' };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (WRITE_METHODS.has(method)) {
    const csrf = getCsrfToken();
    if (csrf) headers['X-CSRF-Token'] = csrf;
  }

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (networkErr) {
    throw new ApiError({ status: 0, errorCode: 'NETWORK_ERROR', message: networkErr.message });
  }

  if (response.status === 204) return null;

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    throw new ApiError({
      status: response.status,
      errorCode: payload?.error,
      message: payload?.message,
    });
  }

  return payload;
}

export const http = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  del: (path) => request('DELETE', path),
};
