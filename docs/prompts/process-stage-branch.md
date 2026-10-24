# Process — a stage branch in front of main

**Task:** process; built as 1.11 · **Date:** 2026-10-24 · **Tool:** Claude Code

## Prompt as given

> lets have a stage branch which will act like our testing branch before pushing everything to main.
> Ask me questions

## Outcome

Ten decisions were asked one at a time and recorded in ADR-030:
- **Stage is fully deployed:** a Vercel branch deploy, a second Render service and a Neon branch database.
- **Promoted once per phase**, through a PR from `stage` to `main` with green CI, then a fast-forward push.
- **The AI pushes finished slices to `stage`; `main` always needs the engineer's OK.**
- **Production bugs** go through `hotfix/*` from `main`, then are merged back into `stage`.
- **The stage frontend** uses an Angular `stage` configuration, chosen by the Vercel build.
- **A ruleset on `main`:** a PR and green CI required, with an admin bypass.

**One conflict was caught before building.** GitHub's PR merge buttons cannot fast-forward ("rebase and
merge" rewrites the commit IDs), so "PR required" and "fast-forward only" were incompatible. The
engineer chose an admin bypass for the fast-forward push.

Building it is task 1.11, in a fresh session, before 3.0.
