import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { IsNull } from 'typeorm';
import { AuthService } from './auth.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import * as argon2 from 'argon2';
import * as cookieUtils from './utils/cookie';

// Mock argon2 to avoid slow hashing in unit tests
jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  verify: jest.fn(),
  argon2id: 2,
}));

// Mock cookie utils
jest.mock('./utils/cookie', () => ({
  setAuthCookies: jest.fn(),
  clearAuthCookies: jest.fn(),
}));

const mockUser: User = {
  id: 'user-uuid-1',
  email: 'user@example.com',
  passwordHash: 'hashed-password',
  firstName: 'Test',
  lastName: 'User',
  role: 'user',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null as unknown as Date,
};

const mockRefreshToken: RefreshToken = {
  id: 'rt-uuid-1',
  userId: 'user-uuid-1',
  familyId: 'family-uuid-1',
  tokenHash: 'hashed-token',
  expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
  usedAt: null as unknown as Date,
  revokedAt: null as unknown as Date,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null as unknown as Date,
} as unknown as RefreshToken;

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let refreshTokenRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  const mockRes = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as import('express').Response;

  const mockReq = (cookies: Record<string, string> = {}) =>
    ({ cookies }) as unknown as import('express').Request;

  beforeEach(async () => {
    const qbMock = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    refreshTokenRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockReturnValue(mockRefreshToken),
      save: jest.fn().mockResolvedValue(mockRefreshToken),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn().mockReturnValue(qbMock),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              const config: Record<string, string> = {
                'jwt.accessSecret': 'access-secret',
                'jwt.refreshSecret': 'refresh-secret',
                'jwt.accessExpiry': '15m',
                'jwt.refreshExpiry': '7d',
                nodeEnv: 'test',
                'cookie.domain': 'localhost',
              };
              return config[key] ?? '';
            }),
          },
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: refreshTokenRepo,
        },
      ],
    }).compile();

    service = module.get(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);

    jest.clearAllMocks();
    // Re-apply default jwt mock after clearAllMocks
    jwtService.sign.mockReturnValue('mock-jwt-token');
    refreshTokenRepo.create.mockReturnValue(mockRefreshToken);
    refreshTokenRepo.save.mockResolvedValue(mockRefreshToken);
    refreshTokenRepo.update.mockResolvedValue({ affected: 1 });
    const qb = refreshTokenRepo.createQueryBuilder();
    qb.update.mockReturnThis();
    qb.set.mockReturnThis();
    qb.where.mockReturnThis();
    qb.execute.mockResolvedValue({ affected: 1 });
  });

  describe('register', () => {
    it('throws ConflictException when email is already taken', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      await expect(
        service.register({ email: 'user@example.com', password: 'Pass@1234' }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates a new user and returns UserResponseDto', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(mockUser);

      const result = await service.register({
        email: 'new@example.com',
        password: 'Pass@1234',
        firstName: 'New',
        lastName: 'User',
      });

      expect(result.email).toBe('user@example.com');
      expect(argon2.hash).toHaveBeenCalled();
    });

    it('throws ConflictException with EMAIL_TAKEN error code', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      try {
        await service.register({ email: 'user@example.com', password: 'Pass@1234' });
      } catch (e) {
        expect((e as ConflictException).getResponse()).toMatchObject({ error: 'EMAIL_TAKEN' });
      }
    });
  });

  describe('login', () => {
    it('throws UnauthorizedException when user not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      await expect(
        service.login({ email: 'no@example.com', password: 'pass' }, mockRes),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when password is invalid', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'user@example.com', password: 'wrong' }, mockRes),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('sets auth cookies and returns UserResponseDto on success', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      const result = await service.login(
        { email: 'user@example.com', password: 'Pass@1234' },
        mockRes,
      );

      expect(cookieUtils.setAuthCookies).toHaveBeenCalled();
      expect(result.email).toBe('user@example.com');
    });

    it('throws INVALID_CREDENTIALS for unknown email', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      try {
        await service.login({ email: 'no@example.com', password: 'p' }, mockRes);
      } catch (e) {
        expect((e as UnauthorizedException).getResponse()).toMatchObject({
          error: 'INVALID_CREDENTIALS',
        });
      }
    });
  });

  describe('refresh', () => {
    it('throws UnauthorizedException when refresh_token cookie is missing', async () => {
      await expect(service.refresh(mockReq({}), mockRes)).rejects.toThrow(UnauthorizedException);
    });

    it('throws TOKEN_INVALID when token not found in DB', async () => {
      refreshTokenRepo.findOne.mockResolvedValue(null);
      try {
        await service.refresh(mockReq({ refresh_token: 'some-token' }), mockRes);
      } catch (e) {
        expect((e as UnauthorizedException).getResponse()).toMatchObject({
          error: 'TOKEN_INVALID',
        });
      }
    });

    it('throws TOKEN_INVALID when token is revoked', async () => {
      refreshTokenRepo.findOne.mockResolvedValue({
        ...mockRefreshToken,
        revokedAt: new Date(),
      });
      try {
        await service.refresh(mockReq({ refresh_token: 'some-token' }), mockRes);
      } catch (e) {
        expect((e as UnauthorizedException).getResponse()).toMatchObject({
          error: 'TOKEN_INVALID',
        });
      }
    });

    it('throws TOKEN_INVALID when token is expired', async () => {
      refreshTokenRepo.findOne.mockResolvedValue({
        ...mockRefreshToken,
        expiresAt: new Date(Date.now() - 1000),
      });
      try {
        await service.refresh(mockReq({ refresh_token: 'some-token' }), mockRes);
      } catch (e) {
        expect((e as UnauthorizedException).getResponse()).toMatchObject({
          error: 'TOKEN_INVALID',
        });
      }
    });

    it('throws REFRESH_REUSED and revokes family when token already used', async () => {
      refreshTokenRepo.findOne.mockResolvedValue({
        ...mockRefreshToken,
        usedAt: new Date(), // already used
      });

      await expect(
        service.refresh(mockReq({ refresh_token: 'used-token' }), mockRes),
      ).rejects.toThrow(UnauthorizedException);

      expect(refreshTokenRepo.update).toHaveBeenCalledWith(
        { familyId: mockRefreshToken.familyId, revokedAt: IsNull() },
        { revokedAt: expect.any(Date) },
      );
    });

    it('issues new tokens when refresh is valid', async () => {
      refreshTokenRepo.findOne.mockResolvedValue({ ...mockRefreshToken, usedAt: null });
      usersService.findById.mockResolvedValue(mockUser);

      const qb = refreshTokenRepo.createQueryBuilder();
      qb.execute.mockResolvedValue({ affected: 1 });

      await service.refresh(mockReq({ refresh_token: 'valid-token' }), mockRes);

      expect(cookieUtils.setAuthCookies).toHaveBeenCalled();
    });

    it('throws REFRESH_REUSED when concurrent request consumed token first (affected=0)', async () => {
      refreshTokenRepo.findOne.mockResolvedValue({ ...mockRefreshToken, usedAt: null });
      const qb = refreshTokenRepo.createQueryBuilder();
      qb.execute.mockResolvedValue({ affected: 0 });

      await expect(
        service.refresh(mockReq({ refresh_token: 'concurrent-token' }), mockRes),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws NotFoundException when user not found after valid refresh', async () => {
      refreshTokenRepo.findOne.mockResolvedValue({ ...mockRefreshToken, usedAt: null });
      usersService.findById.mockResolvedValue(null);
      const qb = refreshTokenRepo.createQueryBuilder();
      qb.execute.mockResolvedValue({ affected: 1 });

      await expect(
        service.refresh(mockReq({ refresh_token: 'valid-token' }), mockRes),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('logout', () => {
    it('clears cookies even when no refresh_token cookie present', async () => {
      await service.logout(mockReq({}), mockRes);
      expect(cookieUtils.clearAuthCookies).toHaveBeenCalled();
    });

    it('revokes token family when refresh_token cookie is present', async () => {
      refreshTokenRepo.findOne.mockResolvedValue(mockRefreshToken);

      await service.logout(mockReq({ refresh_token: 'some-token' }), mockRes);

      expect(refreshTokenRepo.update).toHaveBeenCalledWith(
        { familyId: mockRefreshToken.familyId, revokedAt: IsNull() },
        { revokedAt: expect.any(Date) },
      );
      expect(cookieUtils.clearAuthCookies).toHaveBeenCalled();
    });

    it('still clears cookies when refresh token not found in DB', async () => {
      refreshTokenRepo.findOne.mockResolvedValue(null);

      await service.logout(mockReq({ refresh_token: 'unknown-token' }), mockRes);

      expect(cookieUtils.clearAuthCookies).toHaveBeenCalled();
      expect(refreshTokenRepo.update).not.toHaveBeenCalled();
    });
  });
});
