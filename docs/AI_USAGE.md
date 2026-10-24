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
