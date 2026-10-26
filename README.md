# Salary Management

Web app for an HR Manager to manage salary data for ~10,000 employees across countries and answer questions about how the organization pays people.

> Work in progress. See [`TASKS.md`](TASKS.md) for the build roadmap.

## Live

| | |
|---|---|
| App | https://salary-management-ivory-psi.vercel.app |
| Health page | https://salary-management-ivory-psi.vercel.app/health (is the API awake and connected?) |
| API health | https://salary-management-api-tzf8.onrender.com/actuator/health |

**The first request can take up to a minute.** The API runs on Render's free tier, which
stops the container after about 15 minutes of inactivity; the next request waits for it to
start again. The database autosuspends on Neon's free tier too, so a cold start can pay
both at once. Subsequent requests are fast — any performance figure quoted for this project
is a warm one, and says so.

This is a deliberate trade, recorded in [ADR-004](docs/DECISIONS.md). The app says what is
happening while it waits rather than showing an unexplained spinner, because a reviewer who
assumes it is broken stops being a reviewer.

### Stage

Every slice is deployed to stage before it reaches production; production is promoted from
stage once per phase ([ADR-030](docs/DECISIONS.md)). Stage has its own API and its own Neon
branch database, so nothing done there touches production data.

| | |
|---|---|
| App | https://salary-management-stage.vercel.app (behind Vercel login) |
| Health page | https://salary-management-stage.vercel.app/health |
| API health | https://salary-management-api-stage.onrender.com/actuator/health |

## Docs
- [Requirements](REQUIREMENTS.md) — goal, scope, assumptions, and what's deliberately left out
- [Engineering workflow](docs/WORKFLOW.md) — how this was built, from requirement to shipped
- [AI working agreement](CLAUDE.md) — rules the AI assistant follows in this repo
- [Decisions](docs/DECISIONS.md) — architecture decision records
- [AI usage log](docs/AI_USAGE.md) — how AI was used, and where it was corrected

## Structure
```
backend/    Spring Boot 4 (Java 21) REST API
frontend/   Angular web app
docs/       Workflow, decisions, architecture, AI usage, prompts
```

_Live links, local setup and test instructions will be added as the app is built._
