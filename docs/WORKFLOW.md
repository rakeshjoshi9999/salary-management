# Engineering Workflow: Requirement → Shipped

**Core principle:** AI drafts, I decide, tests prove it.

## The loop

1. **Understand**
   - Me: read the requirement and identify the user and the actual problem.
   - AI: acts as a critic — "find gaps, ambiguities and risky assumptions in this."
   - Output: clarifying questions sent to stakeholders.
2. **Define**
   - AI: drafts the scope from my notes.
   - Me: cut it down hard — what's in, what's out, and why.
   - Output: `REQUIREMENTS.md` with assumptions marked.
   - Gate: no design work until scope is signed off.
3. **Design**
   - AI: proposes two options for each key decision (database, structure, API shape).
   - Me: pick one and write down why.
   - Output: data model, API contract, ADRs in `docs/DECISIONS.md`.
4. **Slice**
   - Break the work into thin vertical slices, each with acceptance criteria.
   - Output: `TASKS.md` — the commit roadmap.
5. **Build each slice (TDD loop)**
   - I write the test list for the slice.
   - AI writes the failing tests; I review them. Commit `test: …`
   - AI writes the minimum code to pass. Commit `feat: …`
   - Refactor with tests green. Commit `refactor: …`
   - Rule: I review every diff and never commit code I can't explain.
6. **Verify**
   - Full test suite, lint, coverage, then a manual check.
   - A fresh AI session reviews the diff as a strict reviewer, with no memory of writing it.
7. **Ship**
   - Deploy, smoke test, update README and changelog.
8. **Reflect**
   - Log in `docs/AI_USAGE.md` what AI sped up, what it got wrong, and how I caught it.

## Guardrails
- **`CLAUDE.md` project rules:** test first, small diffs, no new dependencies without asking, follow existing structure.
- **One slice per AI session:** small context, fewer hallucinations.
- **Prompts saved in `docs/prompts/`:** reviewers can see exactly how AI was directed.
- **Conventional commits** (`test` / `feat` / `refactor` / `docs` / `chore` / `fix`): the history reads like a story.

## Tools
- **Claude Code** — builds each slice inside the repo: runs tests, iterates, proposes diffs I review and commit.
- **Claude (chat)** — design discussions, slice prompts, and independent review of diffs it didn't write.
