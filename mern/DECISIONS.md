# Decisions for `mern/`

A React + Node.js + MongoDB version of the salary app, built as an interview refresher. The Angular and
Java apps in `frontend/` and `backend/` are the original assignment and stay untouched. This file follows
the format of `../docs/DECISIONS.md`: context, options considered, decision, consequences. It is
append-only; a decision that changes gets a new ADR that supersedes the old one.

## ADR-M1 — Stack: Express 5, TypeScript strict, Mongoose, ObjectId, regex search, Testcontainers, Vitest

- **Date:** 2026-11-13
- **Status:** Accepted
- **Task:** M1 (server skeleton). Each decision was asked one at a time.

### Context
The engineer is preparing for an interview whose stack is React and Node.js, and last used Node, MongoDB
and React long ago. The aim is to relearn the core concepts by building the same product, so the choices
favour what interviews probe over what is quickest to ship. `REQUIREMENTS.md` and `docs/openapi.yaml`
are the spec. MongoDB is assumed to stay (MERN); the engineer can say otherwise.

### Options considered
| Decision | Options | Chosen |
|---|---|---|
| Language | **TypeScript, strict** · plain JavaScript (ES modules) | TypeScript |
| Server framework | **Express 5** · NestJS (hides middleware order and the request lifecycle) · Fastify (rarely asked in interviews) | Express 5 |
| Database layer | **Mongoose** (schemas, hooks, `lean()`, `optimisticConcurrency`) · the native `mongodb` driver | Mongoose |
| Employee id | **`ObjectId` strings** · integers from a counters collection (an extra write per create, and a classic anti-pattern) | ObjectId |
| Name-or-email search | **A lowercase `searchKey` field and an escaped regex** · a `$text` index (whole words only) · Atlas Search (Atlas only) | Regex field |
| Test database | **Testcontainers** (a real `mongo:7` in Docker) · `mongodb-memory-server` | Testcontainers |
| Test runner | **Vitest and Testing Library** · Jest | Vitest |

### Decision
As chosen above, each on the AI's recommendation. For the framework, the AI first recommended NestJS
(it mirrors the Java layering) and changed to Express once the goal was an interview refresher.

**Layout.** `mern/server` (Node, Express, Mongoose) and `mern/client` (React). Work happens on a `mern`
branch; nothing is added to CI or deploys without asking.

**Contract.** `docs/openapi.yaml` stays the spec with one deliberate change: an employee's `id` is an
`ObjectId` string, not an integer. The new React client is built for that; the Angular client keeps
using the Java API.

### Consequences
- The search is a scan over a derived field, fine for 10,000 employees. The scale ladder if it grows
  (index on `searchKey`, then word-prefix tokens with a multikey index and an anchored regex, then
  n-grams, then a search engine) is written down in `docs/lessons/` and can be measured with `explain()`.
- Ids in URLs are 24 hex characters; the server must validate them (`isValidObjectId`) so a bad id is a
  400 or 404, not a casting error.
- Mongoose's abstraction has gotchas (casting, `lean()` against documents, typing of `aggregate`); the
  lessons show the native-driver equivalent where it teaches something.
- Testcontainers needs Docker running and about 200 to 300 MB for one container.
- Jest is the name interviews say aloud; the lessons carry a short Jest translation table.
