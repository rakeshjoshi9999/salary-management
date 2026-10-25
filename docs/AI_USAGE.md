# AI Usage Log

How AI tools were used to build this project, and where human judgment corrected them.

## Tools
| Tool | Used for |
|---|---|
| Claude (chat) | Requirement analysis, clarifying questions, scoping, design options, slice prompts, independent code review |
| Claude Code | Implementing each slice test-first inside the repo |

## Ground rules
See [`CLAUDE.md`](../CLAUDE.md). Highlights: tests first, AI stops after writing failing tests for review, never edits tests to make them pass, no new dependencies without asking.

## Log
Newest first. One entry per notable AI interaction. Prompts are saved verbatim in [`prompts/`](prompts/).

| Date | Task | What AI did | What I changed / caught | Why |
|---|---|---|---|---|
| 2026-10-25 | process | Traced why stage never auto-deployed: all 12 stage pushes ended on a commit touching nothing under Render's `rootDir: backend`; asked one decision (ADR-040) and moved both services to `dockerfilePath`/`dockerContext` | **The engineer's pasted Render settings showed the Root Directory note that explained it;** the AI's first guess (GitHub app permissions) was wrong. The engineer also stopped two polling loops, now a saved preference | The slice loop's own habit, a `docs:` commit last, was what silently skipped every deploy; 1.11 had checked health, which an old build also passes |
| 2026-10-25 | 3.4 | Asked two decisions one at a time (ADR-039), including an ambiguity the contract left open (what `/employees/0` and `/abc` return); wrote 10 tests and `GET /{id}` | Chose explicit active queries over `@SQLRestriction`, and 404 for well-formed ids with the non-numeric 400 left to 3.7. The reviewer found two assertions too weak to catch a wrong id in the message or swapped fields | A not-found test that checks only the exception type passes even when the message names the wrong id |
| 2026-10-25 | 3.3 | Asked two decisions one at a time (ADR-038), wrote 10 tests and the duplicate-email 409 with a race backstop; kept 3.2's tests untouched by using `save()` + `flush()` instead of the ADR's `saveAndFlush` | **Asked to "check again" before 3.3; the check found stage had never auto-deployed a `stage` commit since 1.11**, so 3.0 to 3.2 had not reached stage. The engineer deployed manually. The reviewer caught a test that would pass a half-case-insensitive query; the engineer approved the amendment. Ran in the same session as 3.2 at the engineer's explicit request | 1.11's acceptance only checked health, which stays `UP` on an old build; "it deployed" needs a probe of something the new build does |
| 2026-10-25 | 3.2 | Asked to run all of phase 3 in one session, the AI raised the one-slice rule; then asked eight decisions one at a time (ADR-037), wrote 41 approved tests and `POST /api/v1/employees` | **Chose 3.2 only over the AI's recommendation to run all six slices.** The first test run showed the AI had been wrong that `@Digits` accepts `100.000`; the reviewer caught a `Set` that would hide duplicate errors per field, and a salary-format test that could not fail | The AI offered an option with a library claim it had not checked, the same mistake as `percentile_cont` in 2.2; it was caught by a test, not by review |
| 2026-10-24 | 3.1 | Asked four schema decisions one at a time (ADR-036), wrote 23 schema tests (22 approved, one added by amendment), then `V1__create_schema.sql` and `V2__seed_reference_data.sql` | The reviewer ran the failing tests against draft migrations and found the constraint test would fail even on a correct schema (it picked up Flyway's own primary key). It also found that names-only checks would pass a primary key on the wrong columns, and that an exact Flyway-history match would force 5.6 to edit an existing test. The engineer approved pinning full constraint definitions, a reference-table column test and a looser history check | A failing test only proves something if it can also pass; checking that a constraint exists is not checking that it is right |
| 2026-10-24 | 3.0 | Asked eight tooling decisions one at a time (ADR-035), then wired `.gitattributes`, Prettier, angular-eslint, JaCoCo, Vitest coverage and a `frontend-lint` CI job | The engineer cut the CI red-path checks to local only. The reviewer caught that ADR-035 claimed a style failure blocks Vercel deploys (it blocks only Render's) and that `main`'s ruleset did not require the new lint job | A gate is only real if the thing that enforces it lists it; an ADR states what the platform does, not what we wish it did |
| 2026-10-24 | 1.12 | Added `checksPass` to production in `render.yaml` and wrote ADR-034 | The reviewer caught that the AI's proposed evidence (a stage push) could not prove a production change, and the AI corrected its own earlier claim that stage's deploy had been seen waiting for CI | Verification has to test the thing that changed; a claim not observed is recorded as not observed |
| 2026-10-24 | 1.11 | Listed eleven open decisions in one message; after correction asked thirteen one at a time (ADR-031); found mid-build that Render Blueprints read `render.yaml` only from `main` and that tests cannot read a replaced environment file, and stopped to ask each time (ADR-032, ADR-033) | Asked for questions one by one; approved one push to `main`, a force-push of `stage`, and the ruleset | Each of those acts on shared state the engineer owns; the reviewer also caught a test that would have passed vacuously and a mis-encoded character that would have shown on both live pages |
| 2026-10-24 | process | Asked ten branching decisions one at a time and wrote ADR-030; flagged that GitHub cannot fast-forward a PR merge, which conflicts with requiring PRs on `main` | Chose promotion once per phase (AI had recommended per slice), and an admin bypass so fast-forward and required PRs can coexist | Two of the engineer's answers were incompatible on GitHub; raising the conflict before building avoided discovering it at the first promotion |
| 2026-10-24 | process | Compared `WORKFLOW.md` with actual practice, found eight gaps, asked them one at a time; wrote the reviewer agent and updated `CLAUDE.md`, `WORKFLOW.md`, `REQUIREMENTS.md` and `TASKS.md` | **Replaced approve-every-commit with a reviewer-agent loop, keeping two human gates: the test list and every push** | Per-commit approval cost the engineer's time without adding judgment; the push gate stays because `main` auto-deploys |
| 2026-10-24 | 2.5 | Asked UI decisions one at a time; wrote `UI_DESIGN.md` (wireframes, flows, states) and ADR-027 to ADR-029 | **Redirected twice mid-question:** Insights as landing with a "Catalog" section; backend Settings for a default country (IN); real charts (approved `chart.js`, doughnut); full phone support | The AI recommended a list landing, `localStorage` and no chart library; the engineer chose for the demo and for cross-device use, and the extra scope is now recorded as tasks 5.6 and 7.8 |
| 2026-10-24 | 2.4 | Checked the roadmap for UI design (none), added task 2.5; then asked seven structure decisions and drew five Mermaid diagrams plus ADR-026 | Asked for a UI design and flow step that the AI's roadmap had missed | Phase 2's "Done when" covered only the backend, so the frontend would have been designed while it was being built |
| 2026-10-24 | 2.3 | Asked eight decisions one at a time, asked for the real reasons instead of inventing them, wrote ADR-019 to ADR-025 | Recorded that the stack came from the brief and Java 21 is kept only because it is installed | Found open design questions inside "already decided" items: `@Version` alone ignores a stale client version, and JPQL cannot do the exact median |
| 2026-10-24 | 2.2 | Asked 26 API-contract decisions one at a time; wrote `openapi.yaml` and ADR-013 to ADR-018 | Chose money as a JSON number over AI's string recommendation | **AI caught its own errors after the answers:** it had offered `percentile_cont` (double precision) for an exact median, and assumed Postgres `round()` is HALF_EVEN (it rounds ties away from zero) |
| 2026-10-24 | 2.1 | Listed 13 data-model decisions with options and trade-offs, then asked them one at a time; wrote ADR-008 to ADR-012 and `DATA_MODEL.md` | **Pushed back on independent titles; AI changed its recommendation to dependent.** Also chose soft delete, sort indexes now, a 1950 hire-date floor, and five countries over AI's eight | The batched list was too much to answer at once; one question at a time surfaced follow-ups it had missed |
| 2026-10-23 | docs | Backfilled nine prompt files and this table | **Caught that 1.1–1.8 had shipped with no prompt file and no log row** | AI wrote rule 6 into `CLAUDE.md` and then did not follow its own rule for eight slices |
| 2026-10-23 | 1.9 | Found that Spring keeps two unrelated CORS configurations, put the choice up, wrote failing tests, stopped, then implemented | Chose both surfaces from one property rather than the actuator one alone | A half-configured CORS surface would block phase 3's first controller with an opaque browser error |
| 2026-10-23 | 1.8 | Checked Vercel's full `vercel.json` property table, committed the build config, verified the deployed bundle | Set Root Directory by hand and supplied the real URL | `rootDirectory` is not a `vercel.json` property, and AI had guessed the hostname wrongly |
| 2026-10-23 | 1.7 | Multi-stage Dockerfile with layered jars and `render.yaml`; built and ran the image locally before handing it over | **Fixed `DB_URL` after AI's bracketed placeholder broke the first deploy** | `<SM_PGHOST>` is the one placeholder style that survives a copy-paste intact |
| 2026-10-23 | 1.6 | Warned on the pooled endpoint, TLS, and matching Render's region to Neon's; repinned Postgres to 18 for parity | **Provisioned Neon through Vercel instead of the documented route** | The integration exposes the connection parts separately, removing the URL-rewriting step AI had called the fiddliest |
| 2026-10-23 | 1.5 | Resolved the dependency tree, found Angular 20 cannot reach a patched Vitest, put four options up | Chose Angular 20 first, then Angular 21 once the advisories surfaced | Shipping a toolchain with two critical advisories is worse than an afternoon's re-scaffold |
| 2026-10-23 | 1.4 | Wrote the CI workflow; found `mvnw` committed non-executable, which would have failed on Linux | — | Git on Windows sets `core.fileMode=false`, so the wrapper lost its executable bit |
| 2026-10-23 | 1.3 | Wrote the Testcontainers base class and connectivity tests, then stopped at the review gate | Approved and asked to continue | AI reported unprompted that these were regression tests, not driving tests — the behaviour already existed |
| 2026-10-23 | 1.1–1.2 | Scaffolded the backend after finding Spring Initializr no longer offers Boot 3 | Approved changing the documented stack to Boot 4 | Boot 3.x receives no upstream security patches; `REQUIREMENTS.md` was written before that was known |
| 2026-10-23 | 1.x | Proposed a walking skeleton and reordered the roadmap so the environment is built before the domain | **Asked for the environment first, before any coding** | Deployment and database connectivity are where this project would actually break, so they break on day one rather than the night before submission |
| 2026-10-23 | process | Rewrote `CLAUDE.md` to require options, trade-offs and a recommendation before any task; added the ADR template | Asked to be interrogated before each task, and for decisions to be documented | A decision that is not written down gets re-litigated |
| 2026-10-23 | process | Rewrote four commit messages, then purged `.env.example` from all history | Asked for the AI co-author trailer removed, and later the file purged | The commit history is the engineer's record; AI involvement belongs in this log instead |

## Where AI was wrong

Kept deliberately specific, because a list of successes proves nothing about how the tool
was supervised.

- **Claimed in ADR-035 that a lint failure holds back both deploys in 3.0.** ADR-031 and ADR-034 already
  recorded that Vercel never waits for CI; the reviewer caught it, and a correction addendum fixed it.
- **Batched eleven decisions into one message in 1.11**, which the engineer had to stop ("Always ask me
  questions one by one"). It also wrote a `·` through a script using the Windows default encoding,
  which would have shown as `�` on both health pages had the reviewer not caught it.
- **Ran five slices (2.1 to 2.5) in one session**, against the one-slice-per-session guardrail it had
  helped write. It was caught only when the engineer asked for a workflow check before phase 3.
- **Offered two technically wrong options in 2.2 and only caught them after they were answered.**
  `percentile_cont` computes in double precision, and Postgres `round()` is not HALF_EVEN. Both were
  corrected in ADR-017 before any code was written, but they should have been checked before being offered.
- **Broke a deploy with its own placeholder convention.** The setup guide wrote
  `<SM_PGHOST>`; the angle brackets were pasted into `DB_URL` and Render failed with
  `UnknownHostException` on a bracketed hostname.
- **Got GitHub Action versions wrong twice.** It reached for `@v4` reasoning that older
  majors were conservative, was told by the runner that all three were deprecated,
  guessed `@v5`, and only found the real latest versions after querying the API. Two
  wasted round trips from assuming instead of checking.
- **Guessed both deployment hostnames and was wrong on both.** Neither is derivable from
  the repository; Render appends a random suffix when a service name is taken globally.
- **Estimated the Docker image at ~180 MB; it was 392 MB.** It put a number on it before
  measuring.
- **Chose an Angular version before resolving the dependency tree.** The critical Vitest
  advisories that made Angular 20 untenable were only found after scaffolding it, costing
  a re-scaffold that an earlier `npm audit` would have avoided.
- **Did not maintain the prompt log it had itself mandated** until the gap was pointed out,
  eight slices in.
- **Wrote tests that drove nothing in 1.3** — though it said so unprompted rather than
  presenting them as a red-green cycle.

## Reflections
_What AI accelerated, where it struggled, and what I'd do differently — filled in at the end._
