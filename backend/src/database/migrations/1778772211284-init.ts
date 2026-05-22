import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1778772211284 implements MigrationInterface {
  name = 'Init1778772211284';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`users\` (\`id\` varchar(36) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deletedAt\` datetime(6) NULL, \`email\` varchar(255) NOT NULL, \`password_hash\` varchar(255) NOT NULL, \`first_name\` varchar(255) NOT NULL DEFAULT '', \`last_name\` varchar(255) NOT NULL DEFAULT '', \`role\` varchar(255) NOT NULL DEFAULT 'user', UNIQUE INDEX \`IDX_97672ac88f789774dd47f7c8be\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`refresh_tokens\` (\`id\` varchar(36) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deletedAt\` datetime(6) NULL, \`user_id\` varchar(255) NOT NULL, \`family_id\` varchar(255) NOT NULL, \`token_hash\` varchar(255) NOT NULL, \`used_at\` datetime NULL, \`revoked_at\` datetime NULL, \`expires_at\` datetime NOT NULL, INDEX \`IDX_c5a4f473c1ba85f0a18076c62e\` (\`user_id\`, \`family_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX \`IDX_c5a4f473c1ba85f0a18076c62e\` ON \`refresh_tokens\``);
    await queryRunner.query(`DROP TABLE \`refresh_tokens\``);
    await queryRunner.query(`DROP INDEX \`IDX_97672ac88f789774dd47f7c8be\` ON \`users\``);
    await queryRunner.query(`DROP TABLE \`users\``);
  }
}
