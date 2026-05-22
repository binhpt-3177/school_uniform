# Codebase Summary

For architecture diagrams and data flow, see [system-architecture.md](system-architecture.md).

## Docker Compose Services

| Service | Image / Build | Host Port | Purpose |
|---------|--------------|-----------|---------|
| `mysql` | `mysql:8.0` | `3306` | Primary application database |
| `mysql_test` | `mysql:8.0` | `3307` | Isolated database for integration tests |
| `backend` | `./backend` (target: `dev`) | `3000` | NestJS 11 REST API |
| `frontend` | `./frontend/dev.Dockerfile` | `5000` | React 17 dev server |

`backend` depends on `mysql` (health-checked). `frontend` depends on `mysql` and `backend`.

## Environment File Map

| File | Consumed by | Purpose |
|------|------------|---------|
| `.env.backend` | `backend` service | API config, DB credentials, JWT secrets, CORS |
| `.env.frontend` | `frontend` service | Dev server port; runtime `REACT_APP_API_URL` via `entrypoint.sh` |
| `.env.mysql` | `mysql` service | Primary DB root password and initial schema |
| `.env.test.mysql` | `mysql_test` service | Integration test DB credentials |

Copy each from its `.example` counterpart before first run. See [getting-started.md](getting-started.md) for the full variable reference.

## Backend Directory Tree (`backend/src/`)

```
backend/src/
├── auth/                   # JWT authentication (login, refresh, logout)
│   ├── dto/                # Request/response DTOs for auth endpoints
│   ├── entities/           # RefreshToken entity
│   ├── guards/             # JWT access & refresh guards
│   ├── strategies/         # Passport JWT strategies
│   └── utils/              # Token helper utilities
├── users/                  # User CRUD and profile management
│   ├── dto/                # User request/response DTOs
│   └── entities/           # User entity
├── health/                 # GET /health endpoint (liveness check)
├── database/               # TypeORM data source, migrations
│   └── migrations/         # Generated migration files
├── common/                 # Shared infrastructure (no business logic)
│   ├── decorators/         # Custom parameter and method decorators
│   ├── dto/                # Shared DTOs (pagination, error shapes)
│   ├── entities/           # Base entity with common columns
│   ├── filters/            # Global exception filters
│   ├── guards/             # Shared guards (e.g. throttler)
│   ├── interceptors/       # Response transform interceptors
│   └── utils/              # Pure utility functions
├── config/                 # Joi-validated env config factory
├── commands/               # nestjs-command CLI commands (seed)
└── i18n/                   # nestjs-i18n translation files
    ├── en/                 # English translations
    └── vi/                 # Vietnamese translations (default locale)
```

Key entry points:

- `main.ts` — bootstraps the NestJS application, applies global pipes, filters, Swagger
- `app.module.ts` — root module wiring all feature modules
- `console.ts` — CLI entry point for `nestjs-command` (seed scripts)
- `database/data-source-cli.ts` — TypeORM DataSource used by migration CLI scripts

## Frontend Directory Tree (`frontend/src/`)

```
frontend/src/
├── index.js            # React DOM render entry point
├── index.css           # Global styles
├── App.js              # Root application component
├── App.css             # App-level styles
└── reportWebVitals.js  # CRA web vitals reporting hook
```

The frontend is a minimal Create React App shell. At production build time, `entrypoint.sh` generates `/usr/share/nginx/html/env.js` which exposes `window.env.REACT_APP_API_URL` for runtime API URL injection without rebuild.

## Backend npm Scripts Reference

| Script | Command | Use |
|--------|---------|-----|
| `start:dev` | `nest start --watch` | Hot-reload dev server |
| `build` | `nest build` | Compile to `dist/` |
| `lint` | `eslint ... --fix` | Lint and auto-fix (also checks for `synchronize: true`) |
| `test` | `jest` | All unit tests |
| `test:unit` | `jest --config jest.config.js` | Unit tests only |
| `test:int` | `jest --config jest.int.config.js --runInBand` | Integration tests against `mysql_test` |
| `test:cov` | `jest --config jest.config.js --coverage` | Unit test coverage report |
| `migration:run` | TypeORM CLI run | Apply pending migrations |
| `migration:generate` | TypeORM CLI generate | Generate migration from entity diff |
| `migration:revert` | TypeORM CLI revert | Revert last migration |
| `migration:create` | TypeORM CLI create | Create empty migration file |
| `migration:show` | TypeORM CLI show | List applied/pending migrations |
| `console` | `ts-node src/console.ts` | Run nestjs-command CLI (e.g. seed) |

Run all scripts inside the container:
```bash
docker compose exec backend npm run <script>
```
