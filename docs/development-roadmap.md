# Development Roadmap

> Last updated: 2026-05-22
> Cross-link: [project-changelog.md](project-changelog.md)

This document tracks project phases, scope, and exit criteria. Phase 0 reflects the current state of the repository. Phases 1–4 are planned and unstarted.

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| ✅ Complete | Merged and verified |
| 🔄 In progress | Active development |
| ⏳ Not started | Planned, no work begun |
| 🚫 Blocked | Waiting on a dependency |

---

## Phase 0 — Baseline ✅ Complete

**Completed:** 2026-05-22
**Change history:** [project-changelog.md — v0.1.0](project-changelog.md)

### Scope

- NestJS 11 backend scaffolding with module-based architecture
- Auth module: JWT access + refresh tokens, argon2 password hashing, HttpOnly cookie issuance, refresh-token rotation
- CSRF guard for cookie-authenticated mutating requests
- Users module: registration, login, profile retrieval
- i18n: `vi` (default) + `en`, Joi-validated `DEFAULT_LOCALE` env
- Helmet, CORS allow-list, Throttler (60 req/min), nestjs-pino structured logging
- Swagger UI (gated by `SWAGGER_ENABLED`)
- TypeORM + MySQL 8 with migrations; `synchronize: true` blocked by pre-commit script
- Health endpoint
- Seed command
- React 17 (CRA) frontend shell — bootstrapped, no domain screens yet
- Docker Compose: `mysql` (port 3306) + `mysql_test` (port 3307) services
- Contributing guide, code standards, security guidelines, design guidelines, system architecture, codebase summary, getting started docs

### Exit Criteria (met)

- [x] Backend starts and passes all unit tests
- [x] Auth flow (register → login → refresh → logout) exercised by integration tests
- [x] `docker-compose up` brings up backend + MySQL without manual steps
- [x] Swagger accessible at `/api` when `SWAGGER_ENABLED=true`
- [x] Pre-commit hook blocks `synchronize: true`

### Owner

Backend: BE team. Frontend shell: FE team. Docs: doc-writer agent.

---

## Phase 1 — School Uniform Domain MVP ⏳ Not started

### Scope

- **Domain entities:** `Product`, `Category`, `Order`, `OrderItem`, `School` — TypeORM entities + migrations
- **CRUD APIs:** RESTful endpoints for each entity; admin-scoped routes protected by role guard
- **Admin UI screens:** product list, product form (create/edit), category management, order list with status filter
- **Frontend catalog flow:** school selection → product browsing by category → product detail page
- **Frontend cart flow:** add to cart → cart review → checkout form → order confirmation
- **Image upload:** product images stored in object storage (strategy TBD: local S3-compatible or cloud)
- **Seed data:** sample schools, categories, and products for local development

### Exit Criteria

- [ ] All domain entities have migrations and pass `typeorm migration:run` cleanly
- [ ] CRUD API endpoints return correct HTTP status codes and validated payloads
- [ ] Admin can create, update, and soft-delete a product through the UI
- [ ] A student can browse products by school + category and place an order
- [ ] Unit tests cover service layer; integration tests cover all API routes
- [ ] Lighthouse score does not regress below Phase 0 baseline

### Owner

TBD (Phase 1 team assignment).

---

## Phase 2 — Auth UX & Profile ⏳ Not started

### Scope

- **Login page:** email + password form, redirect to intended route after login, error states
- **Register page:** form with client-side + server-side validation, success redirect
- **Profile page:** display user info, edit display name, change password flow
- **Password reset flow:** forgot-password email trigger → token link → new-password form
- **Email integration:** transactional email provider (SendGrid or SMTP), email templates in `vi` + `en`
- **Session UX:** auto-refresh of access token on expiry; redirect to login on refresh failure
- **Remember me:** configurable refresh-token TTL based on user preference

### Exit Criteria

- [ ] User can complete full register → login → profile edit → logout cycle in the browser
- [ ] Password reset email delivers within 60 seconds in staging
- [ ] All auth pages meet WCAG 2.1 AA (verified with axe-core)
- [ ] Refresh token auto-renewal transparent to the user (no unexpected logout mid-session)
- [ ] Email templates render correctly in Vietnamese and English

### Owner

TBD (Phase 2 team assignment).

---

## Phase 3 — Hardening & CI ⏳ Not started

### Scope

- **GitHub Actions pipeline:** lint → unit test → build → Docker image build → `npm audit` → image scan (Trivy or Snyk)
- **Lighthouse CI:** performance and accessibility gates on every FE PR
- **Dependabot:** automated dependency update PRs for npm (backend + frontend)
- **SBOM generation:** CycloneDX or SPDX SBOM artifact attached to each release
- **Kubernetes manifests:** Deployment, Service, ConfigMap, Secret templates for backend + frontend
- **Horizontal scaling config:** `minReplicas: 2` for backend; `resources.requests/limits` set
- **Database migration job:** Kubernetes `Job` that runs `typeorm migration:run` before the backend rolls out
- **E2E tests:** Playwright smoke suite covering the Phase 1 + Phase 2 critical paths

### Exit Criteria

- [ ] All PRs blocked from merge if any CI step fails
- [ ] `npm audit` blocks merge on CRITICAL/HIGH CVEs
- [ ] Docker image scan passes with zero CRITICAL vulnerabilities
- [ ] SBOM artifact present in GitHub release assets
- [ ] k8s manifests deploy successfully to a local `kind` cluster
- [ ] Dependabot PRs open automatically within 24 hours of a new vulnerable version

### Owner

TBD (Phase 3 team / DevOps).

---

## Phase 4 — Production Deploy ⏳ Not started

### Scope

- **Reverse proxy:** Nginx or Caddy with TLS termination; HTTPS enforced; HTTP → HTTPS redirect
- **TLS:** automated certificate issuance via Let's Encrypt (cert-manager on k8s) or managed cert
- **Observability stack:**
  - Metrics: Prometheus scrape from NestJS metrics endpoint + Node.js runtime metrics
  - Dashboards: Grafana with panels for request rate, error rate, p99 latency, DB connection pool
  - Tracing: OpenTelemetry SDK → Jaeger or Tempo
  - Log aggregation: Loki + Grafana (or equivalent); pino JSON logs forwarded from k8s pods
- **Alerting:** PagerDuty or alertmanager rules for error-rate spike, high p99 latency, pod crash-loop
- **Backup:** automated MySQL backups (daily snapshot + 7-day retention); restore drill documented
- **Runbook:** documented procedures for deploy, rollback, DB migration failure, certificate renewal

### Exit Criteria

- [ ] HTTPS enforced; HTTP requests redirect to HTTPS
- [ ] TLS certificate auto-renews without manual intervention
- [ ] Grafana dashboard shows real traffic after first production deploy
- [ ] P99 API latency alert fires in staging simulation when latency exceeds 1 s for 5 min
- [ ] DB restore from backup verified in a dry-run exercise
- [ ] Runbook reviewed and approved by at least two team members

### Owner

TBD (Phase 4 team / DevOps).

---

*For detailed change history see [project-changelog.md](project-changelog.md).*
