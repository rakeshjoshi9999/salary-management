# TASKS.md — Build Roadmap

Each task = one focused AI session + its own commits. Finish a phase before starting the next.
Build tasks follow the TDD loop: `test:` (failing) → `feat:` (pass) → `refactor:` (optional).

---

## Phase 0 — Foundation
- [ ] **0.1** Create repo (`backend/`, `frontend/`, `docs/`), add `.gitignore`, `README.md` stub
- [ ] **0.2** Commit `REQUIREMENTS.md`
- [ ] **0.3** Commit `docs/WORKFLOW.md` and `CLAUDE.md`
- [ ] **0.4** Add `docs/AI_USAGE.md`, `docs/prompts/`, this `TASKS.md`

**Done when:** repo explains *how* you'll work before any code exists.

---

## Phase 1 — Design
- [ ] **1.1** Data model: `employee` table, columns, constraints, indexes; supported countries + currencies
- [ ] **1.2** API contract: endpoints, request/response shapes, error format → `docs/api.md` (or `openapi.yaml`)
- [ ] **1.3** ADRs in `docs/DECISIONS.md`: stack, Postgres over SQLite, BigDecimal money, SQL aggregations, optimistic locking, monorepo, hosting
- [ ] **1.4** Architecture diagram → `docs/ARCHITECTURE.md`

**Done when:** Claude Code could build the backend from the docs alone.

---

## Phase 2 — Backend skeleton
- [ ] **2.1** Scaffold Spring Boot 3 / Java 21 (web, validation, data-jpa, flyway, actuator, postgres)
- [ ] **2.2** `docker-compose.yml` for local Postgres; config via env vars
- [ ] **2.3** Flyway `V1__create_employee.sql` (table + indexes)
- [ ] **2.4** Testcontainers base test class; one smoke test that boots the context
- [ ] **2.5** GitHub Actions CI: run backend tests on every push

**Done when:** `mvn test` is green locally and in CI.

---

## Phase 3 — Employee CRUD (one slice per task)
- [ ] **3.1** Create employee — validation rules (required fields, email format, salary > 0, hire date not future, supported country); currency derived from country
- [ ] **3.2** Duplicate email → 409
- [ ] **3.3** Get employee by id; missing → 404
- [ ] **3.4** Update employee with optimistic locking (`version`); stale update → 409
- [ ] **3.5** Delete employee → 204; subsequent get → 404
- [ ] **3.6** Global error handling: RFC 7807 Problem Details, malformed JSON → 400, no stack traces

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

---

## Phase 7 — Frontend
- [ ] **7.1** Scaffold Angular (standalone, signals), component library, routing, environment config, CI job for `ng test`
- [ ] **7.2** API client services + typed models
- [ ] **7.3** Employee list: server-side paging, debounced search, filters, sorting, filters synced to URL
- [ ] **7.4** Employee form (create/edit): validation mirroring backend, 409 conflict handling
- [ ] **7.5** Delete with confirmation
- [ ] **7.6** Insights dashboard: country picker, stats cards, by-job-title chart/table, department headcount
- [ ] **7.7** Loading, empty and error states everywhere
- [ ] **7.8** One or two Playwright E2E happy paths

---

## Phase 8 — Deploy
- [ ] **8.1** Backend `Dockerfile`; managed Postgres (e.g. Neon)
- [ ] **8.2** Deploy backend to Render; env vars; run seed once
- [ ] **8.3** Deploy frontend to Vercel; configure API URL
- [ ] **8.4** CORS restricted to the frontend origin
- [ ] **8.5** Smoke test the live app end to end; note cold-start behavior in README

---

## Phase 9 — Docs & submission
- [ ] **9.1** `README.md`: what it is, live links, run locally, run tests, seed
- [ ] **9.2** Finalize `docs/PERFORMANCE.md` and `docs/DECISIONS.md`
- [ ] **9.3** Finalize `docs/AI_USAGE.md`: how AI was used, prompts, where it was wrong and how you caught it
- [ ] **9.4** Record ~3-min demo video; link in README
- [ ] **9.5** Read the commit history top to bottom as a reviewer would
- [ ] **9.6** Reply to the original email with the repo link
