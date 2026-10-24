# Changelog

One entry per completed phase of [`TASKS.md`](TASKS.md), newest first. Format based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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

## Phase 0 — Foundation (2026-10-23)

### Added
- Repository structure, `REQUIREMENTS.md`, `CLAUDE.md`, `docs/WORKFLOW.md`, the AI usage log, the
  prompt log and the roadmap.
