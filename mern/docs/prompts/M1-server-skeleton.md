# M1 — Server skeleton

**Task:** `mern/` slice M1 · **Date:** 2026-11-13 · **Tool:** Claude Code

## Prompt

> If I have to do this assignment in Node.js and MongoDB, what changes would you suggest? Give me the
> plan first. [...] Lets create a separate folder for this and build. Lets also think of it as a
> refresher session for me [...] The interview tech stack is React and Node.js [...] Remember this is a
> refresher session for me in both Node.js and React. So remember to teach me the core concepts, state
> management in React, why we are making the change and its impact, etc. have to be explained before
> making the changes.

Each decision (language, framework, database layer, ids, search, test database, test runner) was asked
one at a time and recorded in `mern/DECISIONS.md` (ADR-M1). The lesson for this slice was given before
any code: the event loop, Express as a chain of functions, the app factory, configuration from the
environment, Problem Details, and connection lifecycle with graceful shutdown.

## Approved test list

Server, Vitest with supertest and a real `mongo:7` from Testcontainers:

1. `healthReportsUpWhenMongoIsConnected` — `GET /health` returns 200 and `{status:"UP"}`.
2. `healthReportsDownWhenMongoIsUnreachable` — it returns 503 and `{status:"DOWN"}` after the connection
   closes.
3. `unknownRouteReturnsProblemDetails` — 404, `application/problem+json`, all five fields.
4. `malformedJsonReturns400ProblemDetails` — a bad JSON body gets a 400 problem, not an HTML page.
5. `oversizedBodyReturns413ProblemDetails` — a body over the limit gets a 413 problem.
6. `unexpectedErrorReturns500WithoutStackTrace` — a throwing route returns a generic 500 and the body
   contains no stack.
7. `asyncRejectionReachesTheErrorMiddleware` — a route that rejects returns the same 500 problem (the
   Express 5 behaviour).
8. `corsAllowsOnlyConfiguredOrigins` — a listed origin gets the CORS header, an unlisted one does not.
9. `configRejectsMissingOrInvalidEnvironmentListingEveryProblem` — a missing `MONGODB_URI` and a
   non-numeric `PORT` produce one error naming both.
10. `configAppliesDefaults` — `PORT` defaults to 8082 and `CORS_ALLOWED_ORIGINS` to the Vite dev origin.
11. `startupFailsFastWhenMongoCannotBeReached` — connecting to a dead URI rejects within the timeout.
12. `shutdownClosesTheServerAndTheDatabase` — after `shutdown()`, the port is closed and the connection
    state is disconnected.

## Approved dependencies

`express@5`, `cors`, `mongoose`, `zod`; dev: `typescript`, `tsx`, `@types/node`, `@types/express`,
`@types/cors`, `vitest`, `supertest`, `@types/supertest`, `testcontainers`, `@testcontainers/mongodb`,
`eslint`, `typescript-eslint`, `prettier`. Left for a later hardening slice: `helmet`, a logger
(`pino`), a request-id middleware.

## Notes

- Test review: the first draft mounted its own body parser in the test route, so the app's body limit
  was never tested. The app must own `express.json` and its 100 kb limit; test 5 also checks that a
  body under the limit passes. The 400 and 413 problems must say what went wrong (`detail`).
- Cleanup runs in `afterEach` and `shutdown()` must be idempotent (test 12 calls it twice, as a second
  `SIGTERM` would); the port is proven closed with a TCP connect, not only `server.listening`.
- Test 10 also pins `nodeEnv` to `development` by default.
- Left out on purpose: CORS preflight and a missing `Origin`; comma-splitting of
  `CORS_ALLOWED_ORIGINS` (arrives with its first real use).

## Outcome

_Pending._
