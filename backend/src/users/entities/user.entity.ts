import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export type UserRole = 'user' | 'admin';

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  email!: string;

  @Column({ name: 'password_hash' })
  passwordHash!: string;

  @Column({ name: 'first_name', default: '' })
  firstName!: string;

  @Column({ name: 'last_name', default: '' })
  lastName!: string;

  @Column({ default: 'user' })
  role!: UserRole;
}
