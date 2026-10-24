# TASKS.md — Build Roadmap

Each task = one focused AI session + its own commits. Finish a phase before starting the next.
Build tasks follow the TDD loop: `test:` (failing) → `feat:` (pass) → `refactor:` (optional).

**Build order:** the environment comes first. Phase 1 puts a health-check-only app live on both tiers —
local Postgres, CI, Neon, Render, Vercel — *before* any domain code exists. Deployment and database
connectivity are where this kind of project actually breaks, so they fail loudly on day one rather than
the night before submission. Design (phase 2) then happens against a pipeline that already works.

---

## Phase 0 — Foundation
- [x] **0.1** Create repo (`backend/`, `frontend/`, `docs/`), add `.gitignore`, `README.md` stub
- [x] **0.2** Commit `REQUIREMENTS.md`
- [x] **0.3** Commit `docs/WORKFLOW.md` and `CLAUDE.md`
- [x] **0.4** Add `docs/AI_USAGE.md`, `docs/prompts/`, this `TASKS.md`

**Done when:** repo explains *how* you'll work before any code exists.

---

## Phase 1 — Walking skeleton: local and deployed
No domain logic in this phase. A health endpoint and a page that reads it, wired end to end.

- [x] **1.1** Scaffold Spring Boot 4 / Java 21 (webmvc, validation, data-jpa, flyway, actuator, postgres)
- [x] **1.2** `docker-compose.yml` for local Postgres; config via env vars
- [x] **1.3** Testcontainers base test class; smoke test that boots the context and proves Flyway ran
      (no migration files yet — the history table alone proves connectivity and write access)
- [x] **1.4** GitHub Actions CI: run backend tests on every push
- [x] **1.5** Scaffold Angular (standalone, signals) + Tailwind + PrimeNG, routing, environment config,
      CI job for `ng test`
- [x] **1.6** Neon Postgres instance; connection wiring via env vars
- [x] **1.7** Backend `Dockerfile`; deploy to Render with env vars
- [x] **1.8** Deploy frontend to Vercel; configure API URL per environment
- [x] **1.9** CORS restricted to the frontend origin, origins supplied by env var (Vercel previews get
      generated URLs, so this cannot be hardcoded)
- [x] **1.10** Live health page green end to end; note Render cold-start behaviour in `README.md`

**Done when:** a push to `main` reaches production on both tiers and the live page proves the backend
can reach its database.

---

## Phase 2 — Design
- [x] **2.1** Data model: `employee` table, columns, constraints, indexes; supported countries + currencies → `docs/DATA_MODEL.md`
- [ ] **2.2** API contract: endpoints, request/response shapes, error format → `docs/api.md` (or `openapi.yaml`)
- [ ] **2.3** ADRs in `docs/DECISIONS.md`: stack, Postgres over SQLite, BigDecimal money, SQL aggregations, optimistic locking, monorepo, hosting
- [ ] **2.4** Architecture diagram → `docs/ARCHITECTURE.md`

**Done when:** Claude Code could build the backend from the docs alone.

---

## Phase 3 — Employee CRUD (one slice per task)
- [ ] **3.1** Flyway `V1__create_employee.sql` (table + indexes)
- [ ] **3.2** Create employee — validation rules (required fields, email format, salary > 0, hire date not future, supported country); currency derived from country
- [ ] **3.3** Duplicate email → 409
- [ ] **3.4** Get employee by id; missing → 404
- [ ] **3.5** Update employee with optimistic locking (`version`); stale update → 409
- [ ] **3.6** Delete employee → 204; subsequent get → 404
- [ ] **3.7** Global error handling: RFC 7807 Problem Details, malformed JSON → 400, no stack traces

**Done when:** all CRUD scenarios from the test bank pass.

---

## Phase 4 — Find employees
- [ ] **4.1** Paginated list: default size, max size cap, page past end → empty with correct total
- [ ] **4.2** Search by name/email (partial, case-insensitive)
- [ ] **4.3** Filters: country, job title, department (combinable)
- [ ] **4.4** Sorting with whitelisted fields; unknown field → 400
- [ ] **4.5** Verify query plans use indexes (note results in `docs/PERFORMANCE.md`)

---

## Phase 5 — Salary insights
- [ ] **5.1** Country salary stats: min, max, avg (2dp), median (odd/even), headcount
- [ ] **5.2** Average salary by job title within a country
- [ ] **5.3** Headcount by department within a country
- [ ] **5.4** Edge cases: country with no employees → empty result; single employee → min = max = avg
- [ ] **5.5** Reference endpoint: supported countries, currencies, job titles, departments (feeds UI dropdowns)

**Done when:** insight results match a small hand-calculated fixture.

---

## Phase 6 — Seeding
- [ ] **6.1** Deterministic generator (fixed random seed): realistic names, titles, departments, country-appropriate salary ranges
- [ ] **6.2** Idempotent seed runner: exactly 10,000 rows, rerun creates no duplicates
- [ ] **6.3** Batch inserts; measure and record seed time in `docs/PERFORMANCE.md`
- [ ] **6.4** Run the seed once against the production database

---

## Phase 7 — Frontend features
- [ ] **7.1** API client services + typed models
- [ ] **7.2** Employee list: server-side paging, debounced search, filters, sorting, filters synced to URL
- [ ] **7.3** Employee form (create/edit): validation mirroring backend, 409 conflict handling
- [ ] **7.4** Delete with confirmation
- [ ] **7.5** Insights dashboard: country picker, stats cards, by-job-title chart/table, department headcount
- [ ] **7.6** Loading, empty and error states everywhere — including an honest message while Render wakes
- [ ] **7.7** One or two Playwright E2E happy paths

---

## Phase 8 — Docs & submission
- [ ] **8.1** `README.md`: what it is, live links, run locally, run tests, seed
- [ ] **8.2** Finalize `docs/PERFORMANCE.md` and `docs/DECISIONS.md`
- [ ] **8.3** Finalize `docs/AI_USAGE.md`: how AI was used, prompts, where it was wrong and how you caught it
- [ ] **8.4** Smoke test the live app end to end as a reviewer would
- [ ] **8.5** Record ~3-min demo video; link in README
- [ ] **8.6** Read the commit history top to bottom as a reviewer would
- [ ] **8.7** Reply to the original email with the repo link
