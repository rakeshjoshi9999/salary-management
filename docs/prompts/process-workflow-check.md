# Process — workflow check before phase 3

**Task:** between 2.5 and 3.1 · **Date:** 2026-10-24 · **Tool:** Claude Code

## Prompts as given

> Check the workflow once before starting. Ask me question if any

When asked who makes the commits, the engineer redirected:

> can we have a reviewer agent which reviews the code before commit and fix any issues and commit
> again. No need of me for every commit

## Outcome

Claude compared `docs/WORKFLOW.md` with how the project had actually run and found eight gaps. Each was
settled one question at a time:

| Gap | Decision |
|---|---|
| Test list (WORKFLOW: "I write it") | AI drafts it; the engineer edits and approves it |
| Acceptance criteria (missing from `TASKS.md`) | The approved test list *is* the criteria, saved in the slice's prompt file |
| Lint and coverage (none set up) | JaCoCo, angular-eslint and a Prettier check in CI, as new task 3.0 |
| Fresh-session review (never done) | A reviewer subagent, `.claude/agents/reviewer.md`, read-only |
| Changelog (missing) | `CHANGELOG.md`, one entry per phase; phases 0 to 2 backfilled |
| One slice per session (2.1–2.5 ran in one) | A fresh session per slice from 3.0 on |
| Settings not in the requirements | Added to `REQUIREMENTS.md`, marked as added, at the engineer's request |
| Who commits | The reviewer-agent loop: AI commits after review and fixes; **the engineer approves every push** |

Human checkpoints per slice are now the test list (before any code) and the push (after the summary).
