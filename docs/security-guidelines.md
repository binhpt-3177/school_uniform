# Security Guidelines

> Cross-links: [code-standards.md](code-standards.md) | [system-architecture.md](system-architecture.md)

This document maps the **OWASP Top 10 (2021)** to controls already implemented in this project and states what every contributor must do before merging. The goal is a concrete, auditable checklist — not a general treatise on security.

---

## OWASP Top 10 (2021) — Project Mapping

### A01 — Broken Access Control

**Risk:** Authenticated endpoints are reachable without a valid JWT, or a user can act on another user's resource.

**Controls in place:**
- `JwtAuthGuard` is applied globally in `backend/src/app.module.ts`. Every route is protected by default.
- Routes that must be public are explicitly opted out with `@Public()` (`backend/src/common/decorators/public.decorator.ts`).
- The current user is injected via `@CurrentUser()` (`backend/src/common/decorators/current-user.decorator.ts`); controllers pass the subject to services rather than accepting it from the request body.

**Contributor must-do:**
- Never whitelist a route with `@Public()` unless it is genuinely unauthenticated (e.g., login, register, health).
- Perform ownership and role checks in the service layer, not the controller.
- When adding role-based access, use a guard or service-level check; do not rely on the client to omit fields.

---

### A02 — Cryptographic Failures

**Risk:** Passwords stored in plaintext or with weak hashes; secrets transmitted or logged in cleartext; cookies accessible to JavaScript.

**Controls in place:**
- Passwords are hashed with **argon2** (Argon2id), which includes a per-user random salt. See `backend/src/auth/auth.service.ts`.
- JWT access and refresh tokens are signed with `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`, loaded through the Joi-validated env schema (`backend/src/config/env-validation.schema.ts`). Secrets are never hardcoded.
- Auth cookies are issued with `HttpOnly`, `Secure` (in production), and `SameSite=Strict` flags. See `backend/src/auth/utils/cookie.ts`.
- `nestjs-pino` logs are configured to exclude PII. Cookie values and the `Authorization` header must never appear in log output.

**Contributor must-do:**
- Do not add any hash algorithm weaker than Argon2id for passwords. Do not use MD5, SHA-1, or bcrypt without explicit approval.
- Never commit secret values. All secrets go in `.env` (gitignored) and are documented in `.env.example`.
- Never log `password`, `token`, `refreshToken`, cookie header values, or any field containing PII.
- In production, always set `NODE_ENV=production`; the cookie utility reads this to enable the `Secure` flag.

---

### A03 — Injection

**Risk:** Malicious user input reaches SQL queries, command shells, or template engines without sanitisation.

**Controls in place:**
- All database access goes through **TypeORM** with parameterized queries. Raw SQL is avoided; if ever needed, TypeORM's `query()` method with bound parameters must be used.
- All incoming DTOs use `class-validator` with `whitelist: true` and `forbidNonWhitelisted: true` applied globally in `backend/src/main.ts`. Unknown properties are stripped and rejected.
- i18n translation keys are static constants, never constructed from user input.

**Contributor must-do:**
- Never build SQL strings via template literals or string concatenation.
- Every new endpoint that accepts a request body must have a DTO decorated with `class-validator` constraints.
- Do not use `eval()`, `new Function()`, or `require()` with a dynamic path.
- Keep `whitelist: true` and `forbidNonWhitelisted: true` in the global validation pipe. Do not override these per-route.

---

### A04 — Insecure Design

**Risk:** Security is retrofitted rather than designed in; threat modeling is skipped; the application has no concept of default-deny.

**Controls in place:**
- The global `JwtAuthGuard` enforces default-deny: all routes require authentication unless explicitly opted out.
- The project uses a module-based NestJS architecture that encourages explicit dependency declaration and bounded scopes.

**Contributor must-do:**
- For every new feature, spend five minutes on a threat model: who are the actors, what can they do, what is the worst-case misuse?
- Document threat model findings as comments in the relevant service or as a note in the PR description.
- Default to the most restrictive access level; relax only when there is a concrete user need.
- Never add a catch-all route handler (`*`) that bypasses the auth guard.

---

### A05 — Security Misconfiguration

**Risk:** Default credentials, verbose error messages, unnecessary features enabled, or missing HTTP security headers in production.

**Controls in place:**
- **Helmet** sets security-relevant HTTP response headers (CSP, HSTS, X-Frame-Options, etc.) in `backend/src/main.ts`.
- Environment variables are validated at boot using a **Joi schema** (`backend/src/config/env-validation.schema.ts`). The app fails fast if required secrets are missing.
- Swagger is gated by the `SWAGGER_ENABLED` env variable. It is disabled by default in production.
- TypeORM `synchronize: true` is blocked by a pre-commit script (`backend/scripts/no-synchronize-true.sh`) to prevent accidental schema mutations in production.
- CORS is configured with an explicit `CORS_ORIGINS` allow-list; wildcard + credentials is never enabled.

**Contributor must-do:**
- Do not set `synchronize: true` in any TypeORM data-source configuration. Use migrations (`backend/src/database/migrations/`).
- Do not set `SWAGGER_ENABLED=true` in production environments.
- If you add a new required env variable, add it to `.env.example` and the Joi validation schema.
- Review Helmet defaults before disabling any header (e.g., `contentSecurityPolicy`).

---

### A06 — Vulnerable Components

**Risk:** Outdated or compromised npm packages with known CVEs included in the production bundle.

**Controls in place:**
- Both `package-lock.json` files (backend + frontend) are committed to git to ensure reproducible installs.
- `npm audit` is expected in CI (see Phase 3 roadmap).

**Contributor must-do:**
- Run `npm audit` locally before pushing and resolve CRITICAL and HIGH severity findings.
- Do not add packages that use `eval`, dynamic `require`, or bundled native binaries without security review.
- Avoid version ranges like `*` or `>= 1` in `package.json`; use exact versions or narrow ranges.
- Do not use `npm audit fix --force` blindly in CI; a major version bump may introduce breaking changes.

---

### A07 — Identification & Authentication Failures

**Risk:** Weak password storage, missing brute-force protection, predictable session tokens, or no token revocation.

**Controls in place:**
- Passwords use **argon2** with a per-user salt; brute-forcing a hash is computationally expensive.
- Refresh tokens are stored and **rotated on every use** (`backend/src/auth/entities/refresh-token.entity.ts`, `backend/src/auth/auth.service.ts`). Reuse of an old refresh token must invalidate the session.
- Rate limiting is enforced globally via `@nestjs/throttler` (60 requests / 60 seconds by default, configured in `backend/src/app.module.ts`).
- **CSRF guard** (`backend/src/common/guards/csrf.guard.ts`) protects cookie-authenticated mutating requests (POST, PUT, PATCH, DELETE). Endpoints that should skip CSRF (e.g., webhooks) must use `@SkipCsrf()` (`backend/src/common/decorators/skip-csrf.decorator.ts`) with documented justification.
- The frontend implements the client-side half of double-submit CSRF: `frontend/src/lib/csrf.js` reads the `csrf_token` cookie and `frontend/src/lib/http.js` injects it as the `X-CSRF-Token` header on all write requests. Tokens are never stored in `localStorage`/`sessionStorage`.

**Contributor must-do:**
- Do not lower the throttler limits without a concrete reason and approval.
- Ensure logout invalidates the refresh token in the database, not just clears the cookie on the client.
- When adding new mutating cookie-authenticated endpoints, verify they are covered by `CsrfGuard` or explicitly exempted with `@SkipCsrf()` and a comment explaining why.
- Never return the raw refresh token value in a JSON response body; always use HttpOnly cookies.

---

### A08 — Software & Data Integrity

**Risk:** Unsigned migrations applied automatically; CDN assets loaded without integrity checks; supply-chain tampering.

**Controls in place:**
- All database schema changes go through TypeORM **migrations** (`backend/src/database/migrations/`) committed to git. No auto-apply at boot (`synchronize: false`).
- There are no auto-update endpoints (no self-update, no dynamic plugin loading).

**Contributor must-do:**
- Never use `synchronize: true` (enforced by pre-commit script, but do not circumvent it).
- When loading any JavaScript or CSS from a CDN, add a `integrity` attribute with the SHA-384 hash (Subresource Integrity).
- Migrations must be reviewed in PR like any other code change — they are irreversible DDL.
- Do not add endpoint logic that fetches and executes code from an external URL.

---

### A09 — Security Logging & Monitoring

**Risk:** Security events are not logged; logs contain secrets that become a secondary data breach vector.

**Controls in place:**
- **nestjs-pino** provides structured JSON logging with request correlation IDs.
- Authentication failures (invalid credentials, expired token, CSRF mismatch) produce log entries at WARN level.
- Privilege changes (role updates, admin actions) must be logged at INFO level with the acting user's ID.

**Contributor must-do:**
- Log authentication failures: invalid password attempt, JWT validation failure, CSRF violation.
- Log privilege-escalation events: role changes, admin overrides.
- **Never** include in logs: `password`, `hash`, `token`, `refreshToken`, cookie header, `Authorization` header, credit card numbers, or any field name that contains `secret`, `key`, or `credential`.
- Use `logger.warn()` for security events; use `logger.error()` only for unexpected server errors.
- When adding pino serializers or redaction config, ensure new sensitive fields are added to the redact list.

---

### A10 — Server-Side Request Forgery (SSRF)

**Risk:** A user-supplied URL is fetched by the backend, enabling internal network access, metadata endpoint exposure, or data exfiltration.

**Controls in place:**
- The current codebase does not perform outbound HTTP requests from user-supplied URLs. This section documents the policy for when such functionality is added.

**Contributor must-do (for future outbound HTTP features):**
- Maintain an explicit allow-list of permitted outbound hostnames. Reject any URL whose host is not on the list.
- Validate the URL scheme: only `https://` is permitted; reject `file://`, `ftp://`, `http://` (internal), and `gopher://`.
- Never pass a URL from a request body directly to `fetch()`, `axios.get()`, or equivalent without validation.
- Block requests to RFC 1918 private ranges (`10.x`, `172.16–31.x`, `192.168.x`) and loopback (`127.x`, `::1`).
- Log all outbound requests with the target host (not the full URL if it may contain secrets).

---

## Contributor Security Checklist

Copy this block into your PR description for any change that touches auth, middleware, guards, database queries, or external integrations.

```markdown
## Security checklist

- [ ] No new `@Public()` decorators unless the route is genuinely unauthenticated
- [ ] Ownership / role checks are in the service layer, not the controller
- [ ] New DTOs use `class-validator` with whitelist enabled
- [ ] No raw SQL template literals; TypeORM parameterized queries only
- [ ] No secrets, tokens, passwords, or PII in log output
- [ ] `npm audit` run locally; no unresolved CRITICAL/HIGH findings
- [ ] `synchronize: true` not present in any data-source config
- [ ] New env variables added to `.env.example` and Joi schema
- [ ] Mutating cookie-auth endpoints covered by CsrfGuard or explicitly exempted with justification
- [ ] Refresh token rotation logic intact (old token invalidated on reuse)
- [ ] CDN assets include SRI `integrity` attribute
- [ ] Migrations reviewed as DDL — not auto-applied at boot
```

---

*Last updated: 2026-05-22*
