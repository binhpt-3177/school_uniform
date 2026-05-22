# Getting Started

## Prerequisites

| Tool | Required | Notes |
|------|----------|-------|
| Docker + Docker Compose | Yes | v24+ recommended |
| Node.js ≥ 20 | No | Only needed for running scripts outside Docker |
| Make | No | No Makefile present; plain `docker compose` commands used |

## 1. Copy Environment Files

Four env files must exist at the repo root before starting:

```bash
cp .env.backend.example  .env.backend
cp .env.frontend.example .env.frontend
cp .env.mysql.example    .env.mysql
cp .env.test.mysql.example .env.test.mysql
```

Edit each file and replace placeholder secrets (JWT secrets, passwords) before first run.

### Backend env vars (`.env.backend`)

| Variable | Default | Purpose |
|----------|---------|---------|
| `NODE_ENV` | `development` | Runtime environment |
| `PORT` | `3000` | HTTP port the API listens on |
| `DB_HOST` | `mysql` | Primary MySQL hostname (Compose service name) |
| `DB_PORT` | `3306` | Primary MySQL port |
| `DB_USER` | `app` | Primary MySQL user |
| `DB_PASSWORD` | `apppass` | Primary MySQL password — **change this** |
| `DB_NAME` | `app` | Primary database name |
| `TEST_DB_HOST` | `mysql_test` | Integration test MySQL hostname |
| `TEST_DB_PORT` | `3306` | Integration test MySQL port |
| `TEST_DB_USER` | `app` | Integration test MySQL user |
| `TEST_DB_PASSWORD` | `apppass` | Integration test MySQL password |
| `TEST_DB_NAME` | `app_test` | Integration test database name |
| `JWT_ACCESS_SECRET` | `change-me-access` | JWT access token signing key — **change this** |
| `JWT_REFRESH_SECRET` | `change-me-refresh` | JWT refresh token signing key — **change this** |
| `JWT_ACCESS_TTL` | `15m` | Access token lifetime |
| `JWT_REFRESH_TTL` | `7d` | Refresh token lifetime |
| `COOKIE_DOMAIN` | `localhost` | Cookie scope |
| `CORS_ORIGINS` | `http://localhost:5000` | Allowed CORS origins |
| `SWAGGER_ENABLED` | `true` | Enables Swagger UI at `/api` |
| `LOG_LEVEL` | `debug` | Pino log level |
| `DEFAULT_LOCALE` | `vi` | Default i18n locale |

### Frontend env vars (`.env.frontend`)

| Variable | Purpose |
|----------|---------|
| `PORT` | Dev server port (default `5000`) |

> Note: At runtime (production Nginx build) the frontend reads `REACT_APP_API_URL` injected by `entrypoint.sh` into `window.env`. Set this in `.env.frontend` for the dev container if needed.

### MySQL env vars (`.env.mysql` / `.env.test.mysql`)

| Variable | Purpose |
|----------|---------|
| `MYSQL_ROOT_PASSWORD` | Root password — **change this** |
| `MYSQL_DATABASE` | Database to create on init |
| `MYSQL_USER` | Application user |
| `MYSQL_PASSWORD` | Application user password |

## 2. Start All Services

```bash
docker compose up
```

This starts four services in dependency order:

| Service | Port (host) | Waits for |
|---------|------------|-----------|
| `mysql` | `3306` | — |
| `mysql_test` | `3307` | — |
| `backend` | `3000` | `mysql` healthy |
| `frontend` | `5000` | `mysql`, `backend` |

The backend will not start until the MySQL healthcheck passes (up to ~100 s on first run while MySQL initialises).

## 3. Run Migrations

Once the backend is up (you should see NestJS startup logs):

```bash
docker compose exec backend npm run migration:run
```

## 4. Seed Initial Data (Optional)

```bash
docker compose exec backend npm run console -- seed
```

## 5. Verify the Stack

```bash
# Health check
curl http://localhost:3000/health
# Expected: {"status":"ok",...}

# Swagger UI (if SWAGGER_ENABLED=true)
open http://localhost:3000/api

# Frontend
open http://localhost:5000
```

## Troubleshooting

**Port already in use**
Another process is bound to 3000, 3306, 3307, or 5000. Stop it or change the host-side port in `docker-compose.yml`.

**Backend crashes immediately with "ConfigValidationError"**
A required env var is missing or has an invalid value in `.env.backend`. Check the error message for the exact key and fix `.env.backend`.

**MySQL healthcheck keeps retrying / backend never starts**
MySQL initialisation can take 30–90 s on first run. Wait or watch with:
```bash
docker compose logs -f mysql
```
If it never becomes healthy, check `MYSQL_ROOT_PASSWORD` matches in `.env.mysql`.

**`migration:run` fails with "Access denied"**
`DB_USER`/`DB_PASSWORD` in `.env.backend` do not match `MYSQL_USER`/`MYSQL_PASSWORD` in `.env.mysql`. Align them.

---

Next: [codebase-summary.md](codebase-summary.md) — directory layout and module overview.
