# Architecture Decision Records

Each decision: context, options considered, decision, and consequences.

## How a decision gets made

No architectural choice is made silently, and none is made by the AI alone. Before a task starts, the
AI surfaces every decision the task forces and presents **at least two real options** with concrete
trade-offs — performance, complexity, testability, operational cost, and what each option makes hard
later — plus a recommendation and the reasoning behind it. The engineer chooses. Only then is the
decision recorded here. The full rule lives in [`../CLAUDE.md`](../CLAUDE.md) under "How we work".

This file is **append-only**. An ADR is never edited away once decided; a decision that changes gets a
new ADR that supersedes the old one and links back to it, so the reasoning at the time stays readable.

Numbering is sequential (`ADR-001`, `ADR-002`, …) in the order decided, never renumbered.
Status is one of: `Accepted` · `Superseded by ADR-NNN` · `Deprecated`.

## Template

```markdown
## ADR-NNN — <short title in plain language>

- **Date:** YYYY-MM-DD
- **Status:** Accepted
- **Task:** <TASKS.md id, e.g. 1.3>

### Context
What forced a decision here? The constraint or requirement driving it, with a link to the relevant
part of REQUIREMENTS.md. What would break if we chose badly.

### Options considered
| Option | For | Against |
|---|---|---|
| **A — <name>** | … | … |
| **B — <name>** | … | … |

### Decision
Option X, because … (the reason, not a restatement of the option).

### Consequences
- What this makes easy, and what it now makes hard or expensive.
- What we accept as a known cost.
- What would make us revisit this — the signal to watch for.
```

## Index

| ADR | Decision | Status | Date |
|---|---|---|---|
| _none yet_ | | | |

---

## Decisions

_Phase 2 (`TASKS.md` task 2.3) is where these get decided and written up. Pending, each needing the
options-and-trade-offs conversation above before anything is recorded:_

- Stack choice — Java 21 / Spring Boot 3 + Angular
- PostgreSQL over SQLite
- `BigDecimal` for money, with the rounding rule
- Aggregations in SQL rather than in Java
- Optimistic locking for concurrent edits
- Monorepo over split repositories
- Hosting — Vercel for the frontend, Render for the backend

_The stack and hosting lines in `REQUIREMENTS.md` record what was chosen; the ADR is where the
reasoning and the rejected alternatives belong._
