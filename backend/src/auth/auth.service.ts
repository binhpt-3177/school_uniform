import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { Request, Response } from 'express';
import { plainToInstance } from 'class-transformer';
import { IsNull, Repository } from 'typeorm';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshToken } from './entities/refresh-token.entity';
import { clearAuthCookies, setAuthCookies } from './utils/cookie';

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

@Injectable()
export class AuthService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiry: string;
  private readonly refreshExpiry: string;
  private readonly nodeEnv: string;
  private readonly cookieDomain: string;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    // Use untyped ConfigService to allow dot-notation path access
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
  ) {
    this.accessSecret = this.configService.get<string>('jwt.accessSecret') ?? '';
    this.refreshSecret = this.configService.get<string>('jwt.refreshSecret') ?? '';
    this.accessExpiry = this.configService.get<string>('jwt.accessExpiry') ?? '15m';
    this.refreshExpiry = this.configService.get<string>('jwt.refreshExpiry') ?? '7d';
    this.nodeEnv = this.configService.get<string>('nodeEnv') ?? 'development';
    this.cookieDomain = this.configService.get<string>('cookie.domain') ?? 'localhost';
  }

  async register(dto: RegisterDto): Promise<UserResponseDto> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException({ error: 'EMAIL_TAKEN', message: 'auth.email_taken' });
    }

    const passwordHash = await argon2.hash(dto.password, ARGON2_OPTIONS);
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName ?? '',
      lastName: dto.lastName ?? '',
      role: 'user',
    });

    return plainToInstance(UserResponseDto, user, { excludeExtraneousValues: true });
  }

  async login(dto: LoginDto, res: Response): Promise<UserResponseDto> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException({
        error: 'INVALID_CREDENTIALS',
        message: 'auth.invalid_credentials',
      });
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException({
        error: 'INVALID_CREDENTIALS',
        message: 'auth.invalid_credentials',
      });
    }

    const familyId = crypto.randomUUID();
    const { accessToken, refreshToken, csrfToken } = await this.issueTokens(
      user.id,
      user.email,
      user.role,
      familyId,
    );

    setAuthCookies(res, {
      access: accessToken,
      refresh: refreshToken,
      csrf: csrfToken,
      env: this.nodeEnv,
      cookieDomain: this.cookieDomain,
    });

    return plainToInstance(UserResponseDto, user, { excludeExtraneousValues: true });
  }

  async refresh(req: Request, res: Response): Promise<void> {
    const rawToken: string | undefined = (req.cookies as Record<string, string>)?.['refresh_token'];
    if (!rawToken) {
      throw new UnauthorizedException({ error: 'TOKEN_MISSING', message: 'auth.token_expired' });
    }

    const tokenHash = this.hashToken(rawToken);

    // Optimistic atomic mark-as-used: UPDATE ... WHERE id=? AND used_at IS NULL
    // Returns affected=0 if already used (replay) or not found — no deadlock risk.
    const existing = await this.refreshTokenRepo.findOne({ where: { tokenHash } });

    if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
      throw new UnauthorizedException({ error: 'TOKEN_INVALID', message: 'auth.token_expired' });
    }

    // Replay detection: if token already used, revoke entire family
    if (existing.usedAt) {
      await this.refreshTokenRepo.update(
        { familyId: existing.familyId, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
      clearAuthCookies(res);
      throw new UnauthorizedException({ error: 'REFRESH_REUSED', message: 'auth.refresh_reused' });
    }

    // Atomically mark as used — if affected=0 another request already consumed this token
    const result = await this.refreshTokenRepo
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ usedAt: new Date() })
      .where('id = :id AND used_at IS NULL', { id: existing.id })
      .execute();

    if (!result.affected || result.affected === 0) {
      // Race condition: another request consumed this token first — treat as replay
      await this.refreshTokenRepo.update(
        { familyId: existing.familyId, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
      clearAuthCookies(res);
      throw new UnauthorizedException({ error: 'REFRESH_REUSED', message: 'auth.refresh_reused' });
    }

    const user = await this.usersService.findById(existing.userId);
    if (!user) {
      throw new NotFoundException({ error: 'USER_NOT_FOUND', message: 'auth.invalid_credentials' });
    }

    const { accessToken, refreshToken, csrfToken } = await this.issueTokens(
      user.id,
      user.email,
      user.role,
      existing.familyId,
    );

    setAuthCookies(res, {
      access: accessToken,
      refresh: refreshToken,
      csrf: csrfToken,
      env: this.nodeEnv,
      cookieDomain: this.cookieDomain,
    });
  }

  async logout(req: Request, res: Response): Promise<void> {
    const rawToken: string | undefined = (req.cookies as Record<string, string>)?.['refresh_token'];

    if (rawToken) {
      const tokenHash = this.hashToken(rawToken);
      const existing = await this.refreshTokenRepo.findOne({ where: { tokenHash } });
      if (existing) {
        await this.refreshTokenRepo.update(
          { familyId: existing.familyId, revokedAt: IsNull() },
          { revokedAt: new Date() },
        );
      }
    }

    clearAuthCookies(res);
  }

  private async issueTokens(
    userId: string,
    email: string,
    role: string,
    familyId: string,
  ): Promise<{ accessToken: string; refreshToken: string; csrfToken: string }> {
    const payload = { sub: userId, email, role };

    // expiresIn must be a number (seconds) for @nestjs/jwt v11 strict types
    const accessToken = this.jwtService.sign(payload, {
      secret: this.accessSecret,
      expiresIn: this.parseExpirySeconds(this.accessExpiry),
    });

    const refreshToken = this.jwtService.sign(
      { sub: userId, familyId, jti: crypto.randomUUID() },
      {
        secret: this.refreshSecret,
        expiresIn: this.parseExpirySeconds(this.refreshExpiry),
      },
    );

    const csrfToken = crypto.randomBytes(32).toString('hex');

    const expiresAt = this.parseExpiryDate(this.refreshExpiry);
    const tokenHash = this.hashToken(refreshToken);

    const rt = this.refreshTokenRepo.create({
      userId,
      familyId,
      tokenHash,
      expiresAt,
    });
    await this.refreshTokenRepo.save(rt);

    return { accessToken, refreshToken, csrfToken };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private parseExpirySeconds(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 3600;
    const val = parseInt(match[1], 10);
    const unit = match[2];
    const secs: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return val * (secs[unit] ?? 86400);
  }

  private parseExpiryDate(expiry: string): Date {
    return new Date(Date.now() + this.parseExpirySeconds(expiry) * 1000);
  }
}
