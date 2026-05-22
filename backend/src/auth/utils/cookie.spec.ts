import { Response } from 'express';
import { clearAuthCookies, setAuthCookies } from './cookie';

type CookieCall = [string, unknown, Record<string, unknown>];
type ClearCookieCall = [string, Record<string, unknown>];

function makeResponse() {
  return {
    cookie: jest.fn() as jest.MockedFunction<(...args: unknown[]) => void>,
    clearCookie: jest.fn() as jest.MockedFunction<(...args: unknown[]) => void>,
  };
}

describe('setAuthCookies', () => {
  it('sets access_token, refresh_token, and csrf_token cookies', () => {
    const res = makeResponse();
    setAuthCookies(res as unknown as Response, {
      access: 'access-jwt',
      refresh: 'refresh-jwt',
      csrf: 'csrf-hex',
      env: 'development',
    });

    const names = res.cookie.mock.calls.map((c) => c[0] as string);
    expect(names).toContain('access_token');
    expect(names).toContain('refresh_token');
    expect(names).toContain('csrf_token');
  });

  it('sets access_token with httpOnly: true', () => {
    const res = makeResponse();
    setAuthCookies(res as unknown as Response, {
      access: 'a',
      refresh: 'r',
      csrf: 'c',
      env: 'development',
    });

    const accessCall = res.cookie.mock.calls.find((c) => c[0] === 'access_token');
    expect(accessCall?.[2]).toMatchObject({ httpOnly: true });
  });

  it('sets csrf_token with httpOnly: false so JS can read it', () => {
    const res = makeResponse();
    setAuthCookies(res as unknown as Response, {
      access: 'a',
      refresh: 'r',
      csrf: 'c',
      env: 'development',
    });

    const csrfCall = res.cookie.mock.calls.find((c) => c[0] === 'csrf_token');
    expect(csrfCall?.[2]).toMatchObject({ httpOnly: false });
  });

  it('does not set domain when cookieDomain is localhost', () => {
    const res = makeResponse();
    setAuthCookies(res as unknown as Response, {
      access: 'a',
      refresh: 'r',
      csrf: 'c',
      env: 'development',
      cookieDomain: 'localhost',
    });

    for (const call of res.cookie.mock.calls) {
      expect((call[2] as Record<string, unknown>)['domain']).toBeUndefined();
    }
  });

  it('does not set domain when cookieDomain is 127.0.0.1', () => {
    const res = makeResponse();
    setAuthCookies(res as unknown as Response, {
      access: 'a',
      refresh: 'r',
      csrf: 'c',
      env: 'development',
      cookieDomain: '127.0.0.1',
    });

    for (const call of res.cookie.mock.calls) {
      expect((call[2] as Record<string, unknown>)['domain']).toBeUndefined();
    }
  });

  it('sets domain when cookieDomain is a real domain', () => {
    const res = makeResponse();
    setAuthCookies(res as unknown as Response, {
      access: 'a',
      refresh: 'r',
      csrf: 'c',
      env: 'production',
      cookieDomain: 'example.com',
    });

    const accessCall = res.cookie.mock.calls.find((c) => c[0] === 'access_token');
    expect((accessCall?.[2] as Record<string, unknown>)['domain']).toBe('example.com');
  });

  it('sets secure: false in non-production on localhost', () => {
    const res = makeResponse();
    setAuthCookies(res as unknown as Response, {
      access: 'a',
      refresh: 'r',
      csrf: 'c',
      env: 'development',
      cookieDomain: 'localhost',
    });

    const accessCall = res.cookie.mock.calls.find((c) => c[0] === 'access_token');
    expect((accessCall?.[2] as Record<string, unknown>)['secure']).toBe(false);
  });

  it('does not set domain when cookieDomain is undefined', () => {
    const res = makeResponse();
    setAuthCookies(res as unknown as Response, {
      access: 'a',
      refresh: 'r',
      csrf: 'c',
      env: 'development',
    });

    for (const call of res.cookie.mock.calls) {
      expect((call[2] as Record<string, unknown>)['domain']).toBeUndefined();
    }
  });
});

describe('clearAuthCookies', () => {
  it('clears access_token, refresh_token, and csrf_token', () => {
    const res = makeResponse();
    clearAuthCookies(res as unknown as Response);

    const names = res.clearCookie.mock.calls.map((c) => c[0] as string);
    expect(names).toContain('access_token');
    expect(names).toContain('refresh_token');
    expect(names).toContain('csrf_token');
  });

  it('clears access_token with httpOnly: true', () => {
    const res = makeResponse();
    clearAuthCookies(res as unknown as Response);

    const accessCall = res.clearCookie.mock.calls.find((c) => c[0] === 'access_token');
    expect(accessCall?.[1]).toMatchObject({ httpOnly: true });
  });
});
