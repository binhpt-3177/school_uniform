import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CsrfGuard } from './csrf.guard';

function makeContext(overrides: {
  method?: string;
  cookies?: Record<string, string>;
  headers?: Record<string, string>;
  isPublic?: boolean;
  skipCsrf?: boolean;
}): ExecutionContext {
  const req = {
    method: overrides.method ?? 'POST',
    cookies: overrides.cookies ?? {},
    headers: overrides.headers ?? {},
  };

  const reflector = {
    getAllAndOverride: jest.fn().mockImplementation((key: string) => {
      if (key === 'isPublic') return overrides.isPublic ?? false;
      if (key === 'skipCsrf') return overrides.skipCsrf ?? false;
      return false;
    }),
  } as unknown as Reflector;

  const ctx = {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;

  // Attach reflector to the guard directly via closure
  (ctx as unknown as { _reflector: Reflector })._reflector = reflector;

  return ctx;
}

describe('CsrfGuard', () => {
  let guard: CsrfGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;
    guard = new CsrfGuard(reflector);
  });

  it('allows @Public() routes without CSRF check', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(true); // isPublic
    const ctx = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ method: 'POST', cookies: {}, headers: {} }) }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows @SkipCsrf() routes without CSRF check', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false) // isPublic
      .mockReturnValueOnce(true); // skipCsrf
    const ctx = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ method: 'POST', cookies: {}, headers: {} }) }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows safe methods (GET) without CSRF token', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const ctx = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ method: 'GET', cookies: {}, headers: {} }),
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows HEAD method without CSRF token', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const ctx = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ method: 'HEAD', cookies: {}, headers: {} }),
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows OPTIONS method without CSRF token', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const ctx = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ method: 'OPTIONS', cookies: {}, headers: {} }),
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws ForbiddenException when cookie token missing on POST', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const ctx = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'POST',
          cookies: {}, // no csrf_token
          headers: { 'x-csrf-token': 'some-token' },
        }),
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when header token missing on POST', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const ctx = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'POST',
          cookies: { csrf_token: 'abc123' },
          headers: {}, // no x-csrf-token header
        }),
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when cookie and header tokens do not match', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const ctx = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'POST',
          cookies: { csrf_token: 'token-a' },
          headers: { 'x-csrf-token': 'token-b' },
        }),
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('allows POST when cookie and header tokens match', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const ctx = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'POST',
          cookies: { csrf_token: 'match-token' },
          headers: { 'x-csrf-token': 'match-token' },
        }),
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('ForbiddenException has error code CSRF_INVALID', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const ctx = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'DELETE',
          cookies: {},
          headers: {},
        }),
      }),
    } as unknown as ExecutionContext;

    try {
      guard.canActivate(ctx);
      fail('Expected ForbiddenException');
    } catch (e) {
      expect(e).toBeInstanceOf(ForbiddenException);
      const response = (e as ForbiddenException).getResponse() as Record<string, string>;
      expect(response.error).toBe('CSRF_INVALID');
    }
  });
});
