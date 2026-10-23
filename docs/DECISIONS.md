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

### Still pending

_Phase 2 (`TASKS.md` task 2.3) is where these get decided and written up. Each needs the
options-and-trade-offs conversation above before anything is recorded:_

- Stack choice — Java 21 / Spring Boot 4 + Angular
- PostgreSQL over SQLite
- `BigDecimal` for money, with the rounding rule
- Aggregations in SQL rather than in Java
- Optimistic locking for concurrent edits
- Monorepo over split repositories

_Hosting is already settled by ADR-002, ADR-003 and ADR-004. The stack line in `REQUIREMENTS.md`
records what was chosen; the ADR is where the reasoning and the rejected alternatives belong._
