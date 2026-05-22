import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

// Stub AuthGuard so we don't need a real passport setup
jest.mock('@nestjs/passport', () => ({
  AuthGuard: (_strategy: string) => {
    return class {
      canActivate(_ctx: unknown) {
        return true;
      }
      handleRequest<T>(_err: unknown, user: T) {
        return user;
      }
    };
  },
}));

function makeContext(isPublic: boolean): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({}) }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as unknown as jest.Mocked<Reflector>;
    guard = new JwtAuthGuard(reflector);
  });

  it('returns true immediately for @Public() routes', () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    expect(guard.canActivate(makeContext(true))).toBe(true);
  });

  it('delegates to super.canActivate for non-public routes', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    // super.canActivate is stubbed to return true
    expect(guard.canActivate(makeContext(false))).toBe(true);
  });

  it('returns user when handleRequest called with valid user', () => {
    const user = { id: 'u1', email: 'u@example.com', role: 'user' };
    expect(guard.handleRequest(null, user)).toBe(user);
  });

  it('throws UnauthorizedException when handleRequest called with no user', () => {
    expect(() => guard.handleRequest(null, null)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when handleRequest called with error', () => {
    expect(() => guard.handleRequest(new Error('jwt error'), null)).toThrow(UnauthorizedException);
  });

  it('throws UNAUTHORIZED error code', () => {
    try {
      guard.handleRequest(null, null);
    } catch (e) {
      expect((e as UnauthorizedException).getResponse()).toMatchObject({ error: 'UNAUTHORIZED' });
    }
  });
});
