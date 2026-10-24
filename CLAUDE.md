# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

It is also the AI working agreement: the human engineer owns every decision; AI drafts, the engineer reviews, tests prove it.

## Project
Salary management app for an HR Manager handling ~10,000 employees across countries.
Read `REQUIREMENTS.md` before any task. Do not build anything listed under "Deliberately out of scope".

- `backend/` — Java 21, Spring Boot 4, PostgreSQL, Flyway, JUnit 5, Mockito, AssertJ, Testcontainers
- `frontend/` — Angular (standalone components, signals), component library per `docs/DECISIONS.md`
- `docs/` — workflow, decisions (ADRs), AI usage log, prompts

## Repo state
Phases 0–2 are done: a walking skeleton (health endpoint + health page) is live on Vercel → Render → Neon,
with CI on every push, and the design is complete. There is **no domain code yet** — no migrations,
entities or API beyond `/actuator/health`. `TASKS.md` is the authoritative roadmap and names the next task.
Do not assume a schema or an API exists in code: check first.

The design docs are the source of truth for building — read the ones a slice touches before proposing tests:
`docs/DATA_MODEL.md` (schema), `docs/openapi.yaml` (API contract), `docs/ARCHITECTURE.md` (structure),
`docs/UI_DESIGN.md` (screens), and `docs/DECISIONS.md` (ADR-001 to ADR-030, the reasons). A slice that
contradicts them stops and asks; a change to them is a new ADR, not a quiet edit.

## Commands

| Area | Command |
|---|---|
| Local Postgres | `docker compose up -d` (host port **5433**) |
| Backend tests | `cd backend && ./mvnw test` (needs Docker: Testcontainers starts its own Postgres) |
| One backend test | `./mvnw test -Dtest=EmployeeServiceTest#rejectsSalaryOfZero` |
| Run backend | `cd backend && ./mvnw spring-boot:run` (port **8081**; env vars `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `CORS_ALLOWED_ORIGINS`) |
| Frontend tests (once) | `cd frontend && npx ng test --watch=false` (`npm test` runs in watch mode) |
| Frontend dev server | `cd frontend && npm start` (port 4200) |
| Frontend build | `cd frontend && npx ng build` |

On Windows, use `mvnw.cmd` from cmd/PowerShell. When a phase adds an entry point, record it here.

## How we work
1. **One slice per session.** Work only on the task named in the prompt — slices are the numbered tasks in
   `TASKS.md`. If something else needs changing, stop and say so.
2. **Decide before building — interrogate me first.** Do not start a task by writing code. Open with the
   decisions the task actually forces, and keep asking until they are settled:
   - Name each decision point, including the ones I have not thought of.
   - For each, give **at least two real options** — not a strawman and a favourite.
   - State the **trade-offs** concretely: performance, complexity, testability, operational cost,
     what it makes hard later. Say what each option *costs*, not just what it gives.
   - Give a **recommendation and the reason for it**, and name what would change your mind.
   - Flag anything `REQUIREMENTS.md` leaves ambiguous rather than picking for me.
   - Then **stop and wait** for my call. I choose; you do not decide architecture by default.
   Err on the side of too many questions. A wrong assumption is more expensive than an extra question.
3. **Record the decision.** Once I choose, write it up as an ADR in `docs/DECISIONS.md` using the format
   in that file — context, options considered, decision, consequences — including the options I rejected
   and why. A decision that is not written down will be re-litigated.
4. **Test first, always — the slice loop.** After the decisions are settled:
   1. **Test list (my gate).** Draft a numbered list of behaviours to test — test name plus one line each —
      from `REQUIREMENTS.md` and the design docs. Stop until I approve or edit it. The approved list *is*
      the slice's acceptance criteria; save it in the slice's prompt file.
   2. **Failing tests.** Write them, run them, and confirm each fails for the right reason. Spawn the
      `reviewer` subagent (`.claude/agents/reviewer.md`) on the diff, fix its findings, then commit `test:`.
   3. **Minimum code.** Make the tests pass, run the full suite, then spawn `reviewer` on the diff, fix the
      findings and re-run the suite. Commit `feat:`, and `refactor:` (only with all tests green) if needed.
   4. **Limits.** At most two review rounds per step. A finding still open after that, a disagreement with
      the reviewer, or a test that looks wrong comes to me. Never weaken a test to make it pass.
   5. **Report, then push to stage.** End with one summary: the commits, test results, reviewer findings
      and how each was resolved. Then push the slice to `stage`, which deploys to the stage environment
      for me to try. **Never push to `main`.** Promotion (`stage` → `main`, once per phase) and hotfixes
      wait for my explicit OK (ADR-030). Until task 1.11 creates `stage`, nothing is pushed without my OK.
5. **Small diffs.** Prefer many small changes over one large one.
6. **Explain non-obvious choices** in a short note after the change, not in code comments.
7. **Ask, don't assume.** If a requirement is ambiguous, ask a question instead of guessing.
8. **Leave a paper trail.** The prompt that drove a slice goes in `docs/prompts/<task-id>-<short-name>.md`
   with the approved test list and a one-line outcome; notable AI interactions get a row in
   `docs/AI_USAGE.md`, including what the engineer or the reviewer corrected. When a phase is finished,
   add its entry to `CHANGELOG.md`. `docs/WORKFLOW.md` describes the full requirement→shipped loop.

## Rules
- No new dependencies without asking first and stating why.
- Never edit or delete existing tests to make them pass. If a test seems wrong, say so.
- Never commit secrets; config comes from environment variables.
- Do not touch `REQUIREMENTS.md` unless asked.
- `docs/DECISIONS.md` is append-only: add an ADR once I have approved a decision (see "How we work" 3).
  Never rewrite or delete an existing ADR — supersede it with a new one that links back.
- Run the relevant tests before declaring a task done, and report the result honestly.
- Branches (ADR-030):
  - Slices are committed on `stage` and pushed there after the slice summary.
  - `main` changes only by promotion: a PR from `stage`, green CI, the engineer's OK, then
    `git push origin stage:main` (fast-forward only).
  - A production fix goes on `hotfix/<name>` from `main`, through a PR with the engineer's OK, and is then
    merged back into `stage`.
  - Never push to `main` without the engineer's explicit OK for that push. GitHub's admin bypass does
    not stop it; this rule does.

## Testing standards
- Tests are fast, deterministic, and independent: no real clock, randomness, or network in unit tests (inject `Clock`, use fixed seeds).
- Test names describe behavior: `rejectsSalaryOfZero`, `returnsMedianForEvenCount`.
- Structure: Arrange / Act / Assert. One behavior per test.
- Spring Boot 4 removed `@MockBean`; use `@MockitoBean` (and `@MockitoSpyBean`) in slice tests.
- Pyramid: mostly unit tests (domain + service with fakes); slice tests (`@WebMvcTest`, repository tests with Testcontainers); one or two E2E happy paths.

## Backend conventions
- Layering: `controller` → `service` → `repository`; domain logic lives in the domain/service, not controllers.
- Money is `BigDecimal`, never `double`. Round to 2 decimals with `HALF_EVEN`.
- Aggregations (min/max/avg/median/counts) run in SQL, not in Java loops.
- DTOs at the API boundary; entities never leave the service layer.
- Errors use RFC 7807 Problem Details; never leak stack traces.
- Schema changes only through Flyway migrations.
- Currency is derived from the country, never accepted from the client; countries come from a supported set.
- Updates use optimistic locking (`version`); a stale update is a 409, never a silent overwrite.

## Frontend conventions
- Standalone components, signals for state, `OnPush` change detection.
- Feature folders: `employees/` (the "Catalog" in the UI), `insights/`, `settings/`; cross-cutting services in
  `core/`; presentational shared UI in `shared/` (`docs/ARCHITECTURE.md`, `docs/UI_DESIGN.md`).
- Services own HTTP calls; components stay presentational where possible.
- List filters and pagination are reflected in URL query params.
- Every data view handles loading, empty, and error states.

## Commits
Conventional commits, one logical change each:
`test:` failing tests · `feat:` implementation · `refactor:` no behavior change · `docs:` · `chore:` · `fix:`
- No `Co-Authored-By` trailer and no AI attribution in commit messages. The commit history is the
  engineer's; AI involvement is recorded in `docs/AI_USAGE.md` instead.
