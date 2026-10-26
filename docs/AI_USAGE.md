# AI Usage Log

How AI tools were used to build this project, and where human judgment corrected them. The overview
answers three questions: how AI was used, where it was wrong, and where the engineer chose differently.
The log underneath is the evidence, one row per notable interaction.

## Overview

### How AI was used

One loop, for every task (`CLAUDE.md`, [`WORKFLOW.md`](WORKFLOW.md)):

1. **The AI asks before it builds.** It names every decision a task forces, gives at least two real
   options with what each costs, recommends one and says what would change its mind. Questions go one
   at a time. The engineer chooses.
2. **The decision is written down** as an ADR in [`DECISIONS.md`](DECISIONS.md), including the options
   that lost.
3. **The engineer approves the test list**, which becomes the slice's acceptance criteria.
4. **Failing tests first.** A separate reviewer agent (`.claude/agents/reviewer.md`) reads the tests and
   asks: would a wrong implementation pass this? Then a `test:` commit.
5. **Minimum code to pass**, the full suite, the reviewer again, then a `feat:` commit and a push to
   `stage`. Two review rounds at most; anything still open goes to the engineer.
6. **Production only by promotion**, once per phase, with the engineer's OK for that push (ADR-030,
   ADR-048).

The AI never had credentials for Neon or Render: the engineer ran every command against a live
database, and watched every deploy.

### Where it was wrong

The same few mistakes recur, which is the useful finding. Each links to cases in the log below.

| Pattern | Cases | What caught it |
|---|---|---|
| **Claiming something it had not checked** | `percentile_cont` offered for an exact median and Postgres `round()` assumed HALF_EVEN (2.2); `@Digits` said to accept `100.000` (3.2); a `double` said to miss the exact median (5.1); a trailing backslash said to give a 500 and wider indexes said to "buy nothing" (4.x); guessed hostnames, image size and action versions (phase 1) | A test run, the reviewer, or the platform itself, rarely the AI |
| **Tests that a wrong implementation would pass** | Fixtures whose expected order was also alphabetical (5.x, 7.2, 7.5); a page-overlap test that passed without the tiebreak (4.1); a constraint test that failed even on a correct schema (3.1); a settings test reloading a country that was not in the fixture (7.8) | The reviewer agent, whose first question is exactly this |
| **Ignoring a standing instruction** | Batched questions after "ask me one by one" (1.11, and again in 7); five slices in one session against the one-slice rule (2.1–2.5); the prompt log it had mandated, skipped for eight slices (1.x) | The engineer, each time |
| **Placeholders and commands that break when pasted** | `<SM_PGHOST>` pasted into `DB_URL` (1.7); `<stage-host>` run literally in psql (6.4) | The engineer's failed run |
| **What only a real browser shows** | No icon rendered anywhere, from phase 1 to phase 7, because PrimeIcons was never installed; unit tests in jsdom passed throughout | Screenshots taken by the AI at the end of phase 7 |
| **Checking the wrong thing** | Stage "deployed" judged by a health check an old build also passes (1.11–3.3); proposed evidence for a production change taken from stage (1.12) | The engineer's "check again"; the reviewer |

### Where the engineer chose differently

The AI recommended; the engineer decided. The records say so wherever the engineer went the other way:

| Decision | AI recommended | Engineer chose | Record |
|---|---|---|---|
| Landing page | The employee list (zero clicks to the salary task) | Insights | ADR-027 |
| Section name | "Employees" | "Catalog" | ADR-027 |
| Screen sizes | Desktop-first | Fully responsive, phones included | ADR-027 |
| Charts | CSS bars, no library | Chart.js doughnut for headcount | ADR-029 |
| Default country | Kept in the browser | A backend setting (a scope addition) | ADR-028 |
| Seed names | Hand-written lists | Datafaker, pinned | ADR-049 |
| Bundle over budget | Raise the warning budget | Trim the shell | ADR-052 |
| Money in JSON | A string | A number | ADR-015 |
| Job titles | Independent of department (changed after pushback) | Dependent on department | ADR-008 |
| Promotion cadence | Per slice | Once per phase | ADR-030 |
| Phase 3 in one session | All six slices | One slice | 3.2 row |

### Prompts

Every slice's prompt, decisions, approved test list and outcome are in [`prompts/`](prompts/):
requirement analysis (`0.0`), environment (`1.1`–`1.12`), design (`2.1`–`2.5`), employee CRUD
(`3.0`–`3.7`), finding employees (`4.1`–`4.5`), insights (`5.1`–`5.6`), seeding (`6.1`–`6.4`),
frontend (`7.1`–`7.8`, with the combined test list in `7.1`), docs and submission (`8.1`), and two
process changes (`process-stage-branch`, `process-workflow-check`).

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
| 2026-10-26 | 7.1–7.8 | Sent all thirteen phase 7 decisions in one message, was told "Ask me one by one", then asked them singly (ADR-051, all on the AI's recommendation); wrote all eight test lists for one batch approval; built 7.1→7.8 test-first with the reviewer at each step, then ran the Playwright paths locally and took screenshots at desktop and phone width | **The engineer had to correct the AI's batching despite a saved instruction to ask one at a time**; the memory now says "ask all questions" still means one by one. The reviewer caught tests that wrong code would pass (fixtures whose order matched a sort, a test reloading a country absent from the fixture) and real bugs (the add form submitting empty fields while reference data loaded, a stale refresh flag, a double toast). **Screenshots, not tests, showed that no icon rendered**: PrimeIcons was never installed, since phase 1 | Unit tests in jsdom cannot see what a user sees: a page needs one look in a real browser before it ships |
| 2026-10-26 | 6.4 | Gave the engineer the steps to seed stage and capture its list plans from their own shell (ADR-049: the AI has no Neon credentials); recorded the stage seed time (3.9 s) and the stage plans in `docs/PERFORMANCE.md`; asked whether to reset the Neon stage branch at each promotion, which became ADR-050 (never reset) | **The AI's psql command kept `<stage-host>` placeholders, which the engineer ran literally;** the AI then gave a command with the real host taken from the seed log and the password kept in `PGPASSWORD`. The AI's own script edit to the plans table dropped the local timing column; it caught that in its own diff review and rewrote the rows before committing. The AI also asked the engineer to confirm that the endpoint in the seed log belonged to stage, not production, before pushing | A command the engineer will paste is complete or has its placeholders called out; review your own diff before committing, even for docs |
| 2026-10-26 | 6.1–6.4 | At the engineer's request, asked all twelve phase 6 questions up front in three batches rather than one by one (ADR-049); built the generator, the idempotent seeder and the `seed` profile test-first (24 tests); measured the seed at 2.0–2.2 s locally; wrote a read-only psql plan script and found that deep pages switch to a full scan plus sort on tie-heavy seeded data | **Chose Datafaker over the AI's recommendation of hand-written name lists;** the AI pinned the version and added a golden test so an upgrade cannot silently change the seed. The reviewer found the id-collision test could pass with the wrong id block (`V..V+49`), so a range assertion was added, and noted an unguarded race (a first API create during the seed of an empty database), now documented | An id scheme that is safe only against one optimizer's semantics needs a test that checks the scheme itself, not one that waits for a collision |
| 2026-10-25 | 5.1–5.6 | Asked four phase 5 questions (ADR-047, ADR-048 after a second squash merge), built six slices, kept insights aggregation in SQL with an exact `percentile_disc` median | **The AI claimed a `double` could not reproduce its `medianIsExact` answer; it could, so the test could not fail.** The reviewer also caught: insights sorted on the unrounded average (titles shown as equal out of order), fixtures whose expected order was also alphabetical, a Postgres 18 catalog change (NOT NULL as constraints), and a committed slice test that every new controller would break | Third time a hand-picked "edge case" value turned out not to be one; the reviewer now proves such tests by mutating the code |
| 2026-10-25 | 4.1–4.5 | Asked eight phase 4 questions one at a time (ADR-044, ADR-045), built five slices, and found while reading plans that the trigram indexes sit unused until VACUUM | The reviewer caught: a page-overlap test that passed without the tiebreak, a name-OR-email fixture that hid the name side, a two-sort test that passed by accident, and a plan-report command that ran nothing. **The AI twice claimed something it had not checked**: that an unescaped trailing backslash gives a 500, and that widening the sort indexes "would buy nothing measurable". It also wrote ADR-046 without asking | A plan report has to be read critically, not summarised: the trigram finding and the 1.4 ms tiebreak sort were both in the output |
| 2026-10-25 | 3.6–3.7 | At the engineer's request, asked all eight remaining phase 3 questions up front, one at a time (ADR-042, ADR-043), had both test lists approved at once, then built both slices | The reviewer found three gaps the AI's design had missed: Spring's own 500s skipped the `errorId`, Boot's `/error` page had no code, and a committed test would not start once the handler needed a bean. The engineer decided each, plus accepting CORS 403s as the one non-Problem response | "Every response has a code" needed checking from outside Spring MVC too; MockMvc never dispatches to `/error`, so only a full-app probe showed it |
| 2026-10-25 | 3.5 | Asked three decisions one at a time (ADR-041), including a contract ambiguity (a PUT that changes nothing cannot raise the version without a forced write); wrote 26 tests including a real race between two transactions, and `PUT /{id}` | Chose to fix the contract wording rather than force a version bump. The reviewer found the drift test between the two request records covered only 13 rules; the engineer approved adding the rest | Repeating validation rules is only safe when a test fails on every rule that can be dropped |
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

_Drafted by the AI from the log above, for the engineer to edit into their own words before submission._

- **What it accelerated:** the volume of careful work. Every task got a written set of options, an ADR, a
  test list and two independent reviews, which would not have happened at this pace by hand. The
  reviewer agent was the best value: it found real defects in almost every slice.
- **Where it struggled:** confidence without checking. Its errors were rarely in code that a test
  exercised; they were in claims about libraries, platforms and its own tests. And it drifted from
  standing instructions when a request seemed to invite it.
- **What I'd do differently:** take one look at the running app in a real browser at the end of every
  frontend slice, not only at the end of the phase; and make the reviewer's "would wrong code pass this?"
  check part of writing a test, not only of reviewing it.
