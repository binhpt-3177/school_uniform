import { Response } from 'express';

export interface AuthCookieOptions {
  access: string;
  refresh: string;
  csrf: string;
  env: string;
  cookieDomain?: string;
}

const ACCESS_TTL_MS = 15 * 60 * 1000; // 15 minutes
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function isLocalhost(domain: string | undefined): boolean {
  return !domain || domain === 'localhost' || domain === '127.0.0.1';
}

export function setAuthCookies(res: Response, opts: AuthCookieOptions): void {
  const isProduction = opts.env === 'production';
  const localhost = isLocalhost(opts.cookieDomain);
  const secure = isProduction && !localhost;
  const domain = localhost ? undefined : opts.cookieDomain;

  const base = {
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    path: '/',
    ...(domain ? { domain } : {}),
  };

  res.cookie('access_token', opts.access, {
    ...base,
    maxAge: ACCESS_TTL_MS,
  });

  res.cookie('refresh_token', opts.refresh, {
    ...base,
    maxAge: REFRESH_TTL_MS,
  });

  // CSRF cookie must NOT be HttpOnly — JS needs to read it
  res.cookie('csrf_token', opts.csrf, {
    httpOnly: false,
    secure,
    sameSite: 'lax' as const,
    path: '/',
    ...(domain ? { domain } : {}),
    maxAge: REFRESH_TTL_MS,
  });
}

export function clearAuthCookies(res: Response): void {
  const opts = { httpOnly: true, path: '/' };
  res.clearCookie('access_token', opts);
  res.clearCookie('refresh_token', opts);
  res.clearCookie('csrf_token', { path: '/' });
}
