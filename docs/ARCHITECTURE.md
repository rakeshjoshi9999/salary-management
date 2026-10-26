# Architecture

How the system is deployed and how the code is organised. This is the design from task 2.4: phase 1's
skeleton exists, and the feature code arrives in phases 3 to 7. Decisions behind each part are linked;
the structure itself is ADR-026.

Related: [data model](DATA_MODEL.md) · [API contract](openapi.yaml) · [decisions](DECISIONS.md)

## 1. Deployment

```mermaid
flowchart LR
    hr["HR Manager<br/>(browser)"]

    subgraph vercel["Vercel"]
        spa["Angular SPA<br/>static files on CDN"]
    end

    subgraph render["Render · Singapore · free tier"]
        api["Spring Boot API<br/>Docker container<br/>/api/v1/** · /actuator/health"]
    end

    subgraph neon["Neon · Singapore"]
        db[("PostgreSQL 18<br/>pooled endpoint")]
    end

    gh["GitHub · main"]
    ci["GitHub Actions<br/>backend + frontend tests, frontend lint"]

    hr -- "loads app" --> spa
    hr -- "JSON over HTTPS<br/>cross-origin, CORS allowlist" --> api
    api -- "JDBC over TLS<br/>Flyway migrations on boot" --> db

    gh -- "every push" --> ci
    gh -- "auto-deploy" --> vercel
    gh -- "auto-deploy" --> render
```

| Element | Notes | Decision |
|---|---|---|
| Browser to API | Direct cross-origin calls; allowed origins come from `CORS_ALLOWED_ORIGINS` | ADR-003 |
| API | Sleeps after about 15 minutes idle, and the first request waits up to a minute | ADR-004 |
| Database | Free tier; autosuspends; pooled endpoint because of connection limits; same region as the API | ADR-002 |
| Config | Every secret and URL is an env var (`DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `CORS_ALLOWED_ORIGINS`, `PORT`) | `CLAUDE.md` |
| Health | `/actuator/health` includes the datasource, so UP proves the whole chain. Render uses it to gate deploys | 1.10 |
| Stage | The same three tiers again for the `stage` branch: a Vercel branch deploy, a second Render service, and a Neon branch database. Promoted to `main` once per phase | ADR-030, 1.11 |

## 2. Backend components

Packages are grouped **by feature**, with the `controller → service → repository` layers inside each one.

```mermaid
flowchart TB
    subgraph employee["employee/"]
        ec["EmployeeController"] --> es["EmployeeService"]
        es --> er["EmployeeRepository<br/>Spring Data JPA"]
    end

    subgraph insights["insights/"]
        ic["InsightsController"] --> is["InsightsService"]
        is --> ir["InsightsRepository<br/>JdbcClient, plain SQL"]
    end

    subgraph reference["reference/"]
        rc["ReferenceController"] --> rs["ReferenceService<br/>loaded once, held in memory"]
        rs --> rr["ReferenceRepository<br/>JdbcClient, read once"]
    end

    subgraph settings["settings/"]
        sc["SettingsController"] --> ss["SettingsService"]
        ss --> sr["SettingsRepository<br/>JPA, one row"]
    end

    subgraph common["common/"]
        err["error/<br/>Problem Details handler"]
        money["money/<br/>MoneyRounding"]
        cfg["config/<br/>CORS, Clock, Jackson"]
    end

    es -- "validate country,<br/>department, title" --> rs
    is -- "country exists,<br/>currency" --> rs
    ss -- "country valid?" --> rs
    is --> money
    er & ir & rr & sr --> pg[("PostgreSQL")]
```

```
com.acme.salary
├─ employee/    EmployeeController, EmployeeService, EmployeeRepository, Employee (entity), dto/, validation/
├─ insights/    InsightsController, InsightsService, InsightsRepository, dto/
├─ reference/   ReferenceController, ReferenceService, ReferenceRepository (JdbcClient), Country, JobTitle, dto/,
│               validation/ (@SupportedCountry, used by employee and settings) (ADR-037)
├─ settings/    SettingsController, SettingsService, SettingsRepository, AppSettings (entity), dto/ (ADR-028)
├─ seed/        SeedRunner (`seed` profile only), EmployeeGenerator (Datafaker), EmployeeSeeder (JdbcTemplate
│               batches), SeedCatalog; depends on no other feature (ADR-049)
└─ common/      error/ (Problem Details), money/ (MoneyRounding), config/ (CORS, Clock, Jackson)
```

**Rules.** These are enforced by convention and review, not by a test (ADR-026):

| Rule | Why |
|---|---|
| Controllers call only their own feature's service | Domain logic stays out of controllers (`CLAUDE.md`) |
| Entities never leave a service; controllers see DTOs | DTOs at the boundary (`CLAUDE.md`) |
| Features (`employee`, `insights`, `settings`) depend on `reference` and `common` only. `reference` depends on nothing but `common` | One direction, no cycles |
| Another feature is reached only through its public service, never its repository or entity | Internals stay package-private and changeable |
| `employee` uses JPA; `insights` uses `JdbcClient`; aggregation never happens in Java | ADR-022 |
| Every query on `employee` filters `deleted_at IS NULL` | ADR-011 |
| "Now" comes from an injected `Clock` (UTC) | ADR-010 |
| Money rounding happens only in `MoneyRounding` | ADR-021 |

**Reference data in memory.** `ReferenceService` reads countries, departments and titles once at
startup and keeps them in immutable maps. Validation on a write and the currency lookup for insights
cost no query. This is safe because reference data changes only through a migration, and a migration
means a redeploy and a restart. No caching library is used.

`CorsConfig` moved from the root package to `common/config` in task 3.2 (ADR-026).

## 3. Frontend components

```mermaid
flowchart TB
    subgraph core["core/"]
        int["HTTP interceptor<br/>Problem Details → typed error<br/>slow first response → cold-start notice"]
        ref["ReferenceStore<br/>signal, loaded once"]
        models["API models"]
    end

    subgraph employees["employees/"]
        list["Employee list<br/>filters ⇄ URL query params"]
        form["Employee form<br/>create / edit / 409 handling"]
        esvc["EmployeeService"]
    end

    subgraph insights["insights/"]
        dash["Insights dashboard"]
        isvc["InsightsService"]
    end

    subgraph settingsf["settings/"]
        sp["Settings page"]
        ssvc["SettingsService"]
    end

    subgraph shared["shared/ (presentational only)"]
        ui["Money pipe · loading / empty / error panels"]
    end

    list & form --> esvc
    dash --> isvc
    dash -- "default country" --> ssvc
    sp --> ssvc
    list & form & dash & sp --> ref
    list & form & dash --> ui
    esvc & isvc & ssvc & ref --> int
    int --> api["Spring Boot API"]
```

```
src/app/
├─ core/       interceptor, cold-start detection, ReferenceStore, API models
├─ employees/  Catalog list, drawer (view/add/edit), delete confirmation, employee.service
├─ insights/   dashboard (landing page), insights.service
├─ settings/   settings page, settings.service (ADR-028)
├─ shared/     presentational UI only: money pipe, state panels
└─ health/     phase 1 health page (exists)
```

| Rule | Why |
|---|---|
| Components call feature services. Only services and `core/` touch `HttpClient` | `CLAUDE.md` |
| State is signals; components use `OnPush`; the app is zoneless | `CLAUDE.md`, ADR-007 |
| `shared/` holds no services and no HTTP | Keeps it from becoming a junk drawer |
| UI code formats money but never calculates with it | ADR-015 |
| The UI branches on the Problem `code`, never on the status or message text | ADR-018 |
| Whether API models are generated from `openapi.yaml` or written by hand | Decided in 7.1 (ADR-013) |

## 4. Key flows

### Update with a stale version → 409

```mermaid
sequenceDiagram
    actor HR as HR Manager
    participant UI as Employee form
    participant C as EmployeeController
    participant S as EmployeeService
    participant R as ReferenceService
    participant DB as PostgreSQL

    HR->>UI: edit salary, save
    UI->>C: PUT /api/v1/employees/101 {…, version: 3}
    C->>C: Bean Validation (trimmed, strict fields)
    C->>S: update(101, request)
    S->>R: country, department, title valid?
    R-->>S: yes (in memory, no query)
    S->>DB: SELECT … WHERE id = 101 AND deleted_at IS NULL
    DB-->>S: row with version 4
    alt request version ≠ loaded version
        S-->>C: StaleVersionException(current = 4)
        C-->>UI: 409 STALE_VERSION, currentVersion: 4
        UI->>HR: "Changed by someone else. Reload?"
        HR->>UI: reload
        UI->>C: GET /api/v1/employees/101
    else versions match
        S->>DB: UPDATE … SET version = 5 WHERE id = 101 AND version = 4
        Note over S,DB: if 0 rows (a concurrent commit), OptimisticLockException → 409
        S-->>C: updated employee
        C-->>UI: 200 {…, version: 5}
    end
```

(ADR-014, ADR-018, ADR-023)

### Country insights

```mermaid
sequenceDiagram
    actor HR as HR Manager
    participant UI as Insights dashboard
    participant C as InsightsController
    participant S as InsightsService
    participant R as ReferenceService
    participant Q as InsightsRepository
    participant DB as PostgreSQL

    HR->>UI: pick country IN
    UI->>C: GET /api/v1/insights/countries/IN
    C->>S: forCountry("IN")
    S->>R: country IN?
    alt unsupported
        R-->>S: not found
        S-->>C: 404 COUNTRY_NOT_FOUND
    else supported (currency INR)
        S->>Q: read-only transaction
        Q->>DB: min, max, avg, count, exact median (numeric)
        Q->>DB: avg + count by job title
        Q->>DB: count by department
        DB-->>Q: unrounded aggregates
        Q-->>S: rows
        S->>S: MoneyRounding (2dp, HALF_EVEN)
        S-->>C: insights (headcount 0 → null stats)
        C-->>UI: 200 CountryInsights
    end
```

(ADR-017, ADR-021, ADR-022)
