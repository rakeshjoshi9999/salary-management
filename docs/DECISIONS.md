# Architecture Decision Records

Each decision: context, options considered, decision, and consequences.

## How a decision gets made

No architectural choice is made silently, and none is made by the AI alone. Before a task starts, the
AI surfaces every decision the task forces and presents **at least two real options** with concrete
trade-offs — performance, complexity, testability, operational cost, and what each option makes hard
later — plus a recommendation and the reasoning behind it. The engineer chooses. Only then is the
decision recorded here. The full rule lives in [`../CLAUDE.md`](../CLAUDE.md) under "How we work".

This file is **append-only**. An ADR is never edited away once decided; a decision that changes gets a
new ADR that supersedes the old one and links back to it, so the reasoning at the time stays readable.

Numbering is sequential (`ADR-001`, `ADR-002`, …) in the order decided, never renumbered.
Status is one of: `Accepted` · `Superseded by ADR-NNN` · `Deprecated`.

## Template

```markdown
## ADR-NNN — <short title in plain language>

- **Date:** YYYY-MM-DD
- **Status:** Accepted
- **Task:** <TASKS.md id, e.g. 1.3>

### Context
What forced a decision here? The constraint or requirement driving it, with a link to the relevant
part of REQUIREMENTS.md. What would break if we chose badly.

### Options considered
| Option | For | Against |
|---|---|---|
| **A — <name>** | … | … |
| **B — <name>** | … | … |

### Decision
Option X, because … (the reason, not a restatement of the option).

### Consequences
- What this makes easy, and what it now makes hard or expensive.
- What we accept as a known cost.
- What would make us revisit this — the signal to watch for.
```

## Index

| ADR | Decision | Status | Date |
|---|---|---|---|
| ADR-001 | Walking skeleton before design | Accepted | 2026-10-23 |
| ADR-002 | Neon for managed Postgres | Accepted | 2026-10-23 |
| ADR-003 | Direct cross-origin calls, env-driven CORS | Accepted | 2026-10-23 |
| ADR-004 | Accept Render free-tier cold starts | Accepted | 2026-10-23 |
| ADR-005 | Tailwind + PrimeNG | Accepted | 2026-10-23 |
| ADR-006 | Spring Boot 4 over Spring Boot 3 | Accepted | 2026-10-23 |
| ADR-007 | Angular 21 over Angular 20 (Vitest advisories) | Accepted | 2026-10-23 |
| ADR-008 | Reference data in tables, joined by natural keys | Accepted | 2026-10-24 |
| ADR-009 | Employee keys and column types | Accepted | 2026-10-24 |
| ADR-010 | Validation in both layers; hire-date rules | Accepted | 2026-10-24 |
| ADR-011 | Soft delete with `deleted_at` | Accepted | 2026-10-24 |
| ADR-012 | Indexes created up front, all partial | Accepted | 2026-10-24 |
| ADR-013 | Hand-written OpenAPI contract under `/api/v1` | Accepted | 2026-10-24 |
| ADR-014 | Write semantics: PUT, version in body, strict input | Accepted | 2026-10-24 |
| ADR-015 | Money as a JSON number | Accepted | 2026-10-24 |
| ADR-016 | List query: page/size, single sort, one search box | Accepted | 2026-10-24 |
| ADR-017 | One combined insights call; exact median | Accepted | 2026-10-24 |
| ADR-018 | Problem Details with stable codes | Accepted | 2026-10-24 |
| ADR-019 | Stack: Java 21, Spring Boot 4, Angular | Accepted | 2026-10-24 |
| ADR-020 | PostgreSQL over SQLite and MySQL | Accepted | 2026-10-24 |
| ADR-021 | Money as plain `BigDecimal` with one rounding helper | Accepted | 2026-10-24 |
| ADR-022 | Aggregations in SQL through `JdbcClient` | Accepted | 2026-10-24 |
| ADR-023 | Optimistic locking: `@Version` plus an explicit check | Accepted | 2026-10-24 |
| ADR-024 | Monorepo | Accepted | 2026-10-24 |
| ADR-025 | Render and Vercel for hosting | Accepted | 2026-10-24 |
| ADR-026 | Code structure: feature packages, one-way dependencies | Accepted | 2026-10-24 |
| ADR-027 | UI: Insights landing, Catalog with a drawer, responsive | Accepted | 2026-10-24 |
| ADR-028 | Backend settings for the default country (scope addition) | Accepted | 2026-10-24 |
| ADR-029 | Chart.js for the department doughnut | Accepted | 2026-10-24 |
| ADR-030 | A deployed `stage` branch in front of `main` | Accepted | 2026-10-24 |
| ADR-031 | Building the stage environment | Accepted | 2026-10-24 |
| ADR-032 | Creating the stage Render service through `main` | Accepted | 2026-10-24 |
| ADR-033 | Stage stays behind Vercel's login | Accepted | 2026-10-24 |
| ADR-034 | Production deploys only after CI passes | Accepted | 2026-10-24 |

---

## Decisions

## ADR-001 — Build the environment before the domain

- **Date:** 2026-10-23
- **Status:** Accepted
- **Task:** 1.1-1.10, and the renumbering of `TASKS.md`

### Context
`REQUIREMENTS.md` requires a publicly deployed app, and the submission is judged by clicking a live
URL. The original roadmap built the domain first and deployed in the final phase. Every unknown that
can sink that plan - Render-to-Neon TLS, connection limits, CORS against generated Vercel preview
URLs, cold starts, env-var wiring - stays invisible until someone actually deploys. Discovering them
in the last phase means debugging infrastructure in the same week as the demo video.

### Options considered
| Option | For | Against |
|---|---|---|
| **A - Design first, deploy last** (original roadmap) | Each phase is cohesive; one deployment, of a finished app | All deployment risk lands at the end, under time pressure |
| **B - Walking skeleton: health endpoint only** | Pipeline proven on day one; every later push is continuously deployed | A phase with no user-visible value |
| **C - Walking skeleton that also proves the database** | Catches the failure that actually happens: the app boots but cannot reach its database | Flyway and Testcontainers configured before any schema exists |

### Decision
Option C. Phase 1 deploys a health endpoint and a page that reads it, with Flyway enabled and **zero
migration files**. Flyway still creates `flyway_schema_history` on boot, which proves connectivity,
credentials, TLS and write permission - without inventing throwaway schema that has to be deleted
once the real data model is decided in 2.1.

### Consequences
- Phase 1 ships nothing an HR manager would care about. Accepted deliberately.
- Design moves to phase 2 and happens against a pipeline that already works; the old deploy phase
  dissolves into phases 1 and 6.
- Flyway runs with an empty migration set, which is valid but looks odd until 3.1 adds `V1`.
- From phase 2 onward, every merge to `main` is already continuously deployed.

---

## ADR-002 — Neon for managed Postgres

- **Date:** 2026-10-23
- **Status:** Accepted
- **Task:** 1.6

### Context
The backend runs on Render and needs a managed Postgres that stays reachable for as long as reviewers
might click the link, which is longer than the week of submission.

### Options considered
| Option | For | Against |
|---|---|---|
| **A - Neon** | Free tier persists indefinitely; autosuspends when idle; branching can give tests a disposable database | Separate vendor from the backend; a suspended instance adds latency to the first query; pooled vs direct endpoints are a footgun |
| **B - Render Postgres** | Same vendor as the backend, lowest latency, simplest wiring | **The free instance is deleted after 30 days** - fatal for an assessment that must stay clickable |
| **C - Supabase** | Persistent free tier, generous limits | A whole platform where only a database is wanted; more surface than the problem needs |

### Decision
Option A, Neon. The 30-day deletion in option B is disqualifying on its own: a reviewer opening the
link five weeks out would find a broken app and no explanation.

### Consequences
- Two vendors to configure, and a cross-provider network hop on every query.
- First query after idle pays a resume penalty, compounding ADR-004's cold start.
- The **pooled** connection endpoint is required: Render's container count against Neon's connection
  limit is a real constraint, not a theoretical one.
- Neon branching is available later if Testcontainers proves slow in CI.

---

## ADR-003 — Direct cross-origin calls with env-driven CORS

- **Date:** 2026-10-23
- **Status:** Accepted
- **Task:** 1.8, 1.9

### Context
The Angular app on Vercel must call the Spring Boot API on Render - two different origins. Task 1.9
requires CORS restricted to the frontend origin. Vercel assigns every preview deployment a generated
hostname, so the allowed origin is not a single known string.

### Options considered
| Option | For | Against |
|---|---|---|
| **A - Direct calls, CORS allowlist from an env var** | Explicit and visible; standard Spring config; keeps the deployment model obvious | Preflight request on non-simple calls; the allowlist must be maintained as environments appear |
| **B - Vercel rewrite proxying `/api/*` to Render** | Same-origin, so no CORS at all; backend URL hidden from the browser | An extra network hop on every call; Vercel-specific config that hides where requests actually go; makes task 1.9 moot and the architecture harder to explain |

### Decision
Option A. Allowed origins come from an environment variable, never a hardcoded string, so preview
deployments and local development are configured rather than special-cased in code.

### Consequences
- A misconfigured env var surfaces as an opaque browser CORS error; the README must say so explicitly.
- Every new frontend environment needs its origin added.
- The backend URL is visible to the browser. Acceptable: there is no authentication to protect and the
  API is public by design in v1.

---

## ADR-004 — Accept Render free-tier cold starts

- **Date:** 2026-10-23
- **Status:** Accepted
- **Task:** 1.10, 7.6

### Context
Render's free web service spins down after roughly 15 minutes of inactivity, so a reviewer's first
click waits tens of seconds - and a reviewer who assumes the app is broken stops being a reviewer.
The ~200 ms target in `REQUIREMENTS.md` concerns warm request latency, not boot.

### Options considered
| Option | For | Against |
|---|---|---|
| **A - Accept it, document it, show an honest loading state** | Free; truthful; a stated limitation reads as engineering judgment | The first impression is a wait |
| **B - Keep-alive pinger (cron hitting the health endpoint)** | Hides the problem | Burns the free tier continuously to defeat its own purpose; reads as gaming the platform, and the demo would rest on it |
| **C - Paid instance (~$7/mo)** | The problem simply disappears | Ongoing cost for an assessment |

### Decision
Option A. The README states the cold start plainly, and the frontend loading state says what is
happening - "waking the server, this can take up to a minute" - rather than showing an ambiguous spinner.

### Consequences
- The honest loading copy in 7.6 is a requirement, not a nicety.
- Any live performance measurement must be taken warm, and must say so.
- Compounds with Neon's resume (ADR-002): the worst case is both waking at once.
- Upgrading to option C later is a dashboard change, not a code change.

---

## ADR-005 — Tailwind with PrimeNG for the frontend

- **Date:** 2026-10-23
- **Status:** Accepted
- **Task:** 1.5

### Context
The app needs a data table with server-side paging, form controls with validation states, and a
dashboard, for a single internal user. Phase 7 builds these, but 1.5 scaffolds the frontend and the
choice cannot be postponed past that.

### Options considered
| Option | For | Against |
|---|---|---|
| **A - Tailwind + PrimeNG** | PrimeNG's table, paginator and form controls cover the hardest parts; Tailwind handles layout and bespoke dashboard tiles without fighting a component theme | Two styling systems; both want to own base styles, so CSS layer order must be configured deliberately |
| **B - Angular Material alone** | First-party, cohesive, one system to learn | Its table needs more assembly for server-side paging; Material's visual identity reads instantly as a default |
| **C - Tailwind alone** | Total design control; smallest dependency surface | Hand-building an accessible data table and paginator is real work phase 7 cannot absorb |

### Decision
Option A, Tailwind + PrimeNG.

### Consequences
- Tailwind's preflight and PrimeNG's theme both reset base styles. The scaffold must set explicit CSS
  layer ordering and use the `tailwindcss-primeui` plugin so the two compose instead of overriding each
  other unpredictably. Getting this wrong surfaces much later as unexplainable spacing bugs.
- PrimeNG's styled theme is the source of truth for component visuals; Tailwind utilities are for
  layout and composition. Mixing both on one element is how this becomes unmaintainable.
- Both are new dependencies, approved explicitly.
- Revisit if PrimeNG's table proves awkward against the server-side paging contract from 4.1.

---

## ADR-006 — Spring Boot 4 rather than Spring Boot 3

- **Date:** 2026-10-23
- **Status:** Accepted
- **Task:** 1.1

### Context
Every planning document in this repo specified Spring Boot 3. Scaffolding revealed that Spring
Initializr no longer offers any 3.x version: the available lines are 4.0.9, 4.1.2 (default) and
4.2.0-RC1. Boot 3.5 was the final 3.x line and its free support window has closed, so 3.x receives no
further upstream security patches. Boot 4 also renamed the starters - `spring-boot-starter-web` became
`spring-boot-starter-webmvc`, Flyway gained its own starter, and each starter has a matching `-test`
artifact.

### Options considered
| Option | For | Against |
|---|---|---|
| **A - Spring Boot 4.1.2** | The only line still receiving security patches; what Initializr generates, so the scaffold is unmodified; Java 21, Flyway, JPA and Testcontainers all work unchanged | Thinner tutorial and StackOverflow coverage; API removals to navigate, notably `@MockBean`; contradicts the planning docs until they are corrected |
| **B - Pin Spring Boot 3.5.x by hand** | Matches the documents as written; deepest body of community material | Initializr cannot generate it, so the dependency block is hand-written with the old starter names; ships a stack with no upstream security support, which a reviewer may reasonably question |

### Decision
Option A. Shipping a framework version that no longer receives security patches is a worse answer to
"how would you build this properly" than updating a planning document written before the constraint
was known.

### Consequences
- The stack line in `REQUIREMENTS.md`, `CLAUDE.md`, `README.md` and `TASKS.md` now reads Spring Boot 4.
  This is the one change made to `REQUIREMENTS.md` since it was committed, and it was explicitly approved.
- `@MockBean` no longer exists; slice tests use `@MockitoBean`. Recorded in CLAUDE.md's testing
  standards so later sessions do not rediscover it.
- Starter names differ from most Boot 3 material found online; the pom is the reference, not blog posts.
- Boot 4 requires Java 17+ and runs on the installed Java 21, so no toolchain change.

---

## ADR-007 — Angular 21, after Angular 20 proved a security dead end

- **Date:** 2026-10-23
- **Status:** Accepted
- **Task:** 1.5

### Context
Angular 20 was chosen first because it matched the installed CLI. Resolving the actual packages
contradicted that choice. Angular 20's `@angular/build` peers `vitest ^3.1.1`, and that line carries two
critical advisories with no reachable fix:

| Package | Severity | Issue | Fixed in |
|---|---|---|---|
| tinypool 1.1.1 | critical | prototype pollution gadget to RCE | >= 2.1.2 |
| vitest 3.2.7 | critical | path traversal / arbitrary file read via `@vitest/mocker` | >= 4.1.11 |

Neither is attainable under Angular 20: `vitest >= 4.1.11` violates its `^3.1.1` peer, and vitest 3
declares `tinypool ^1.1.1`, so forcing 2.1.2 crosses a major inside Vitest's own dependency. Angular 21
peers `vitest ^4.0.8` and requires Node `^20.19 || ^22.12 || >=24`, which the installed Node 22.17.0
already satisfies.

### Options considered
| Option | For | Against |
|---|---|---|
| **A - Angular 21 + PrimeNG 21 + Vitest 4** | Both criticals cleared; no Node change needed; one major from latest | Re-scaffolding, though nothing had been committed yet |
| **B - Angular 20 + Karma** | Pulls none of the vulnerable tree | Karma is deprecated and needs a headless browser in CI |
| **C - Angular 20 + Vitest 3, accepted** | No rework | `npm audit` reports two criticals on an assessment a reviewer may audit |
| **D - Angular 20 + an npm override on tinypool** | Removes the RCE | Leaves the path traversal, and may break Vitest |

### Decision
Option A. These are dev dependencies, so nothing vulnerable ships to the browser - but the exposure is
the developer machine and the CI runner, and "it only affects the build" is a poor answer when a
supported version with no advisories costs one afternoon of rework. `npm audit` now reports zero
vulnerabilities.

### Consequences
- Angular 21 scaffolds **zoneless** by default and makes Vitest the default runner, both of which match
  the signals and `OnPush` conventions already in `CLAUDE.md`.
- PrimeNG 21 dropped the `@angular/animations` peer. On 20 that package was both deprecated and
  required, and `^20` resolved to a version pinning `@angular/common` exactly, which failed to install
  at all.
- Still one major behind Angular 22, which needs Node >= 22.22.3. Moving later is a Node patch bump plus
  `ng update`, not a migration.
- The Tailwind and PrimeNG layer order is configured but only observable at runtime; it is asserted
  here, not yet seen. Phase 7 is where real components will prove it.
- Supersedes nothing formally - the Angular 20 choice was never recorded as an ADR, which is precisely
  why this one exists.

---

## ADR-008 — Reference data in tables, joined by natural keys

- **Date:** 2026-10-24
- **Status:** Accepted
- **Task:** 2.1

### Context
`REQUIREMENTS.md` says "supported countries only" and "currency is derived from the country". Filters
(4.3), insights (5.2, 5.3) and the dropdown reference endpoint (5.5) all list or group by country, job
title and department. If these are free text, "Engineer" and "engineer " become two groups and the
insights quietly fragment. The requirements name no list of countries.

### Options considered
Countries:
| Option | For | Against |
|---|---|---|
| **A - `country` table, FK from `employee`** | Database enforces the supported set; 5.5 reads it; SQL insight queries can return currency via a join | One more table and join; adding a country is a migration |
| **B - Java enum + `CHECK`** | Compile-time safety, no join | The list lives in two places that drift; currency is only known in Java |
| **C - Java enum only** | Simplest | The database accepts any string |

Currency: **derive it through the country** vs **store it on each employee** (no join, but redundant and
able to disagree with the country).

Job titles and departments:
| Option | For | Against |
|---|---|---|
| **A - Lookup tables, FK on the name** | Clean grouping; dropdowns come from the tables; no join just to display a value | New titles need a migration; a rename cascades |
| **B - Lookup tables, numeric ids** | Classic normalisation, cheap renames | A join on every list and insight query, plus mapping work |
| **C - Free text, trimmed** | Nothing to maintain | Spelling and casing variants fragment insights |

Relationship: **titles independent of departments** (flat lists, any combination) vs **each title belongs
to a department**. If dependent: title names **unique globally** vs **unique per department** ("Manager" in
several departments, so 5.2 would have to group by department and title). And whether `employee` still
stores department when the title already implies it.

### Decision
- **Countries:** option A. Five countries: US (USD), GB (GBP), IN (INR), DE (EUR), FR (EUR). DE and FR
  sharing EUR proves the rule is "one currency per country", not "one country per currency". Every
  currency has 2 decimals, so the global 2dp `HALF_EVEN` rule holds. JPY (0 decimals) was considered and
  left out for that reason.
- **Currency:** derived through the country, never stored on `employee`. One source of truth.
- **Titles and departments:** option A, keyed by name.
- **Each title belongs to exactly one department, and title names are unique globally.** The AI first
  recommended independent lists for simplicity; the engineer argued dependent titles are more
  predictable. With natural-key FKs the cost is one composite FK, so the recommendation changed.
  Global uniqueness keeps "average salary by title" (5.2) unambiguous.
- **`employee` stores both `department` and `job_title`**, kept consistent by the composite FK
  `(department, job_title) → job_title(department, name)`. The redundancy buys join-free department
  filters and headcounts, and a direct `(country_code, department)` index.
- Reference data: 6 departments and 18 titles, listed in [`DATA_MODEL.md`](DATA_MODEL.md).

### Consequences
- The database itself rejects an unsupported country or a title outside its department, including
  from the seed script and manual SQL.
- Adding a country, department or title is a Flyway migration. There is no admin UI, by design.
- The employee form (7.3) needs a title dropdown that depends on the department; changing department
  clears the title.
- Whether the title filter (4.3) narrows when a department is picked is a UX question left to 7.2.
- Revisit if HR needs to create titles themselves: that means an admin feature, which is out of scope.

---

## ADR-009 — Employee keys and column types

- **Date:** 2026-10-24
- **Status:** Accepted
- **Task:** 2.1

### Context
The `employee` table needs a key that suits a 10,000-row seed (6.2, 6.3, under 10 seconds), a salary type
that matches the `BigDecimal` convention in `CLAUDE.md`, and a case-insensitive unique email.

### Options considered
| Decision | Options | Chosen |
|---|---|---|
| Primary key | **`BIGINT` from a sequence, increment 50** (Hibernate can batch inserts) · `BIGINT IDENTITY` (simplest SQL, but Hibernate turns off insert batching for identity keys) · UUID v7 (unguessable; 16 bytes, uglier URLs, no benefit without auth) | Sequence |
| Salary | **`NUMERIC(14,2)`** (up to about 1 trillion; maps straight to `BigDecimal`) · `BIGINT` minor units (exact and fast, but every layer converts, against the 2dp convention) | `NUMERIC(14,2)` |
| Salary ceiling | **None beyond `> 0`** · a per-country maximum (catches typos; a rule not in the requirements) · one global cap (meaningless across currencies) | None |
| Email uniqueness | **Unique index on `lower(email)`** (keeps the typed casing) · lowercase on write (loses casing) · `citext` (an extension and a type mapping for one column) | `lower(email)` |
| Name | **Single `full_name`** (matches the requirement; works for every naming culture) · first and last names (sort by surname, but a forced split that fails for mononyms) | `full_name` |
| Text lengths | **`VARCHAR` with limits:** name 200, email 254, title and department 100 · unbounded `TEXT` with app limits only (no database backstop) | `VARCHAR(n)` |
| Timestamps | **None** (nothing in scope reads them) · `created_at` and `updated_at` · `created_at` only | None |

### Decision
As chosen above. Optimistic locking uses `version BIGINT NOT NULL DEFAULT 0` (decided in `CLAUDE.md`).

### Consequences
- The sequence increment must equal the JPA `allocationSize` (50). Any insert path outside JPA (6.3 may
  use JDBC batching) must take ids from the same sequence. Task 3.1 proves the mapping with a test.
- IDs jump in steps when blocks of 50 are reserved and not used. Harmless, but visible in URLs.
- A 10x salary typo is not caught. Accepted: the requirements only ask for `> 0`.
- A unique email is unique only among active employees (ADR-011).
- Revisit timestamps if "recently added" sorting or debugging needs appear. `deleted_at` already
  brings in the injected `Clock`, so adding them later is cheap.

---

## ADR-010 — Validation in both layers, and the hire-date rules

- **Date:** 2026-10-24
- **Status:** Accepted
- **Task:** 2.1

### Context
The requirements specify required fields, a valid email, salary > 0, a hire date not in the future,
and supported countries only. Rows can arrive through the API, the seed script (phase 6) or manual SQL.
"Not in the future" depends on the current date, and the current date depends on a timezone.

### Options considered
| Decision | Options | Chosen |
|---|---|---|
| Where rules live | **Both:** database constraints as a backstop, Bean Validation in the app for friendly 400s (rules stated twice) · app only (seed and SQL can insert bad rows) | Both |
| "Not in the future" | **App only, with an injected `Clock`** · also a database `CHECK (hire_date <= current_date)` (not immutable, which Postgres docs advise against; can disagree with the app at timezone edges) | App only |
| Whose "today" | **UTC** · the employee's country zone (needs a zone per country, and multi-zone countries need a pick) · UTC plus one day of grace | UTC |
| Earliest date | No lower bound (requirement as written) · **not before 1950-01-01** (catches century typos) | 1950-01-01 |

### Decision
- The database enforces `NOT NULL`, `CHECK (salary > 0)`, `CHECK (hire_date >= DATE '1950-01-01')`, the
  foreign keys (ADR-008) and the unique active email (ADR-011).
- The app checks everything, including "hire date ≤ today in UTC", using an injected `Clock`.
- **The 1950 lower bound is a rule added beyond `REQUIREMENTS.md`**, chosen by the engineer to catch
  typos such as 1025 for 2025. Being a fixed date, it is safe as a database `CHECK`.

### Consequences
- Tests pin the `Clock`, so "today" is deterministic.
- Near midnight UTC, a hire entered as "today" from a zone ahead of UTC (India, for example) can be
  rejected for a few hours. Accepted for simplicity. Revisit if HR reports it.
- Rules appear twice. A database constraint violation that slips past the app must still become a
  Problem Details response, never a 500 with a stack trace (3.7).

---

## ADR-011 — Soft delete with `deleted_at`

- **Date:** 2026-10-24
- **Status:** Accepted
- **Task:** 2.1, 3.6

### Context
Task 3.6 requires delete → 204, then get → 404. The question is whether the row survives.

### Options considered
| Option | For | Against |
|---|---|---|
| **A - Hard delete** | Simplest; no filtering anywhere | Unrecoverable: a mis-click loses the record |
| **B - Soft delete, `deleted_at TIMESTAMPTZ`** | A safety net: rows can be recovered with SQL | Every query, insight and unique index must exclude deleted rows, and forgetting one is the classic soft-delete bug |

Follow-ups: whether a deleted employee's email can be reused (**unique among active only**, partial index;
or unique forever, which gives HR a 409 for someone they cannot see). And whether restore is exposed
(**no, recovery by SQL only**; a restore endpoint; or restore plus a "deleted" list view).

### Decision
Option B, chosen by the engineer over the AI's recommendation of A, for recoverability. Emails are unique
among active employees only. There is no restore API or UI. Recovery is a database operation.

### Consequences
- **Every read filters `deleted_at IS NULL`**: get, list, search, filters, insights and the duplicate-email
  check. Each of these gets a test proving deleted rows are invisible.
- Indexes are partial (ADR-012). Queries must state `deleted_at IS NULL` literally, or the planner
  cannot use them.
- `deleted_at` is set from the injected `Clock`. A delete also bumps `version`.
- Get and delete of an already-deleted employee return 404.
- Deleted rows stay in the table, so the seed's "exactly 10,000 rows" (6.2) means active rows.
- Restore can be added later. It must handle a restored email that is now taken (409).

---

## ADR-012 — Indexes created up front, all partial

- **Date:** 2026-10-24
- **Status:** Accepted
- **Task:** 2.1, 4.5

### Context
The requirements set list queries under about 200 ms and insights under 1 second, at 10,000 employees.
At that size Postgres often prefers a full scan anyway. Task 4.5 checks the query plans.

### Options considered
| Need | Options | Chosen |
|---|---|---|
| Partial, case-insensitive search (4.2) | **`pg_trgm` GIN** (supports `ILIKE '%x%'`; needs the extension, which Neon supports) · no index (a scan of 10k rows takes a few ms) · prefix-only btree (changes "partial" to "starts with") | `pg_trgm` |
| Filters and insights (4.3, 5.x) | **Composite per query:** `(country_code, salary)`, `(country_code, job_title)`, `(country_code, department)` · single columns · `country_code` only | Composite |
| Sorting (4.4) | Wait for 4.5 and measure (AI's recommendation) · **add now** | Add now |

### Decision
As chosen, all partial on `WHERE deleted_at IS NULL` (ADR-011). Sort indexes on `full_name`, `salary` and
`hire_date` are created now at the engineer's call. 4.5 will report whether the planner uses them.

### Consequences
- One extension, `pg_trgm`, is created by migration.
- Search must use `ILIKE` on the raw column to hit the trigram index. `lower(col) LIKE` would not.
- Partial indexes cannot serve foreign-key checks, which do not filter on `deleted_at`. Updating or
  deleting a country or title row therefore scans `employee`. Accepted: reference data changes only by
  migration.
- Pagination needs a tiebreaker (`id`). Whether the sort indexes widen to `(column, id)` is decided in 4.4.
- Nine indexes slow inserts slightly. 6.3 measures the seed against the 10-second target.
- Unused indexes found in 4.5 are dropped by a new migration and recorded.

---

## ADR-013 — Hand-written OpenAPI contract under `/api/v1`

- **Date:** 2026-10-24
- **Status:** Accepted
- **Task:** 2.2

### Context
Phase 2 is done when "Claude Code could build the backend from the docs alone". The contract must exist
before the code, and must be precise enough to test against.

### Options considered
| Decision | Options | Chosen |
|---|---|---|
| Format | **Hand-written `openapi.yaml`** (machine-readable, written first, can drive tests and typed models; verbose, can drift) · Markdown `api.md` (fast and readable, not checkable) · springdoc generated from code (never drifts, but a new dependency, and the contract only exists after the code) | `openapi.yaml` |
| Base path | **`/api/v1`** (separate from `/actuator`, room for v2) · `/api` unversioned (simplest; frontend and backend deploy together) · header versioning (overkill for one client) | `/api/v1` |

### Decision
[`openapi.yaml`](openapi.yaml), OpenAPI 3.1, served under `/api/v1`.

### Consequences
- The contract can drift from the code. Slice tests in phases 3 to 5 assert the shapes it defines.
  Automated contract checking would need a new dependency and is not planned.
- Typed Angular models (7.1) can be generated from it or written by hand. That is decided in 7.1.

---

## ADR-014 — Write semantics: PUT, version in the body, strict input

- **Date:** 2026-10-24
- **Status:** Accepted
- **Task:** 2.2, 3.2-3.6

### Context
The HR manager edits through a form that always holds the whole record. Concurrent edits must fail with
409 (`REQUIREMENTS.md`). Currency must never come from the client (`CLAUDE.md`).

### Options considered
| Decision | Options | Chosen |
|---|---|---|
| Update | **PUT, full replace** (same validation as create) · PATCH merge (fits quick salary edits; null-vs-absent handling) · both (two code paths) | PUT |
| Version transport | **`version` field in the body** · ETag / `If-Match` (HTTP-standard, but 412/428 instead of the 409 in `TASKS.md`, and headers need CORS exposure) | Body |
| Delete | **By id only** · `?version=N` required (little benefit with one user; soft delete already makes it recoverable) | By id |
| Create response | **201 + `Location` + body** · 201 + `Location` only (an extra GET on a cold server) | With body |
| More than 2 decimals | **Reject (400)** · round `HALF_EVEN` (silently changes someone's pay) | Reject |
| Surrounding whitespace | **Trim, then validate** · reject · store as sent (`" a@x.com"` would bypass uniqueness) | Trim |
| Unknown fields | **Reject (400)** · ignore (a sent `currency` would be silently dropped) | Reject |

### Decision
As chosen above. An unknown field is reported as `VALIDATION_FAILED` with the field's name, so the same
`errors[]` shape covers it.

### Consequences
- Every PUT carries every field, which suits the form.
- `id` and `currency` in a request body are 400s, so "currency is never accepted" is enforced, not just ignored.
- Adding a request field later means changing client and server together. Fine with one frontend.
- A delete can remove a record someone else has just edited. Accepted: one user, and recoverable.

---

## ADR-015 — Money as a JSON number

- **Date:** 2026-10-24
- **Status:** Accepted
- **Task:** 2.2

### Context
Money is `BigDecimal` in the backend. JSON can carry it as a number or a string. JavaScript parses
numbers into binary floating point.

### Options considered
| Option | For | Against |
|---|---|---|
| **A - String, `"2400000.00"`** | Exact end to end; always shows 2 decimals | Unconventional; the frontend parses for charts and sends strings back |
| **B - Number, `2400000.00`** | Conventional; works directly in charts and forms | JS float: trailing zeros vanish, and UI arithmetic can drift |

### Decision
Option B, chosen by the engineer over the AI's recommendation of A, for convention and simpler frontend
code. Values here (at most 12 integer digits plus 2 decimals) stay below 2^53, so display is exact.

### Consequences
- **The frontend never does arithmetic on money.** It formats with `Intl.NumberFormat` and the currency,
  so the 2 decimals reappear on display.
- The backend parses JSON numbers straight into `BigDecimal` (no `double` step), so input stays exact.
- Revisit if the frontend ever needs to calculate (for example, a raise preview). That calculation
  would then belong in the backend.

---

## ADR-016 — List query: page/size, a single sort, one search box

- **Date:** 2026-10-24
- **Status:** Accepted
- **Task:** 2.2, 4.1-4.4

### Context
`REQUIREMENTS.md` asks for a server-side paginated list, search by name or email, filters by country,
title and department, sorting by name, salary or hire date, and filters kept in the URL.

### Options considered
| Decision | Options | Chosen |
|---|---|---|
| Pagination | **`page`/`size`, 0-based, own envelope** · 1-based (off-by-one translation) · cursor (no page jumps or totals, which the paginator expects) | 0-based, own envelope |
| Size limits | **Default 20, max 100, reject above** · clamp silently · default 50, max 200 | Reject above 100 |
| Sort syntax | **`sort=salary,desc`** · `sortBy` + `direction` · `sort=-salary` | Spring style |
| Default sort | **`fullName` asc** · `id` · `hireDate` desc | `fullName` asc |
| Search | **One `q`, name OR email, at least 2 characters** · separate `name` and `email` · one `q`, any length | One `q`, at least 2 |
| Filters | **One value each, AND-combined** · multi-value | One value each |

### Decision
As chosen above. The envelope is `{items, page, size, totalItems, totalPages}`, a DTO of our own rather
than Spring's `Page` JSON, whose format Spring itself warns is not stable. Sorting always appends `id`
as a tiebreaker (the open question left by ADR-012). Filter values must exist in the reference data,
or 400.

### Consequences
- Deep pages use `OFFSET`. Fine at 10k rows; keyset paging would be the fix at much larger scale.
- A 1-character search is a 400, so the debounced UI (7.2) must not send it.
- `%` and `_` in `q` are escaped and match literally.
- "IN or DE" cannot be asked in one query. Revisit if HR needs it.
- 4.4 decides whether the sort indexes widen to `(column, id)`.

---

## ADR-017 — One combined insights call, with an exact median

- **Date:** 2026-10-24
- **Status:** Accepted
- **Task:** 2.2, 5.1-5.5

### Context
The dashboard shows three per-country views and must load in under 1 second, warm. Render and Neon cold
starts (ADR-002, ADR-004) make every extra round trip expensive.

### Options considered
| Decision | Options | Chosen |
|---|---|---|
| Endpoint shape | **One combined `GET /insights/countries/{code}`** · three endpoints (one per task, three round trips) · both | Combined |
| Even-count median | **Mean of the two middle values** · lower middle value (`percentile_disc`; always a real salary, but non-standard) | Mean |
| No employees | **200, headcount 0, null stats, empty lists** · `salary: null` · 404 (conflates "no data" with "unsupported") | 200 with nulls |
| Unsupported or lowercase code | **404** · 400 · normalise case, then 404 | 404 |
| List contents and order | **Non-empty groups only, value desc, then name** · all groups alphabetical · non-empty alphabetical | Value desc |
| Reference data | **One `GET /reference`** with titles nested under departments · separate resources | One call |

### Decision
As chosen above. **Two corrections to the option text the AI presented:**
- The median option was written as `percentile_cont(0.5)`. In Postgres that function computes in
  `double precision`, so the median is instead computed exactly in `numeric` SQL, as the average of the
  middle one or two rows. The meaning chosen is unchanged.
- Postgres `round(numeric, 2)` rounds ties away from zero, not `HALF_EVEN`. Aggregation stays in SQL
  (`CLAUDE.md`); the final 2dp rounding of averages and the median happens in Java with
  `setScale(2, RoundingMode.HALF_EVEN)`.

### Consequences
- One call fills the dashboard: three queries in one read-only transaction.
- One section cannot be fetched or cached alone. Revisit if any section becomes slow.
- The UI handles null stats with an empty state (7.6).
- `/reference` is cacheable (`max-age=3600`), since it changes only by migration.
- 5.4's hand-calculated fixture must include a tie at the half-cent (for example, a mean of x.005) to
  prove `HALF_EVEN`.

---

## ADR-018 — RFC 7807 Problem Details with stable codes

- **Date:** 2026-10-24
- **Status:** Accepted
- **Task:** 2.2, 3.7

### Context
`CLAUDE.md` requires RFC 7807 errors and no stack traces. The frontend has to tell two 409s apart
(duplicate email vs stale version) and mark every invalid form field.

### Options considered
| Decision | Options | Chosen |
|---|---|---|
| Field errors | **`errors[]` of `{field, message}`**, all at once · a map of field → messages · first error only | `errors[]` |
| `type` | **Relative URI plus a stable `code` extension** · `about:blank`, status only (cannot tell the 409s apart) · absolute docs URLs (ties the API to a URL that may move) | Relative + `code` |
| Stale-update body | **Problem with `currentVersion`; client re-fetches** · problem plus the current employee (bigger contract for a rare case) | Problem only |

### Decision
As chosen above. The codes are listed in the `Problem` schema in [`openapi.yaml`](openapi.yaml).

### Consequences
- The frontend branches on `code`, never on `status` or message text.
- Every error path in 3.7 has a test asserting its `code`, and asserting that no stack trace or
  exception class appears in the body.
- The `type` URIs do not resolve. Accepted; `code` is the contract.

---

## ADR-019 — Stack: Java 21, Spring Boot 4, Angular

- **Date:** 2026-10-24
- **Status:** Accepted
- **Task:** 2.3

### Context
The assessment brief specified Java with Spring Boot for the backend and Angular for the frontend. This
ADR records that as a given constraint, and the version choices made inside it.

### Options considered
| Decision | Options | Chosen |
|---|---|---|
| Backend | **Java + Spring Boot (from the brief)** · Kotlin + Spring Boot · Node + NestJS | Java + Spring Boot |
| Frontend | **Angular (from the brief)** · React · Vue | Angular |
| Java version | **21 (LTS, installed)** · 25 (current LTS since September 2025, supported by Boot 4) | 21 |

### Decision
Java 21 + Spring Boot 4 (ADR-006) + Angular 21 (ADR-007). The language and frameworks come from the brief.
**Java 21 was chosen because it is the JDK already installed** (21.0.9), and CI and the Docker image
already use it. That is a toolchain reason, not a brief requirement.

### Consequences
- Alternatives were not evaluated on merit, because the brief removed the choice.
- Java 21 is a supported LTS, so nothing is forced. Moving to 25 touches `pom.xml`, CI, the `Dockerfile`
  and the local JDK. That would be its own `chore:` change, not a migration.
- Revisit Java 25 if a feature or library needs it, or once 21's free support window nears its end.

---

## ADR-020 — PostgreSQL over SQLite and MySQL

- **Date:** 2026-10-24
- **Status:** Accepted
- **Task:** 2.3

### Context
By the end of 2.1 and 2.2, the design depends on database features, not just on storing rows. The
backend also runs on Render, whose container disk is ephemeral.

### Options considered
| Option | For | Against |
|---|---|---|
| **A - PostgreSQL** | `pg_trgm` partial-match search (ADR-012); partial indexes for soft delete (ADR-011); exact `numeric` aggregates and window functions for the median (ADR-017); managed free hosting (Neon, ADR-002); Testcontainers runs the same major version as production | A server to run locally (Docker Compose) and in tests (Testcontainers) |
| **B - SQLite** | Zero setup; one file | The file is lost on every Render deploy or restart; single writer; no trigram search; weak `NUMERIC` typing |
| **C - MySQL** | Widely hosted, mature | No partial indexes, so soft-delete uniqueness needs workarounds; full-text search instead of trigram for "contains"; fewer good free managed tiers |

### Decision
Option A, on features and hosting together: the schema as designed cannot be built on B, and only
awkwardly on C.

### Consequences
- The app is Postgres-specific (extensions, partial indexes, SQL in ADR-022). Changing database would
  mean redesigning, not reconfiguring. Accepted knowingly.
- Local development needs Docker. Already true since task 1.2.
- Postgres 18 everywhere: local, CI (Testcontainers) and Neon.

---

## ADR-021 — Money as plain `BigDecimal` with one rounding helper

- **Date:** 2026-10-24
- **Status:** Accepted
- **Task:** 2.3

### Context
`CLAUDE.md` requires `BigDecimal` and 2dp `HALF_EVEN`. The column (`NUMERIC(14,2)`, ADR-009) and the JSON
form (number, ADR-015) are settled. What remains is how money looks in Java code.

### Options considered
| Option | For | Against |
|---|---|---|
| **A - Plain `BigDecimal`, plus one rounding helper** | Least code; maps directly to JPA, JDBC and Jackson | Nothing stops adding two different currencies, though no code path does |
| **B - Own `Money(amount, currency)` value object** | Scale and currency enforced by type | An embeddable plus JSON mapping, for a protection nothing needs: currency is derived from the country and insights are per country |
| **C - JSR 354 (Moneta)** | Standard currency arithmetic | New dependency, heavier types, JPA and Jackson converters |
| **D - `long` minor units** | Fast and exact | Contradicts ADR-009 and the `BigDecimal` convention |

### Decision
Option A. One helper (for example, `MoneyRounding.toMoney(BigDecimal)`) is the only place
`setScale(2, RoundingMode.HALF_EVEN)` appears.

### Consequences
- **Rounding applies only to computed values** (averages, the median). Input is never rounded; more than
  2 decimals is rejected (ADR-014).
- `BigDecimal.equals` compares scale (`2.0` ≠ `2.00`). Code uses `compareTo`, and tests use AssertJ
  `isEqualByComparingTo`.
- Jackson reads JSON numbers straight into `BigDecimal` fields, never through `double` (ADR-015).
- Revisit B if cross-currency features arrive (they are out of scope in `REQUIREMENTS.md`).

---

## ADR-022 — Aggregations in SQL through `JdbcClient`

- **Date:** 2026-10-24
- **Status:** Accepted
- **Task:** 2.3, 5.1-5.3

### Context
`CLAUDE.md` puts aggregations in SQL, not Java loops: loading 10,000 rows to compute a mean would break
the 1-second insight target on a cold instance. The exact median (ADR-017) needs window functions, which
JPQL does not have.

### Options considered
| Option | For | Against |
|---|---|---|
| **A - `JdbcClient` in a separate `InsightsRepository`** | Full Postgres SQL, readable multi-line queries, record mappers; already on the classpath through Spring Boot | Two data-access styles in one app (JPA for CRUD) |
| **B - Native `@Query` on JPA repositories** | One data-access style | SQL in annotation strings; projections through interfaces or `Object[]` |
| **C - jOOQ** | Type-safe SQL generated from the schema | New dependency and a code-generation build step for three queries |
| **D - Aggregate in Java** | Simple code | Moves every row over the network; ruled out by `CLAUDE.md` |

### Decision
Option A. JPA for employee CRUD; `JdbcClient` with plain SQL for insights.

### Consequences
- Insight queries are tested against real Postgres (Testcontainers) with a hand-calculated fixture (5.x),
  since no type checker sees inside the SQL strings.
- Every insight query states `deleted_at IS NULL` (ADR-011).
- How the dynamic list query is built (JPA Specifications or `JdbcClient`) is a separate decision, left
  to phase 4.

---

## ADR-023 — Optimistic locking: `@Version` plus an explicit version check

- **Date:** 2026-10-24
- **Status:** Accepted
- **Task:** 2.3, 3.5

### Context
A stale update must be rejected with 409 (`REQUIREMENTS.md`, ADR-014). JPA `@Version` alone does not do
this for a REST PUT: the service loads the entity, copies the request onto it and saves. Hibernate then
compares the version **it just loaded**, so a client holding an old version overwrites silently.

### Options considered
| Option | For | Against |
|---|---|---|
| **A - `@Version` plus an explicit comparison** | Service compares `request.version` with the loaded version (409 if different); `@Version` still guards the race between load and commit | Two paths to test |
| **B - Conditional `UPDATE ... WHERE id = ? AND version = ?`** | One atomic statement | Bypasses JPA for writes; 0 rows needs a follow-up query to choose 404 or 409 |
| **C - Pessimistic lock (`SELECT ... FOR UPDATE`)** | No lost updates between concurrent requests | Blocks rather than rejects, and still does not detect a stale form; fails the requirement |

### Decision
Option A.

### Consequences
- Two tests in 3.5: a stale request version gives 409 `STALE_VERSION`, and a concurrent commit
  (`OptimisticLockException`) also gives 409 `STALE_VERSION`.
- The response carries `currentVersion` (ADR-018). On the explicit path this is the loaded version.
- Editing an employee that is already deleted gives 404, because deleted rows are invisible. Soft delete
  also increments `version` (ADR-011), so an edit that commits while a delete is in progress fails with 409.

---

## ADR-024 — Monorepo

- **Date:** 2026-10-24
- **Status:** Accepted
- **Task:** 2.3 (structure since 0.1)

### Context
The backend, frontend and docs are one system, built by one engineer and judged by a reviewer from one link.

### Options considered
| Option | For | Against |
|---|---|---|
| **A - One repo: `backend/`, `frontend/`, `docs/`** | One link and one commit history for the reviewer; API and UI changes land in one commit; one CI file | Both CI jobs run on every push; hosts need a root-directory setting |
| **B - Separate repos** | Independent deploys, permissions and histories | Gains matter for multiple teams, not one engineer; cross-repo changes and two review links |

### Decision
Option A. It gives the reviewer one link and one history to read.

### Consequences
- CI has no path filters, so a docs-only push runs both test jobs. Accepted until CI time matters.
- Render and Vercel are configured with root directories (`backend/`, `frontend/`). Done in 1.7 and 1.8.

---

## ADR-025 — Render and Vercel for hosting

- **Date:** 2026-10-24
- **Status:** Accepted
- **Task:** 2.3 (deployed in 1.7, 1.8)

### Context
`REQUIREMENTS.md` names Vercel for the frontend and Render for the backend, so this is a given, recorded
for completeness. The trade-offs that follow from it are already decided: Neon for the database
(ADR-002), direct cross-origin calls (ADR-003) and accepted cold starts (ADR-004).

### Options considered
| Option | For | Against |
|---|---|---|
| **A - Vercel + Render (named in the requirements)** | Free tiers; Vercel previews per push; Render runs the Docker image | Two vendors plus Neon; Render free tier sleeps (ADR-004) |
| **B - Fly.io or Railway for the backend** | Faster wake, or no sleep, on some plans | Free tiers changed or removed; not what the requirements name |
| **C - One host serving both (Spring serving the built Angular app)** | Same origin, so no CORS; one deploy | Loses Vercel's CDN and previews; contradicts the requirements |

### Decision
Option A, as specified.

### Consequences
- See ADR-002, ADR-003 and ADR-004.
- Both hosts deploy from `main`, so every merge is live (ADR-001).

---

## ADR-026 — Code structure: feature packages, one-way dependencies

- **Date:** 2026-10-24
- **Status:** Accepted
- **Task:** 2.4

### Context
Both apps are flat today: the backend has two classes in the root package, and the frontend has one
`health/` folder. `CLAUDE.md` fixes the layering (`controller → service → repository`) and the frontend
feature folders (`employees/`, `insights/`, `shared/`), but not how backend packages are grouped, how
features reach each other, or where cross-cutting frontend code lives.

### Options considered
| Decision | Options | Chosen |
|---|---|---|
| Diagram format | **Mermaid in Markdown** (GitHub renders it, diffable, no tools) · C4-PlantUML (proper notation; needs committed renders) · drawn image (looks best; binary, drifts) | Mermaid |
| Views | **Deployment + backend and frontend components + two sequences** (stale update, insights) · deployment + components only · full C4 (a context diagram with one user and no external systems) | Deployment, components, 2 sequences |
| Backend packages | **By feature, layers inside** (`employee/`, `insights/`, `reference/`, `common/`) · by layer (`controller/`, `service/`, …; one change touches five packages, everything public) | By feature |
| Enforcing the rules | **Convention and review** · ArchUnit test (new test dependency) · Spring Modulith (bigger dependency and its own concepts) | Convention |
| Reaching reference data | **Through `ReferenceService`, loaded once in memory** · through `ReferenceService`, querying each time · rely on FK violations (cannot say which field is wrong) | In memory |
| Frontend cross-cutting | **A `core/` folder** for the interceptor, cold-start detection, `ReferenceStore` and models · everything in `shared/` (mixes services into UI) | `core/` |
| Moving `CorsConfig` | **With the first phase 3 slice**, as a `refactor:` · now, inside this docs task | Phase 3 |

### Decision
As chosen above, drawn in [`ARCHITECTURE.md`](ARCHITECTURE.md). Dependencies run one way: `employee` and
`insights` depend on `reference` and `common`; `reference` depends only on `common`. A feature reaches
another only through its public service.

### Consequences
- A feature change stays inside one folder, and internals can be package-private.
- No test guards the boundaries. An AI-written shortcut (a controller calling a repository, or one
  feature reading another's entity) is caught only in review. Revisit with ArchUnit if that happens once.
- Reference data in memory is correct only because it changes solely by migration, which means a
  restart. If reference data ever becomes editable at runtime, the in-memory copy must go.
- The diagrams are hand-maintained and can drift. A slice that changes structure updates `ARCHITECTURE.md`.

---

## ADR-027 — UI: Insights as the landing page, a Catalog with a drawer, fully responsive

- **Date:** 2026-10-24
- **Status:** Accepted
- **Task:** 2.5

### Context
`REQUIREMENTS.md`: find any employee and update their salary in under 30 seconds; insights for a country
in under 1 second; filters in the URL. Phase 7 builds the screens, and this decides them first.

### Options considered
| Decision | Options | Chosen |
|---|---|---|
| Landing page | Employee list (AI's recommendation: the salary task starts with zero clicks) · **Insights dashboard** | Insights |
| List section name | "Employees" (AI's recommendation) · **"Catalog"** · "Directory" | Catalog |
| List URL | **`/catalog`** (matches the label) · `/employees` (matches the API) | `/catalog` |
| View and edit | **Side drawer over the list** (list keeps filters and scroll; linkable `/catalog/:id`) · separate pages · modal dialog | Drawer |
| Add | **The same drawer, empty** · a separate page | Drawer |
| Delete guard | **Simple confirm dialog** · type the name · undo toast (needs restore, ruled out by ADR-011) | Confirm dialog |
| 409 on save | **Keep edits, offer reload** · auto-reload and discard · field diff and merge | Keep edits |
| Columns | **Name with email, title, department, country, salary, hire date** · fewer | All six |
| Money display | **ISO code and en-US style for all countries** · each country's locale (mixed separators) · browser locale | en-US with code |
| Charts | See ADR-029 | — |
| Cold start | **Banner after 3 s, error and Retry at 90 s** · a blocking wake screen on load · banner after 5 s, no timeout | 3 s / 90 s |
| Screen sizes | Desktop-first, usable on tablet (AI's recommendation) · **fully responsive, phone included** | Fully responsive |

### Decision
As chosen, drawn in [`UI_DESIGN.md`](UI_DESIGN.md). The engineer overrode the AI on the landing page,
the section name and responsiveness. The AI filled in some smaller details itself, all marked in
`UI_DESIGN.md` and open to change in review:
- a "Discard changes?" prompt when closing the drawer with unsaved edits
- tablet widths drop the department and hire date columns
- an unknown `?country=` falls back to the default, with a toast
- the 300 ms search debounce

### Consequences
- The salary update starts with one click (Catalog) instead of zero. It still fits in 30 seconds: 5
  interactions, each warm response under 200 ms.
- "Catalog" is the UI word only. The code (`employees/`) and the API (`/employees`) keep the domain
  name, so the label is a one-line change if it is ever renamed.
- **Phone support roughly doubles the layout work in phase 7**: cards instead of table rows, a
  collapsible filter panel, a full-screen drawer and a menu. Each screen needs a phone check in 7.2 to 7.5.
- The cold-start banner is driven by the `core/` interceptor (ADR-026), so every request gets it for free.

---

## ADR-028 — Backend settings for the default country (scope addition)

- **Date:** 2026-10-24
- **Status:** Accepted
- **Task:** 2.5 (built in 5.6, 7.8)

### Context
With Insights as the landing page, the dashboard must open on some country. The engineer chose India by
default, with HR able to change it in Settings, and the currency follows the country. **This is new
scope.** `REQUIREMENTS.md` neither lists it nor rules it out, and it was not changed.

### Options considered
How the first country is chosen: last picked, else the largest by headcount (AI's first recommendation;
needed a new headcount endpoint) · first alphabetically · an org-wide overview (a new cross-country
endpoint) · **a fixed default (IN) that HR can change**.

Where the preference lives:
| Option | For | Against |
|---|---|---|
| **A - Browser `localStorage`** (AI's recommendation) | No backend, API or migration change; fits one user and no login | Lost when browser data is cleared, or on another computer |
| **B - Backend table and endpoint** | Survives any browser or machine | A migration, an endpoint and tests for one value; new scope in phases 5 and 7 |
| **C - No settings in v1** | Nothing to build | HR cannot change the default |

Table shape: **one typed row** (`id = 1` check, FK to `country`, `version`) · key-value strings (no
migration per setting, but untyped and no FK).

### Decision
Option B, chosen by the engineer, with a single typed row:
- `app_settings(id = 1, default_country_code → country, version)`, seeded with `IN`.
- `GET` and `PUT /api/v1/settings`, with optimistic locking as for employees.
- The dashboard picks its country from the URL first, then the setting. Picking a country on the
  dashboard changes the URL only, never the saved setting.

### Consequences
- New work: task 5.6 (migration and endpoint) and 7.8 (Settings page). Added to `openapi.yaml`,
  `DATA_MODEL.md`, `ARCHITECTURE.md` and `TASKS.md`.
- The dashboard makes one extra call (`GET /settings`) when the URL names no country. It is small, but
  on a cold start it waits like everything else.
- Every new setting is a migration adding a column. Fine while settings are few.
- With no login, "the HR manager's preference" is really **the app's** preference: anyone with the URL
  changes it for everyone. Accepted under the "one trusted user" assumption. With authentication, it
  would move to a per-user table.

---

## ADR-029 — Chart.js for the department doughnut

- **Date:** 2026-10-24
- **Status:** Accepted
- **Task:** 2.5 (built in 7.5). Extends ADR-005.

### Context
The dashboard shows average salary by job title (up to 18 rows) and headcount by department (up to 6).
ADR-005 chose Tailwind and PrimeNG; PrimeNG's Chart component needs `chart.js`, a new dependency.

### Options considered
| Option | For | Against |
|---|---|---|
| CSS bars in tables, no library (AI's recommendation) | No dependency; exact numbers visible; accessible | No real chart for the demo |
| Chart.js chart per section, with a CSS-bar table below | Charts everywhere, plus an accessible table | Two renderings of each section |
| **Chart.js for headcount, CSS bars for averages** | A chart where share-of-whole matters; a table where 18 labelled rows read better | One new dependency |
| A chart/table toggle per section | Flexible | More UI state to build and test |

Chart type for headcount: horizontal bar (AI's recommendation: lengths compare precisely) · **doughnut**
(share of the whole, total in the centre).

### Decision
Chart.js through PrimeNG's Chart component, for a **doughnut** of headcount by department. Average by
job title stays a table with CSS bars. **The engineer explicitly approved `chart.js` as a new dependency**
(`CLAUDE.md`, "No new dependencies without asking").

### Consequences
- It adds about 70 kB (gzipped) to the frontend bundle. It can be loaded lazily with the dashboard route
  if the first paint suffers.
- Angles are harder to compare than lengths, so the legend shows each department's count and
  percentage, and the total sits in the centre.
- Up to 6 slices need 6 colours that can be told apart, which must be checked for contrast in light
  and dark themes.
- A canvas chart is invisible to screen readers and DOM tests. The legend is real DOM, so it carries the
  numbers for both. Unit tests check the data passed to the chart, not the pixels.
- Revisit if a second chart is wanted: the dependency is now paid for.

---

## ADR-030 — A deployed `stage` branch in front of `main`

- **Date:** 2026-10-24
- **Status:** Accepted
- **Task:** process (built in 1.11). Amends the push rule in `CLAUDE.md`; builds on ADR-001 to ADR-004.

### Context
Every push to `main` deploys to production (ADR-001), so production is the first place a change can be
clicked. The engineer wants a testing branch that every change passes through before `main`.

### Options considered
| Decision | Options | Chosen |
|---|---|---|
| What stage is | **Branch plus a full deployed copy** (Vercel branch deploy, a second Render service, its own database) · branch with CI only (no manual check) · Vercel preview against the production API (test writes hit real data) | Full deployed copy |
| Stage database | **Neon branch of production** (own data, free; migrations hit stage first) · a separate Neon project · the production database | Neon branch |
| Promotion rhythm | After each slice (AI's recommendation) · **once per phase** · whenever the engineer chooses | Per phase |
| Promotion method | **PR stage → main, fast-forward only** · PR with a merge commit · squash merge (loses the test-first commit story) | Fast-forward |
| Who pushes | **The AI pushes a finished slice to stage after its summary; promotion to main needs the engineer's OK** · both need the OK · the AI pushes every commit to stage (half-finished slices would deploy) | AI to stage, engineer gates main |
| Production bug mid-phase | **`hotfix/*` from main**, PR to main, then merge main back into stage · fix on stage and promote early (ships half a phase) · wait for the phase end | `hotfix/*` |
| Stage frontend config | **An Angular `stage` build configuration**, chosen by the Vercel build command when `VERCEL_GIT_COMMIT_REF=stage` · runtime `config.json` (an extra startup request) · a Vercel dashboard env var (hidden from review) | Build configuration |
| Protecting main | **A ruleset: PR and green CI required, linear history** · protect stage as well (a PR per slice) · none (rule only) | Ruleset on main |
| PR vs fast-forward | **PR and CI required, with the repo admin on the bypass list for the fast-forward push** · merge commits instead · CI required but no PR | Admin bypass |

### Decision
As chosen above. **Promotion procedure, once per phase:**
1. Open a PR from `stage` to `main`. This gives one diff for the whole phase, and CI must be green.
2. After the engineer's OK, run `git push origin stage:main`. That is a fast-forward, so `main` gets
   exactly stage's commits, and GitHub marks the PR as merged.
3. Add the phase's `CHANGELOG.md` entry, and smoke test production.

**Why a bypass is needed:** GitHub's PR merge buttons cannot fast-forward. "Rebase and merge" re-creates
the commits with new IDs, so `stage` and `main` would diverge. The admin bypass lets the PR exist for
review and CI while the merge itself stays a true fast-forward.

### Consequences
- Every slice is clickable on stage before it reaches production, and stage migrations run against a
  copy of production's schema and data first.
- **Production lags stage by up to a phase.** A bug in production waits for the phase end unless it
  goes through `hotfix/*`.
- After a hotfix, `main` is merged back into `stage`. That merge commit is the only one stage ever gets,
  and stage still fast-forwards onto main.
- The bypass covers anything pushed with the engineer's credentials, including the AI's pushes. GitHub
  does not stop an AI push to `main`; the `CLAUDE.md` rule does. Accepted knowingly.
- A second Render free service shares the workspace's free-hours budget and cold-starts too (ADR-004).
  Stage's CORS allowlist is the stage Vercel URL (ADR-003).
- One-time dashboard setup by the engineer in 1.11: the Neon branch, the Render stage service's env
  vars, and checking the Vercel stage branch URL.
- The seed (6.4) runs on stage first, then on production.
- Until 1.11 is done there is no stage, so the old rule applies: nothing is pushed without the
  engineer's OK.

---

## ADR-031 — Building the stage environment

- **Date:** 2026-10-24
- **Status:** Accepted
- **Task:** 1.11. Builds on ADR-030 and settles the details it left open.

### Context
ADR-030 chose a fully deployed `stage` (Vercel branch deploy, a second Render service, a Neon branch) and
a ruleset on `main`. Building it forces smaller choices: how each piece is defined, when it deploys, how
the frontend knows it is stage, and what this slice tests.

### Options considered
| Decision | Options | Chosen |
|---|---|---|
| Render stage service | **Second entry in `render.yaml`** (reviewable, matches prod; a blueprint sync re-applies prod too) · created by hand in the dashboard (prod untouchable, but undocumented and drifts) | `render.yaml` |
| When stage deploys | Every push (fastest; red CI still deploys) · **`autoDeployTrigger: checksPass`** (red CI never reaches stage; ~5 min wait, and Vercel has no equivalent) | After checks pass, stage only. Prod unchanged |
| Vercel build switch | **Inline shell condition on `VERCEL_GIT_COMMIT_REF` in `vercel.json`** (one file; untestable string) · a `vercel-build.mjs` script (testable; extra file for one `if`) | Inline condition |
| Other preview branches | **Leave on the production configuration**, blocked by prod CORS (cannot write to prod; hotfix previews not clickable) · all non-`main` branches on `stage` with wildcard CORS · only `hotfix/*` on stage (wildcard CORS, and stage's schema may be a phase ahead of prod) | Leave as is |
| Stage frontend URL | Vercel's automatic branch URL (no setup; long, breaks on rename) · **a stable alias assigned to `stage` in Vercel Domains** (one dashboard step; name must be free) | Stable alias |
| `stage` Angular configuration | **Copy of `production` plus `fileReplacements` → `environment.stage.ts`** (same bundle shape as prod; no source maps) · based on `development` (debuggable; stops testing what prod ships) · production plus source maps | Copy of production |
| Environment marker | **`environment.name` shown on the health page** (small, testable addition) · a STAGE badge in the app shell (touches `UI_DESIGN.md`, shell not built yet) · none | Health page only |
| Neon stage lifecycle | Branch once, never reset · reset from prod at each promotion (manual step, wipes stage data) · **branch once now, decide at 6.4** | Decide at 6.4 |
| Ruleset creation | **Committed `.github/rulesets/main.json`, applied with `gh api`** after the engineer sees the command · created by hand in GitHub settings | Committed JSON |
| Ruleset extras | **Block force-push, block deletion, require up to date** · only the first two · only ADR-030's three rules | All three |
| Default branch | **`main`** (reviewers see production code) · `stage` (front page shows unreleased code) | `main` |
| What the slice tests | **Unit tests for the environment name and the stage URL, plus a verification checklist** · the health-page test only · checklist only | Tests plus checklist |
| Environment file layout | **`environment.ts` holds local values and is never replaced; `environment.production.ts` and `environment.stage.ts` are swapped in by their build configurations** (every environment importable by a test; touches the production build) · read `environment.ts` as text in the spec (fragile parsing) · hardcode the production URL in the test (duplicated, weaker test) | One file per environment |
| Pushing during 1.11 | **The AI may push `stage` freely within this task** · ask before each push | Free on `stage`; the ruleset is still applied only with the engineer's OK |

### Decision
As chosen above. The common reasons: stage is defined in reviewed config like production,
it only runs code that passed CI, it builds exactly what production builds, and nothing weakens the
ADR-003 CORS allowlist. Where a more elaborate option existed (a build script, Neon resets, a shell badge),
it was deferred until something needs it. The ruleset on `main` requires a PR (0 approvals), the `Backend tests` and
`Frontend tests` checks, up-to-date branches and linear history, and it blocks force-pushes and deletion.
The Repository admin role is on the bypass list.

### Consequences
- A commit with red CI can still reach the stage *frontend*, because Vercel does not wait for checks. For a
  few minutes the stage frontend can be newer than the stage backend.
- Previews of `hotfix/*` and other branches load but cannot reach any API. A hotfix is verified locally and
  by CI, then in production.
- The stage alias is part of the stage CORS allowlist. Renaming the alias means updating Render's
  `CORS_ALLOWED_ORIGINS` for stage.
- `.github/rulesets/main.json` can drift from GitHub if the ruleset is edited in the UI; re-apply the file
  instead.
- **Open until 6.4:** whether the Neon stage branch is reset from production at each promotion.
- Unit tests apply the `development` build configuration, so a file it replaces cannot be read by a test.
  Hence the layout above. A wrong production replacement would point production at localhost; C5 checks it.
- Production's Render service still deploys on every push to `main`. Making it wait for checks is a
  separate item.

---

## ADR-032 — Creating the stage Render service through `main`

- **Date:** 2026-10-24
- **Status:** Accepted
- **Task:** 1.11. Follows ADR-031 (stage service defined in `render.yaml`).

### Context
A Render Blueprint reads `render.yaml` only from the branch it is linked to, which is `main`. A service
entry added on `stage` would not exist until the phase promotion, so there would be no stage API and no
URL for `environment.stage.ts`. A per-service `branch: stage` is supported once the entry is on `main`.

### Options considered
| Option | For | Against |
|---|---|---|
| **A - Ship only the `render.yaml` entry to `main` first, via `hotfix/stage-render-service`** | Documented behaviour; the blueprint owns the service from day one | `main` changes before promotion, using the hotfix path for something that is not a fix; needs the engineer's OK for that push |
| B - Engineer creates the service by hand; the blueprint adopts it at promotion | `main` untouched until promotion | Adoption is undocumented: possible duplicate service or sync error; settings live only in the dashboard until then |
| C - Re-link the Blueprint to `stage` | `render.yaml` changes apply from `stage` | Production's Render settings would change from `stage`, bypassing ADR-030's gate on `main` |

### Decision
Option A. Because `stage` had not been pushed yet, the local `stage` commits were rebased onto the hotfix
commit instead of merging `main` back, so `stage` stays a plain fast-forward of `main`.

### Consequences
- `main` gains one commit that changes no production setting: the new entry is a separate service.
- Later `render.yaml` changes for stage still only take effect once they reach `main`. Stage service
  settings therefore change at promotion, or through another hotfix.

---

## ADR-033 — Stage stays behind Vercel's login

- **Date:** 2026-10-24
- **Status:** Accepted
- **Task:** 1.11. Follows ADR-031 (stage alias).

### Context
Vercel protects preview deployments with Vercel Authentication by default, and the stage alias is a
preview. Opening it without a Vercel login redirects to `vercel.com/sso-api`, so automated checks (`curl`)
cannot read the deployed stage page or bundle.

### Options considered
| Option | For | Against |
|---|---|---|
| A - Turn protection off for previews | Stage checkable by anyone, including scripts | Anyone with the URL can write to the stage database; hotfix previews become public |
| B - Keep it on, use the "Protection Bypass for Automation" secret | Private, and the deployed bundle stays checkable | A secret to create and keep out of the repo; Hobby availability unconfirmed |
| **C - Keep it on; the engineer checks the stage page in a browser, the AI checks a local `stage` build** | Private, no secret, no setting change | The deployed bundle is not inspected directly; a local/Vercel build difference would only show as a wrong environment name on the page |

### Decision
Option C.

### Consequences
- Stage verification after each slice includes a browser check by the engineer.
- Reviewers of the submission cannot open stage. They use production, which is public.
- Revisit if stage checks need automating (for example, an E2E run against stage in phase 8).

---

## ADR-034 — Production deploys only after CI passes

- **Date:** 2026-10-24
- **Status:** Accepted
- **Task:** 1.12. Extends ADR-031's stage choice to production.

### Context
Stage deploys only after green CI (`autoDeployTrigger: checksPass`, ADR-031). Production still deploys
every commit to `main`, so a commit whose CI fails would replace a working production API. The ruleset
on `main` requires green CI for PRs, but the admin bypass lets a push to `main` through without enforcing
that check, so only the promotion procedure, not GitHub, guarantees green CI.

### Options considered
| Decision | Options | Chosen |
|---|---|---|
| Route to `main` | **Commit on `stage`, promote at once** (normal tools; `stage` equalled `main`, so only this task's commits move; off the once-per-phase rhythm) · `hotfix/*` from `main` (stretches "hotfix" again) · wait for the Phase 3 promotion (prod keeps deploying red commits meanwhile) | Promote at once |
| Verification | **Render dashboard setting plus watching deploys** · also push a deliberately red commit (a red commit on `main`, or a throwaway promotion) · setting only | Setting plus watched deploys |
| Tracking | **Task 1.12 in `TASKS.md`** (findable; reopens a promoted phase by one line) · a `process-*` prompt file only | Task 1.12 |

### Decision
`autoDeployTrigger: checksPass` on `salary-management-api`, promoted at once as an exception to ADR-030's
once-per-phase rhythm, justified because `stage` held nothing else.

### Consequences
- Every production deploy waits about 5 minutes for CI after a promotion push.
- Vercel still deploys the production frontend without waiting, so for a few minutes after a promotion the
  frontend can be newer than the API. While the backend has no endpoints the frontend depends on, this is
  harmless. From phase 3 it can briefly show errors, and promotions should be smoke-tested once both tiers
  are up.
- Render does not document whether the blueprint sync applies before the deploy of the same push, so the
  push that delivers this setting may deploy under the old one. The evidence is the dashboard showing
  production's trigger as waiting for checks, then the next promotion's production deploy starting only
  after that push's CI run finishes.

---

### Previously pending

_All decided in task 2.3. Stack: ADR-019. PostgreSQL: ADR-020. `BigDecimal` and rounding: ADR-021.
SQL aggregations: ADR-022. Optimistic locking: ADR-023. Monorepo: ADR-024. Hosting: ADR-025, with
ADR-002 to ADR-004._
