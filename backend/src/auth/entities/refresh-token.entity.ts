import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('refresh_tokens')
@Index(['userId', 'familyId'])
export class RefreshToken extends BaseEntity {
  @Column({ name: 'user_id' })
  userId!: string;

  @Column({ name: 'family_id' })
  familyId!: string;

  @Column({ name: 'token_hash' })
  tokenHash!: string;

  @Column({ name: 'used_at', nullable: true, type: 'datetime' })
  usedAt!: Date | null;

  @Column({ name: 'revoked_at', nullable: true, type: 'datetime' })
  revokedAt!: Date | null;

  @Column({ name: 'expires_at', type: 'datetime' })
  expiresAt!: Date;
}
