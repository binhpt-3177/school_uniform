import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

// Stub PassportStrategy so we can instantiate JwtStrategy without a real passport module
jest.mock('@nestjs/passport', () => ({
  PassportStrategy: (_Strategy: unknown, _name: string) => {
    return class {
      constructor(_opts: unknown) {}
    };
  },
}));

jest.mock('passport-jwt', () => ({
  ExtractJwt: {
    fromExtractors: jest.fn().mockReturnValue(jest.fn()),
  },
  Strategy: class {},
}));

function makeConfigService(secret = 'test-secret'): ConfigService {
  return {
    get: jest.fn().mockReturnValue(secret),
  } as unknown as ConfigService;
}

describe('JwtStrategy.validate', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    strategy = new JwtStrategy(makeConfigService());
  });

  it('returns AuthenticatedUser when payload is valid', () => {
    const result = strategy.validate({ sub: 'user-id', email: 'user@example.com', role: 'user' });
    expect(result).toEqual({ id: 'user-id', email: 'user@example.com', role: 'user' });
  });

  it('throws UnauthorizedException when payload.sub is missing', () => {
    expect(() => strategy.validate({ sub: '', email: 'user@example.com', role: 'user' })).toThrow(
      UnauthorizedException,
    );
  });

  it('throws TOKEN_INVALID error code when sub is falsy', () => {
    try {
      strategy.validate({ sub: '', email: '', role: '' });
    } catch (e) {
      expect((e as UnauthorizedException).getResponse()).toMatchObject({ error: 'TOKEN_INVALID' });
    }
  });
});
