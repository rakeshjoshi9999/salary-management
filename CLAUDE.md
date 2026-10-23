# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

It is also the AI working agreement: the human engineer owns every decision; AI drafts, the engineer reviews, tests prove it.

## Project
Salary management app for an HR Manager handling ~10,000 employees across countries.
Read `REQUIREMENTS.md` before any task. Do not build anything listed under "Deliberately out of scope".

- `backend/` — Java 21, Spring Boot 3, PostgreSQL, Flyway, JUnit 5, Mockito, AssertJ, Testcontainers
- `frontend/` — Angular (standalone components, signals), component library per `docs/DECISIONS.md`
- `docs/` — workflow, decisions (ADRs), AI usage log, prompts

## Repo state
`backend/` and `frontend/` are empty placeholders — nothing is scaffolded yet. Phase 0 (Foundation) is
done; `TASKS.md` is the authoritative roadmap and names the next phase. Do not assume a build, a schema,
or an API exists: check first. `docs/DECISIONS.md` is still a stub, so design questions are open, not
already answered elsewhere.

## Commands
No build exists yet. As phases land, the expected entry points are:

| Area | Command |
|---|---|
| Backend tests | `cd backend && ./mvnw test` |
| One backend test | `./mvnw test -Dtest=EmployeeServiceTest#rejectsSalaryOfZero` |
| Local Postgres | `docker compose up -d` (task 2.2) |
| Frontend tests | `cd frontend && npm test` |
| Frontend dev server | `cd frontend && npm start` |

When you scaffold a phase, record the real commands here, replacing the expected ones.

## How we work
1. **One slice per session.** Work only on the task named in the prompt — slices are the numbered tasks in
   `TASKS.md`. If something else needs changing, stop and say so.
2. **Test first, always.**
   - Write the failing test(s) first and stop. Wait for review before implementing.
   - Then write the *minimum* code to make them pass.
   - Refactor only with all tests green.
3. **Small diffs.** Prefer many small changes over one large one.
4. **Explain non-obvious choices** in a short note after the change, not in code comments.
5. **Ask, don't assume.** If a requirement is ambiguous, ask a question instead of guessing.
6. **Leave a paper trail.** The prompt that drove a slice goes in `docs/prompts/<task-id>-<short-name>.md`
   with a one-line outcome; notable AI interactions get a row in `docs/AI_USAGE.md`, including what the
   engineer corrected. `docs/WORKFLOW.md` describes the full requirement→shipped loop.

## Rules
- No new dependencies without asking first and stating why.
- Never edit or delete existing tests to make them pass. If a test seems wrong, say so.
- Never commit secrets; config comes from environment variables.
- Do not touch `REQUIREMENTS.md` or `docs/DECISIONS.md` unless asked.
- Run the relevant tests before declaring a task done, and report the result honestly.

## Testing standards
- Tests are fast, deterministic, and independent: no real clock, randomness, or network in unit tests (inject `Clock`, use fixed seeds).
- Test names describe behavior: `rejectsSalaryOfZero`, `returnsMedianForEvenCount`.
- Structure: Arrange / Act / Assert. One behavior per test.
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
- Feature folders: `employees/`, `insights/`; shared UI in `shared/`.
- Services own HTTP calls; components stay presentational where possible.
- List filters and pagination are reflected in URL query params.
- Every data view handles loading, empty, and error states.

## Commits
Conventional commits, one logical change each:
`test:` failing tests · `feat:` implementation · `refactor:` no behavior change · `docs:` · `chore:` · `fix:`
- No `Co-Authored-By` trailer and no AI attribution in commit messages. The commit history is the
  engineer's; AI involvement is recorded in `docs/AI_USAGE.md` instead.
