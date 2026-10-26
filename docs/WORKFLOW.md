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

## Reading the commit history

A guide for a reviewer reading `git log --reverse` (task 8.6, 2026-10-26, at 177 commits). Every
commit was checked against the rules in `CLAUDE.md`; what follows is what the history shows, including
where it falls short. History is never rewritten: `main` is fast-forward only (ADR-048), so blemishes
stay and are named here instead.

**What to expect**

- **Every message is a conventional commit:** 79 `docs:`, 33 `test:`, 28 `feat:`, 26 `chore:`,
  5 `refactor:`, 4 `ci:`, 2 `fix:`. None carries an AI co-author trailer or attribution; the one commit
  that mentions it is `3f35c29`, which made that the rule.
- **From phase 3 on, each slice reads the same way:** a `docs:` commit recording the decisions (an ADR),
  then `test:` (failing tests, reviewed), then `feat:` (the code, reviewed), then `docs:` (roadmap tick,
  prompt and AI log). For example, task 3.5 is `b725c8d` → `579de80` → `0c4f037`.
- **The `docs:` share is high on purpose.** Decisions, prompts and outcomes are committed alongside the
  code they explain, so the reasoning for any change sits next to it in the log.

**Where it falls short of its own rules**

| Commits | What | Why, and what was done |
|---|---|---|
| `abc9008`–`e6df528` (phase 1) | The environment was scaffolded with `chore:` commits and no failing tests first | Scaffolding and configuration; there was no behaviour to drive. Test-first starts with CORS in 1.9 (`1e37365` → `8f9e722`) |
| `bf5c483` (1.3) | A `test:` commit for behaviour that already existed | Said so at the time: regression tests, not a red-green cycle (AI usage log) |
| `5064917`, `a4b6c9a` | Two `ci:` commits guessing GitHub Action versions | The AI assumed instead of querying the API; recorded under "Where AI was wrong" |
| `a1fbf70`, `f2fff59`, `07655f0` (3.0) | A broken CI step, an ADR that claimed the wrong deploy was blocked, and a missing index row, each fixed in a follow-up commit | Caught by the reviewer or the CI run; fixed forward |
| `90dac0a`, `fe4f57e` | A second `test:` commit inside a slice | Approved amendments to the test list, labelled as such in the message |
| `4643b89` (5.4) | A `test:` commit with no `feat:` | The edge cases already passed when written; the prompt file says so |
| `7557bd9` → `9a12f8c` (6.1–6.3) | Three tasks in one `test:` and one `feat:` | The three seeding tasks were built as one run, with one combined test list |
| `b277bef` (7.8) | A failing `test:` commit pushed to `stage`, so CI was red on `stage` until `3aac51b` | The push carried the test commit along with a finished slice; the backend deploy was unaffected (Render waits for checks) |
| `1439e90`, `a4558e3`, `38491bb`, `4b7fa52` (7.5, 7.6) | Tests for 7.6 were committed before the code for 7.5 | Two slices were reviewed in parallel; each `test:` still precedes its own `feat:` |
| `ff3ca91` | One `fix:` commit with two changes: the icons and the drawer heading | Found together in the same screenshot pass; should have been two commits |
| Day 1 | Four commit messages were rewritten and `.env.example` purged from history | Before anything was shared, at the engineer's request (AI usage log). The only rewrite in the project |

**Where each phase ends:** the changelog entries (`6082f68`, `12a46ad`, `ec6b32f`, `e608ce1`, `90b9dc7`,
`54dee03`), each followed by a promotion of `stage` to `main` (PRs #2 to #8; #1 created the stage Render service, ADR-032).

