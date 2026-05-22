# Contributing Guide

## Branch Model

| Branch | Purpose |
|--------|---------|
| `develop` | Integration branch — all feature PRs target here |
| `feature/<slug>` | New features, branched from `develop` |
| `fix/<slug>` | Bug fixes, branched from `develop` |
| `chore/<slug>` | Non-functional changes (deps, config) |

1. Fork or branch from `develop`.
2. Keep branches short-lived and focused on one concern.
3. Open a PR back to `develop`.

## Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <short summary>

[optional body]
```

Allowed types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.

Rules:
- No AI co-author lines in commit messages.
- Summary in present tense, ≤72 chars.
- Reference issue numbers in the body when relevant.

## Local Dev Quick Path

Requirements: Docker + Docker Compose (no host Node required for running the stack).

```bash
# 1. Copy env files
cp .env.backend.example .env.backend
cp .env.frontend.example .env.frontend
cp .env.mysql.example .env.mysql
cp .env.test.mysql.example .env.test.mysql

# 2. Edit secrets in each .env.* file before starting

# 3. Start all services
docker compose up

# 4. Wait until mysql is healthy, then:
docker compose exec backend npm run migration:run

# 5. (Optional) seed initial data
docker compose exec backend npm run console -- seed
```

See [docs/getting-started.md](docs/getting-started.md) for a full walkthrough.

## File & Code Standards

- **File size:** ≤200 LOC per source file; split when approaching limit.
- **Naming:** kebab-case for filenames.
- **Principles:** YAGNI, KISS, DRY.
- **Lint:** run `npm run lint` in `backend/` before committing.
- **No secrets:** never commit `.env.*` files or credentials.

## Code Review Expectations

- Reviewers respond within one working day.
- Address all requested changes or explain why you disagree.
- Squash fixup commits before merge when asked.
- The PR author is responsible for resolving conflicts.

## PR Checklist

Copy-paste this block into your PR description:

```markdown
## PR Checklist

- [ ] Branch is up-to-date with `develop`
- [ ] `npm run lint` passes with no new errors (backend)
- [ ] Unit tests pass: `npm run test` (backend)
- [ ] Integration tests pass: `npm run test:int` (backend)
- [ ] No `.env.*` files or secrets included
- [ ] Docs updated if public behavior changed (API, env vars, scripts)
- [ ] Migrations included if schema changed
- [ ] PR title follows Conventional Commits format
```
