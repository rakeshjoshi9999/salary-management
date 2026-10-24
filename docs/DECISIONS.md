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

### Previously pending

_All decided in task 2.3. Stack: ADR-019. PostgreSQL: ADR-020. `BigDecimal` and rounding: ADR-021.
SQL aggregations: ADR-022. Optimistic locking: ADR-023. Monorepo: ADR-024. Hosting: ADR-025, with
ADR-002 to ADR-004._
