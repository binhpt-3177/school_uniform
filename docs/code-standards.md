# Code Standards

Applies to all code merged into this repository. A reviewer may reject a PR for violating any **MUST** rule.

---

## Table of Contents

1. [Cross-cutting Rules](#1-cross-cutting-rules)
2. [Backend — NestJS 11 + TypeORM](#2-backend--nestjs-11--typeorm)
3. [Frontend — React 17 + CRA](#3-frontend--react-17--cra)
4. [Testing](#4-testing)
5. [Git & CI](#5-git--ci)

---

## 1. Cross-cutting Rules

| Rule | Detail |
|---|---|
| Filenames | kebab-case for all files: `user-card.tsx`, `jwt-auth.guard.ts` |
| File size | MUST be ≤ 200 LOC. Split at logic boundaries, not arbitrarily. |
| YAGNI | Do not add abstractions, fields, or modules not required by the current task. |
| KISS | Prefer the simplest solution that satisfies requirements. |
| DRY | Extract shared logic into utilities or services; do not copy-paste business logic. |
| TypeScript (backend) | `strict: true` is set in `tsconfig.json`. No `any` without explicit justification in a comment. |
| No `synchronize: true` | Blocked by `backend/scripts/no-synchronize-true.sh` (runs during `npm run lint`). Violating this will break the lint step. |

---

## 2. Backend — NestJS 11 + TypeORM

### 2.1 Layered Structure

```
Controller  →  Service  →  TypeORM Repository  →  MySQL
```

- **Controllers** handle HTTP only: parse request, call service, return result. No business logic.
- **Services** own all business logic. One service = one bounded responsibility.
- **Repositories** are TypeORM entities accessed via `Repository<T>` (injected via `TypeOrmModule.forFeature`). Do not write raw SQL unless TypeORM cannot express the query.
- A controller MUST NOT import another controller. Cross-domain calls go service-to-service.

### 2.2 DTOs and Validation

All inbound data MUST pass through a DTO class decorated with `class-validator`.

The global `ValidationPipe` (configured in `main.ts`) enforces:
- `whitelist: true` — strips undeclared properties silently.
- `forbidNonWhitelisted: true` — rejects requests with extra fields (400 error).
- `transform: true` — coerces primitive types (e.g., string `"1"` → number `1`).

DTO rules:
- Use `@IsString()`, `@IsEmail()`, `@IsEnum()`, `@IsOptional()`, etc. from `class-validator`.
- Use `@Expose()` / `@Exclude()` from `class-transformer` on response shapes when needed.
- DTO filenames: `<action>.dto.ts` e.g. `login.dto.ts`, `create-user.dto.ts`.

```typescript
// CORRECT
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

// WRONG — plain object, no validation
function login(body: { email: string; password: string }) { ... }
```

### 2.3 Error Handling

- Throw typed `HttpException` subclasses from NestJS: `NotFoundException`, `UnauthorizedException`, `ForbiddenException`, `BadRequestException`, `ConflictException`.
- Never throw raw `Error` objects from services — the global `AllExceptionsFilter` will convert them to 500s but without a meaningful error code.
- The `AllExceptionsFilter` produces this envelope on every error:

```json
{
  "error": "NOT_FOUND",
  "message": "User not found",
  "statusCode": 404
}
```

- i18n message keys (e.g., `auth.invalid_credentials`) are resolved by the filter. Use them for user-facing messages.

### 2.4 Logging

- Inject `Logger` from `nestjs-pino` — never use `console.log`.
- Declare logger as a class field: `private readonly logger = new Logger(MyService.name)`.
- Use appropriate levels: `logger.log()` for info, `logger.warn()` for recoverable issues, `logger.error()` for failures with stack.
- Do not log sensitive fields. The pino config in `app.module.ts` redacts `authorization`, `cookie`, `password`, and `token` fields automatically, but do not log DTO objects wholesale.

```typescript
// CORRECT
import { Logger } from '@nestjs/common';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  async login(dto: LoginDto): Promise<void> {
    this.logger.log(`Login attempt for ${dto.email}`);
    // ...
  }
}
```

### 2.5 Guards and Decorators

All routes are **JWT-guarded by default** (global `JwtAuthGuard` registered via `APP_GUARD`). Guard execution order:

```
ThrottlerGuard → JwtAuthGuard → CsrfGuard
```

| Decorator | When to use |
|---|---|
| `@Public()` | Route does not require authentication (e.g., login, register, health check). |
| `@SkipCsrf()` | Route is exempt from the CSRF header check. Use only where the client does not yet have a CSRF token (login, register, refresh). Must justify in a code comment. |
| `@CurrentUser()` | Inject the authenticated user from JWT payload into a controller method parameter. |

CSRF check logic (from `csrf.guard.ts`):
- Safe methods (`GET`, `HEAD`, `OPTIONS`) are exempt.
- All other authenticated routes require `csrf_token` cookie == `X-CSRF-Token` header.
- Use `@SkipCsrf()` only on auth bootstrap endpoints; never on business API routes.

```typescript
// Public + no CSRF needed (no token exists yet)
@Public()
@SkipCsrf()
@Post('login')
login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) { ... }

// Guarded by default, CSRF required for mutation
@Post('profile')
update(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) { ... }
```

### 2.6 Response Shape

The global `ResponseInterceptor` wraps every successful response:

```json
{
  "message": "OK",
  "data": { ... },
  "statusCode": 200
}
```

- Return plain data objects or entities from services and controllers. The interceptor handles wrapping.
- Do not manually construct `{ message, data, statusCode }` objects in controllers — that double-wraps.
- Endpoints returning `204 No Content` should return `void` / `undefined`; the interceptor emits `null` for `data`.

### 2.7 Database and Migrations

**Never set `synchronize: true`** outside of test code. The lint script `backend/scripts/no-synchronize-true.sh` will fail the build if found.

Migration workflow:

```bash
# Generate a migration after entity changes
make be-migrate-gen name=add-user-role

# Review generated SQL in src/database/migrations/

# Apply
make be-migrate

# Rollback one step
make be-migrate-revert
```

Rules:
- Every schema change MUST have a migration. No migration = PR blocked.
- Review generated SQL before committing; the generator can produce unsafe statements on non-empty tables.
- Migrations live in `backend/src/database/migrations/` and are tracked in the `migrations` table.
- The CLI data source (`data-source-cli.ts`) uses `DB_USER` / `DB_NAME` env vars (not `DB_USERNAME`).

### 2.8 Module Structure

Each feature module lives in `backend/src/<feature>/` and contains:

```
<feature>/
  <feature>.module.ts
  <feature>.controller.ts
  <feature>.service.ts
  dto/
    create-<feature>.dto.ts
    update-<feature>.dto.ts
  entities/
    <feature>.entity.ts
  guards/        (optional, feature-specific guards)
  strategies/    (optional, passport strategies)
  <feature>.controller.spec.ts
  <feature>.service.spec.ts
```

Shared cross-cutting concerns live in `backend/src/common/`:
- `filters/` — `AllExceptionsFilter`
- `guards/` — `CsrfGuard`, re-exports `JwtAuthGuard`
- `decorators/` — `@Public()`, `@SkipCsrf()`, `@CurrentUser()`
- `interceptors/` — `ResponseInterceptor`
- `entities/` — `BaseEntity`
- `dto/` — `PaginationDto`, `PaginatedResponseDto`

### 2.9 Environment Variables

All env vars are declared and validated by `src/config/env-validation.schema.ts` (Joi). Adding a new required env var:
1. Add it to `env-validation.schema.ts` with `.required()` or a `.default()`.
2. Add it to `.env.backend.example`.
3. Document it in `docs/system-architecture.md` → Environment Variables table.

Never read `process.env` directly in feature code. Use `ConfigService` from `@nestjs/config`.

---

## 3. Frontend — React 17 + CRA

### 3.1 Component Rules

- **Functional components only.** No class components.
- One component per file.
- Component name: PascalCase (`UserCard`). Filename: kebab-case (`user-card.jsx` or `user-card.tsx`).
- Props interface/type: `<ComponentName>Props`.

```jsx
// CORRECT — functional, typed props
interface UserCardProps {
  name: string;
  email: string;
}

function UserCard({ name, email }: UserCardProps) {
  return <div>{name} — {email}</div>;
}

export default UserCard;
```

### 3.2 Runtime Configuration

**Never hardcode API URLs in the bundle.** The production container injects `window.env` at runtime via `entrypoint.sh`:

```javascript
// entrypoint.sh writes this into /usr/share/nginx/html/env.js at container start
window.env = { REACT_APP_API_URL: "https://api.example.com" };
```

Access config in code:

```javascript
const baseURL = window.env?.REACT_APP_API_URL || 'http://localhost:3000';
```

Do not use `process.env.REACT_APP_*` for the API URL — that value is baked into the bundle at build time and breaks multi-environment Docker images.

### 3.3 API Layer

- All API calls live in `src/api/` modules (e.g., `src/api/auth.js`, `src/api/users.js`).
- UI components are presentation-only. They call functions from `src/api/` and render results.
- Never call `fetch()` or `axios` directly inside a component body. Extract to `src/api/`.

```javascript
// src/api/auth.js
export async function login(email, password) {
  const res = await fetch(`${window.env?.REACT_APP_API_URL}/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  return res.json();
}
```

### 3.4 Styling

- Mobile-first: base styles for small screens, override upward with media queries.
- CSS modules (`.module.css`) preferred for component-scoped styles.
- If plain CSS: use BEM naming — `.user-card__name`, `.user-card--active`.
- Do not use inline styles for layout.

### 3.5 Accessibility Basics

- Interactive elements MUST be focusable and operable by keyboard.
- Images MUST have meaningful `alt` text (or `alt=""` for decorative images).
- Form inputs MUST have associated `<label>` elements.
- Avoid `<div onClick>` for interactive elements — use `<button>` or `<a>`.

---

## 4. Testing

### 4.1 Backend — Unit Tests

- File: co-located `<name>.spec.ts` next to the source file.
- Pattern: Arrange-Act-Assert.
- Mock external dependencies (databases, HTTP clients) with Jest mocks.
- Run: `npm run test` from `backend/`.

```typescript
describe('AuthService.login', () => {
  it('throws UnauthorizedException when credentials are invalid', async () => {
    // Arrange
    mockUsersService.findByEmail.mockResolvedValue(null);

    // Act & Assert
    await expect(authService.login(dto, res)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
```

### 4.2 Backend — Integration Tests

- File: `backend/test/*.int-spec.ts`.
- Config: `jest.int.config.js` — tests match `**/*.int-spec.ts`.
- Runs serially (`runInBand: true`) against `mysql_test` on port 3307.
- Requires `TEST_DB_*` env vars (see `.env.backend.example`).
- Coverage threshold: 80% branches/functions/lines/statements.
- Run: `npm run test:int` from `backend/`.

### 4.3 Test Quality Rules

- No `it('does something', () => {})` with an empty body — delete or implement.
- No `jest.fn()` that always returns `undefined` for methods under test.
- Do not comment out assertions to make a test pass.
- Integration tests MUST clean up data in `afterEach`/`afterAll`.

---

## 5. Git & CI

### 5.1 Conventional Commits

Format: `<type>(<scope>): <short description>`

| Type | Use |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Adding or fixing tests |
| `chore` | Build, tooling, dependency updates |

Examples:
```
feat(auth): add refresh token rotation
fix(users): handle null firstName in response
docs(readme): update local setup steps
chore(deps): upgrade nestjs to 11.1.0
```

### 5.2 Pre-commit Checklist

Before pushing:
1. `npm run lint` passes (backend) — this runs `no-synchronize-true.sh` check.
2. `npm run test` passes (backend unit tests).
3. No `.env` files or secrets committed.
4. No `console.log` left in backend code.
5. PR description explains *why*, not just *what*.

### 5.3 PR Review Checklist

A reviewer MUST check:
- [ ] All new routes have a DTO with `class-validator` decorators.
- [ ] New mutations on authenticated routes do NOT have `@SkipCsrf()` without justification.
- [ ] No new `synchronize: true` in any TypeORM DataSource.
- [ ] New schema changes include a migration.
- [ ] No business logic in controllers.
- [ ] No `console.log` in backend.
- [ ] New env vars are added to `env-validation.schema.ts` and `.env.backend.example`.
- [ ] File LOC ≤ 200.

---

*See also: [system-architecture.md](./system-architecture.md) for runtime topology, [security-guidelines.md](./security-guidelines.md) for security control details.*
