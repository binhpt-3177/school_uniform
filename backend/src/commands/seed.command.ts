import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { Repository } from 'typeorm';
import { Command } from 'nestjs-command';
import { User } from '../users/entities/user.entity';

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

@Injectable()
export class SeedCommand {
  private readonly logger = new Logger(SeedCommand.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  @Command({ command: 'seed:admin', describe: 'Upsert admin user' })
  async seedAdmin(): Promise<void> {
    const email = 'admin@example.com';
    const existing = await this.userRepo.findOne({ where: { email } });

    if (existing) {
      this.logger.log(`Admin user already exists: ${email}`);
      return;
    }

    const passwordHash = await argon2.hash('Admin@12345', ARGON2_OPTIONS);
    await this.userRepo.save(
      this.userRepo.create({
        email,
        passwordHash,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
      }),
    );
    this.logger.log(`Admin user created: ${email}`);
  }
}
