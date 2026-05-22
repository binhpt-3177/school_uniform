# Code Standards

Applies to all code merged into this repository. A reviewer may reject a PR for violating any **MUST** rule.

---

## Table of Contents

1. [Cross-cutting Rules](#1-cross-cutting-rules)
2. [Backend — NestJS 11 + TypeORM](#2-backend--nestjs-11--typeorm)
3. [Frontend — React 19 + Vite + Tailwind v4](#3-frontend--react-19--vite--tailwind-v4)
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

## 3. Frontend — React 19 + Vite + Tailwind v4

**Stack:** React 19, Vite 8, Tailwind CSS v4 (via `@tailwindcss/vite`), react-router-dom v7, react-hook-form + zod, react-i18next.

### 3.1 Component Rules

- **Functional components only.** No class components.
- One component per file.
- Component name: PascalCase (`UserCard`). Filename: kebab-case (`user-card.jsx`).
- Props: plain JS destructuring (no TypeScript prop interfaces — project is JS).

```jsx
// CORRECT — functional component
function UserCard({ name, email }) {
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

Access config in code via `src/lib/http.js` (the project's shared fetch wrapper). Do not call `fetch()` directly in components or feature API modules — use the shared http client which handles `credentials: 'include'` and CSRF headers automatically.

Do not use `process.env.REACT_APP_*` for the API URL — that value is baked into the bundle at build time and breaks multi-environment Docker images.

### 3.3 API Layer

- Feature API modules live in `src/features/<feature>/api.js` (e.g., `src/features/auth/api.js`).
- Shared HTTP utilities live in `src/lib/http.js` and `src/lib/csrf.js`.
- UI components are presentation-only. They call functions from feature `api.js` files and render results.
- Never call `fetch()` directly inside a component body.

### 3.4 Forms

- Use `react-hook-form` with a `zod` schema for all forms.
- Schema files live co-located with the feature: `src/features/<feature>/schema.js`.
- Use `@hookform/resolvers/zod` as the resolver.
- Display field errors via the shared `<FormError>` component (`src/components/ui/form-error.jsx`).

### 3.5 Routing

- All routes are defined in `src/router.jsx` using `createBrowserRouter` from react-router-dom v7.
- Protected routes are wrapped with `<ProtectedRoute>` (`src/routes/protected-route.jsx`), which reads auth state from `AuthContext` and redirects to `/login` when unauthenticated.
- Auth state is provided by `AuthContext` (`src/features/auth/auth-context.jsx`); do not read cookies directly in components.

### 3.6 i18n

- All UI strings MUST use the `useTranslation` hook — never hardcode display strings in JSX.
- Namespaces: `common` (shared labels, actions) and `auth` (auth flow strings).
- Locale files: `src/i18n/locales/{en,vi}/{common,auth}.json`.
- Key convention: `namespace:section.key` (e.g., `auth:login.submitButton`).
- Mirror the backend's i18n key structure where UI strings correspond to API error messages.

### 3.7 Styling

- Use **Tailwind v4 utility classes** (imported via `@tailwindcss/vite` plugin — no `tailwind.config.js` required).
- Mobile-first: base classes for small screens, `sm:`, `md:`, `lg:` prefixes to scale up.
- Do not use inline styles for layout. Do not use CSS modules (Tailwind replaces them).

### 3.8 Testing

- Tests run via **vitest** inside the Docker container: `docker compose exec frontend npm test`.
- Test files are co-located with the source: `*.test.jsx` or `*.test.js`.
- Use `@testing-library/react` and `@testing-library/user-event` for component tests.
- Test setup file: `src/test/setup.js`.

### 3.9 Accessibility Basics

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
