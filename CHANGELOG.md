# Changelog

One entry per completed phase of [`TASKS.md`](TASKS.md), newest first. Format based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Phase 5 — Salary insights (2026-10-25)

### Added
- `GET /api/v1/insights/countries/{code}`: min, max, average and an exact median (two
  `percentile_disc`, numeric) with headcount; average by job title; headcount by department. Money in
  the country's currency, rounded once in Java to 2 decimals HALF_EVEN (ADR-017, ADR-021, ADR-047).
- A supported country with no active employees gives 200 with headcount 0, null stats and empty
  lists; an unsupported or lowercase code gives 404 `COUNTRY_NOT_FOUND`.
- `GET /api/v1/reference`: countries with currencies, departments with their titles, sorted, cacheable
  for an hour.
- `V3__create_app_settings.sql` and `GET`/`PUT /api/v1/settings`: the dashboard's default country (IN),
  with optimistic locking (ADR-028).

### Changed
- Contract: a settings save that changes nothing keeps its version (ADR-047).
- Promotions are only by fast-forward push; squash and rebase merging are off, so the merge button
  cannot split `main` from `stage` again (ADR-048).

## Phase 4 — Find employees (2026-10-25)

### Added
- `GET /api/v1/employees`: a paginated list with totals (default 20, at most 100), always ordered by
  the requested sort and then `id`, so pages never overlap (ADR-016, ADR-044).
- Search with `q`: name OR email, partial and case-insensitive, with `\`, `%` and `_` matched
  literally; served by the trigram indexes.
- Filters by country, department and job title, combined with AND and validated against the
  reference data.
- Sorting by `fullName`, `salary` or `hireDate`, ascending or descending.
- A query-plan report over 10,000 rows and `docs/PERFORMANCE.md`: every list shape runs in under
  4 ms on the server (ADR-045, ADR-046).

### Changed
- Contract: an unknown query parameter, or `sort` given twice, is a 400 (ADR-044).
- Roadmap: the phase 6 seed ends with `VACUUM ANALYZE`, because the trigram indexes are skipped
  until VACUUM merges newly inserted rows; the plans are re-checked on seeded stage.

## Phase 3 — Employee CRUD (2026-10-25)

### Added
- Schema and reference data as Flyway migrations `V1` and `V2`, with named constraints (ADR-036).
- `POST /api/v1/employees`: every field rule in one pass, strict JSON (unknown fields and string
  numbers rejected, text trimmed), currency derived from the country, ids from `employee_id_seq` in
  blocks of 50 (ADR-037).
- 409 `DUPLICATE_EMAIL` for an active email in any case, including two creates racing (ADR-038).
- `GET /api/v1/employees/{id}`, 404 for a missing or deleted employee (ADR-039).
- `PUT /api/v1/employees/{id}` with optimistic locking: 409 `STALE_VERSION` with the true current
  version, for a stale version or a lost race (ADR-041).
- `DELETE /api/v1/employees/{id}`: a soft delete in one conditional update, 204 then 404 (ADR-042).
- RFC 7807 Problem Details with a stable `code` for every error, including Spring's own and the
  `/error` page; 500s carry an `errorId` that is also in the log (ADR-043).
- JaCoCo coverage, angular-eslint and a Prettier check in CI (ADR-035).

### Changed
- Contract: a PUT that changes nothing keeps its version; the `{id}` operations gain a 400; two error
  codes (`UNSUPPORTED_MEDIA_TYPE`, `NOT_ACCEPTABLE`) and `errorId` added (ADR-041, ADR-043).
- Render builds both services from `backend/` without a root directory, so every green push deploys;
  before this, a push whose last commit touched only docs never deployed (ADR-040).

## Phase 2 — Design (2026-10-24)

### Added
- Data model for employees, countries (US, GB, IN, DE, FR), departments, job titles and settings:
  [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md).
- API contract, OpenAPI 3.1, under `/api/v1`: [`docs/openapi.yaml`](docs/openapi.yaml).
- Architecture diagrams for deployment, components and key flows: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
- UI design with routes, wireframes, user flows and states: [`docs/UI_DESIGN.md`](docs/UI_DESIGN.md).
- ADR-008 to ADR-029 in [`docs/DECISIONS.md`](docs/DECISIONS.md).
- A reviewer subagent for slices (`.claude/agents/reviewer.md`) and this changelog.

### Changed
- Scope: Settings (the default country for Insights) added to `REQUIREMENTS.md` (ADR-028).
- Working agreement: the engineer approves each slice's test list and every push; a reviewer agent
  checks tests and code before each commit (`CLAUDE.md`, `docs/WORKFLOW.md`).

## Phase 1 — Walking skeleton (2026-10-23, stage added 2026-10-24)

### Added
- Spring Boot 4 / Java 21 backend with Flyway, local Postgres through Docker Compose, and
  Testcontainers tests.
- Angular 21 frontend with Tailwind and PrimeNG.
- GitHub Actions CI for the backend and frontend tests.
- Deployed to Neon (database), Render (API) and Vercel (frontend); CORS restricted to the configured origin.
- A live health page proving browser → API → database end to end.
- A deployed stage environment in front of production (ADR-030 to ADR-033): a `stage` branch, a
  second Render service and a Neon branch database. The health page now names its environment.
- A ruleset on `main`: PR, green CI and linear history required, with an admin bypass for promotion.

### Changed
- The production API deploys only after CI passes on the commit, as stage does (ADR-034).

## Phase 0 — Foundation (2026-10-23)

### Added
- Repository structure, `REQUIREMENTS.md`, `CLAUDE.md`, `docs/WORKFLOW.md`, the AI usage log, the
  prompt log and the roadmap.
