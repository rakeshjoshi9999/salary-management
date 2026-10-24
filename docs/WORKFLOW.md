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
   - Break the work into thin vertical slices.
   - Output: `TASKS.md` — the commit roadmap. Acceptance criteria are set per slice in step 5.
5. **Build each slice (TDD loop)**
   - AI drafts the test list from the requirements and design docs; **I edit and approve it.** The approved
     list is the slice's acceptance criteria, saved with the slice's prompt in `docs/prompts/`.
   - AI writes the failing tests. A **reviewer agent** (a subagent with no memory of writing them,
     `.claude/agents/reviewer.md`) checks them against the list; AI fixes its findings. Commit `test: …`
   - AI writes the minimum code to pass. The reviewer checks the diff; AI fixes and re-runs the suite. Commit `feat: …`
   - Refactor with tests green. Commit `refactor: …`
   - At most two review rounds per step. Unresolved findings, disagreements and tests that look wrong
     come to me.
   - Rule: I read the end-of-slice summary and the diff **before anything is pushed**, and never let code
     I can't explain reach `main`, which auto-deploys.
6. **Verify**
   - Full test suite, lint (ESLint, Prettier check), coverage (JaCoCo), all in CI, then a manual check.
   - The reviewer agent's findings and how each was resolved go in the slice summary.
7. **Ship** (ADR-030)
   - Each finished slice is pushed to `stage`, which deploys to the stage environment (its own API and a
     Neon branch database). I try it there.
   - Once per phase: a PR from `stage` to `main`, green CI, **my OK**, then a fast-forward push. Production
     deploys; smoke test it; update the README and the phase's `CHANGELOG.md` entry.
   - Production bugs mid-phase: a `hotfix/*` branch from `main`, then merged back into `stage`.
8. **Reflect**
   - Log in `docs/AI_USAGE.md` what AI sped up, what it got wrong, and how I caught it.

## Guardrails
- **`CLAUDE.md` project rules:** test first, small diffs, no new dependencies without asking, follow existing structure.
- **One slice per AI session:** small context, fewer hallucinations. The design docs carry everything a
  fresh session needs.
- **Stage before production:** slices land on `stage`; nothing reaches `main`, which deploys to
  production, without my OK.
- **Prompts saved in `docs/prompts/`:** reviewers can see exactly how AI was directed.
- **Conventional commits** (`test` / `feat` / `refactor` / `docs` / `chore` / `fix`): the history reads like a story.

## Tools
- **Claude Code** — builds each slice inside the repo: runs tests, iterates, commits after the reviewer
  agent passes it, and stops before pushing.
- **Reviewer agent** (`.claude/agents/reviewer.md`) — a read-only subagent that reviews each slice's tests
  and implementation before they are committed.
- **Claude (chat)** — design discussions, slice prompts, and independent review of diffs it didn't write.
