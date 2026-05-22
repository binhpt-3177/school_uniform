# Changelog

All notable changes to this project will be documented in this file.

Format follows [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

*No unreleased changes yet.*

---

## [0.1.0] — 2026-05-22

Initial project baseline. Commits: `6fbaa06 Base BE`, `0fdd395 Init project`, `070020d pull 1`.
Documentation added in this session is included in this release.

### Added

**Backend (NestJS 11 + TypeORM + MySQL 8)**

- NestJS 11 application scaffold with module-based architecture (`backend/src/app.module.ts`)
- Auth module: JWT access token + refresh token strategy via `passport-jwt`; tokens signed with `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`
- Argon2id password hashing (per-user salt) in `backend/src/auth/auth.service.ts`
- Refresh token entity with rotation on every use (`backend/src/auth/entities/refresh-token.entity.ts`)
- HttpOnly + Secure (production) + SameSite=Strict cookie issuance (`backend/src/auth/utils/cookie.ts`)
- CSRF guard for cookie-authenticated mutating requests (`backend/src/common/guards/csrf.guard.ts`)
- `@Public()` decorator for opting routes out of global `JwtAuthGuard` (`backend/src/common/decorators/public.decorator.ts`)
- `@CurrentUser()` decorator for injecting the authenticated user into handlers (`backend/src/common/decorators/current-user.decorator.ts`)
- `@SkipCsrf()` decorator for exempting specific routes from CSRF validation (`backend/src/common/decorators/skip-csrf.decorator.ts`)
- Users module: registration and login endpoints; user entity and repository
- i18n support: `vi` (default) and `en` locales; `DEFAULT_LOCALE` env variable
- Helmet middleware for HTTP security headers (`backend/src/main.ts`)
- CORS with explicit `CORS_ORIGINS` allow-list; wildcard + credentials disabled
- `@nestjs/throttler` rate limiting: 60 requests per 60 seconds (global default)
- `nestjs-pino` structured JSON logging with request correlation IDs
- Swagger UI accessible at `/api` when `SWAGGER_ENABLED=true`; disabled in production by default
- TypeORM data source with MySQL 8; `synchronize: false` enforced
- Initial database migration (`backend/src/database/migrations/1778772211284-init.ts`)
- Pre-commit script blocking `synchronize: true` in any data-source file (`backend/scripts/no-synchronize-true.sh`)
- Joi-based environment validation at boot (`backend/src/config/env-validation.schema.ts`, `backend/src/config/configuration.ts`)
- Health endpoint (`backend/src/health/health.module.ts`)
- Database seed command for local development

**Frontend (React 17 + CRA)**

- React 17 application shell bootstrapped with Create React App
- Nginx static-file serving configuration
- No domain screens yet (Phase 1 target)

**Infrastructure**

- `docker-compose.yml` with two MySQL 8 services: `mysql` (port 3306, app database) and `mysql_test` (port 3307, test database)
- Environment variable documentation in `.env.example`

**Documentation**

- `docs/README.md` — documentation index and audience signposts
- `docs/getting-started.md` — prerequisites, env setup, Docker Compose, first run
- `docs/codebase-summary.md` — directory tree, Compose services, env file map
- `docs/system-architecture.md` — architecture diagrams and data flow
- `docs/code-standards.md` — TypeScript/NestJS conventions, linting rules
- `docs/security-guidelines.md` — OWASP Top 10 mapping, contributor security checklist
- `docs/design-guidelines.md` — UI/UX tokens, component patterns, accessibility rules
- `docs/development-roadmap.md` — project phases and milestones
- `docs/project-changelog.md` — this file
- `CONTRIBUTING.md` — pull request workflow, branch naming, commit conventions

---

[Unreleased]: https://github.com/your-org/school-uniform/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/your-org/school-uniform/releases/tag/v0.1.0
