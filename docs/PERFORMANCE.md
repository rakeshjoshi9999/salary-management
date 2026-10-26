# Performance

Measurements behind the requirement that lists answer within about 200 ms and insights within 1 second
at 10,000 employees (`REQUIREMENTS.md`). Each section says where and how it was measured.

## Summary (task 8.2, 2026-10-26)

| Requirement | Measured | Verdict |
|---|---|---|
| A list answers in about 200 ms | **114 ms** median, 204 ms p95, live and warm from India to production in Singapore over a reused connection; 135–149 ms median with a new HTTPS connection per request (the first batch, 266 ms, still carried the database waking up). On the database server: 0.1–9 ms for every list shape | Met, network included |
| Insights for a country in under 1 second | **79 ms** median, 103 ms max, live and warm over a reused connection; 158 ms median with a new connection each time. On the database server: 0.4–3 ms for the three insights queries | Met with a wide margin |
| Seed of 10,000 employees in under 10 seconds | 2.0–2.2 s locally, 3.9 s to stage, 4.2 s to production | Met |
| Aggregations in the database, not in Java | Every statistic is one SQL aggregate (`InsightsRepository`); Java only rounds | Met by design (ADR-022) |

**Not covered by these numbers: the cold start.** On Render's free tier the first request after about
15 minutes idle waits for the container to start, often tens of seconds, and Neon's database may be waking
at the same time (ADR-002, ADR-004). The app shows "Waking the server…" after 3 s rather than a silent
spinner. Every figure above is warm and says so.

## List query plans (task 4.5, 2026-10-25)

**Where:** local Testcontainers Postgres 18, 10,000 synthetic employees from `generate_series`, warm:
the table was just loaded and every buffer is a shared hit. **How:** `ListQueryPlanReportTest`, tagged
`performance` and outside the normal suite (ADR-045, ADR-046):

```
cd backend && ./mvnw test -Dgroups=performance -DexcludedGroups=none
```

It writes the full `EXPLAIN (ANALYZE, BUFFERS)` output to `backend/target/performance/list-plans.txt`,
using the exact SQL the application builds (`EmployeeSearchImpl.pageSql` and `countSql`), and checks
each query's count against the generating formula. These are server-side execution times only: no
network, no Neon, no Render. Live numbers on stage come after the phase 6 seed (task 6.4).

| Shape | Page plan | Page ms | Count plan | Count ms |
|---|---|---|---|---|
| Default page (name order, 10,000 match) | Index Scan `employee_full_name_idx` + incremental sort on `id` | 0.07 | Index Only Scan `employee_country_title_idx` | 0.72 |
| Deep page (offset 9,980) | Index Scan `employee_full_name_idx` | 3.05 | Index Only Scan | 0.92 |
| Search by name `q=01234` (1 match) | BitmapOr of `employee_full_name_trgm` and `employee_email_trgm` | 0.10 | same | 0.06 |
| Search by email `q=1234@` (1 match) | BitmapOr of both trigram indexes | 0.10 | same | 0.16 |
| `country=IN` (2,000) | Index Scan `employee_full_name_idx`, filter | 0.12 | Index Only Scan `employee_country_dept_idx` | 0.20 |
| `department=Engineering` (2,223) | Index Scan `employee_full_name_idx`, filter | 0.07 | Index Only Scan `employee_country_dept_idx` | 0.23 |
| `jobTitle=Recruiter` (555) | Index Scan `employee_full_name_idx`, filter | 0.12 | Index Only Scan `employee_country_title_idx` | 0.13 |
| `country=IN` + `department=Engineering` (445) | Index Scan `employee_full_name_idx`, filter | 0.17 | Index Only Scan `employee_country_dept_idx` | 0.11 |
| `sort=salary,desc` | Index Scan Backward `employee_salary_idx` + incremental sort | 0.06 | Index Only Scan | 0.63 |
| `sort=hireDate,asc` | Index Scan `employee_hire_date_idx` + incremental sort | 0.06 | Index Only Scan | 0.64 |

Every shape is under 4 ms on the server, far inside the 200 ms target; the budget is spent on the
network and on Render's cold start (ADR-004), not on the query.

### Findings

- **Sort indexes stay single-column for now (ADR-045), with a re-check.** Postgres reads `full_name`,
  `salary` or `hire_date` from its index and finishes the `id` tiebreak with an incremental sort. On the
  first page that sort is negligible (about 0.02 ms). On the deep page it is not: the index scan takes
  about 1.1 ms and the incremental sort over 313 groups adds about 1.4 ms, which a `(full_name, id)`
  index would remove. Both are far inside 200 ms, so no migration now. **Caveat:** the synthetic data is
  nearly tie-free (unique names, almost unique salaries, at most two employees per hire date), the best
  case for an incremental sort. Realistic data has more ties, so task 6.4 re-checks the deep page and
  sorts on tied columns on the seeded stage database before this is final.
- **The trigram indexes are not used until VACUUM.** Rows inserted into an existing GIN index wait in its
  pending list (here all 10,000: 371 pages) until a VACUUM or autovacuum merges them, and the planner
  prices the index as expensive meanwhile. Before VACUUM, search is a full scan: 8.4 ms. After
  `VACUUM ANALYZE`, both trigram indexes serve it through a BitmapOr: 0.10 ms. Confirmed separately on
  local Postgres with `pgstattuple`: `pending_tuples` went from 10,000 to 0. Even the full scan is inside
  the target at this size, but **the phase 6 seed must end with `VACUUM ANALYZE employee`** (task 6.3)
  rather than wait for autovacuum.
- **Filters are served by the name index, not the composite indexes, for the page.** With a filter that
  matches 4.5% to 22% of rows, walking `employee_full_name_idx` in order and filtering until 20 rows are
  found is cheaper than collecting every match and sorting. The composite indexes serve the counts
  (Index Only Scans). This is the planner's right call at this size; the composite indexes also serve
  phase 5's insights.
- **The deep page is the slowest shape (about 2.6 to 3 ms):** `OFFSET` walks 10,000 index entries and
  sorts their ties (ADR-016). Fine at this size; keyset paging would be the fix at much larger scale.
- **Unused indexes:** none to drop. Three indexes appear in no list plan, each for a reason:
  `employee_country_salary_idx` serves the per-country salary statistics (task 5.1, checked there), and
  `employee_pk` and `employee_email_active_uq` exist to enforce constraints, not to serve lists.

## Seed time (task 6.3, 2026-10-26)

**Target:** under 10 seconds (`REQUIREMENTS.md`). **How:** the `seed` profile (ADR-049) logs each phase:

```
cd backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=seed
```

| Where | Run | Generate | Insert | VACUUM ANALYZE | Total |
|---|---|---|---|---|---|
| Local (docker compose Postgres 18.6, empty table) | 1 | 453 ms | 1,487 ms | 74 ms | **2,015 ms** |
| Local, empty table | 2 | 499 ms | 1,633 ms | 94 ms | 2,228 ms |
| Local, empty table | 3 | 537 ms | 1,588 ms | 90 ms | 2,215 ms |
| Local, rerun on the seeded table (0 inserted) | — | 427 ms | 32 ms | 48 ms | 508 ms |
| Stage (laptop → Neon `ap-southeast-1`, includes network; empty table) | 1 | 466 ms | 3,280 ms | 142 ms | **3,890 ms** |
| Production (laptop → Neon `ap-southeast-1`, includes network; empty table) | 1 | 555 ms | 3,526 ms | 162 ms | **4,244 ms** |

The total excludes the application's start-up and Flyway check, which are not part of the seed. Inserts go in JDBC
batches of 500 in one transaction, with ids for all blocks taken in one `generate_series` query, so
the round trips over Neon's network stay at about 25.

## List query plans on seeded data (task 6.4, 2026-10-26)

**How:** `backend/src/test/resources/performance/list-plans.sql`, a read-only psql script with the same
SQL as `EmployeeSearchImpl` (ADR-049), run after the seed and its `VACUUM ANALYZE`:

```
psql "<connection string>" -f backend/src/test/resources/performance/list-plans.sql
```

The seeded data is realistic: names repeat, salaries are round (multiples of 100, INR 1,000) and about
1.6 people share each hire date. Those ties are what 4.5's synthetic data lacked.

| Shape | Local seeded: plan | ms | Stage (Neon, Postgres 18.6): ms, and plan where it differs |
|---|---|---|---|
| Default page (name order) | Index Scan `employee_full_name_idx` + incremental sort | 0.12 | 0.09 |
| Count, no filter | Index Only Scan `employee_country_title_idx` | 0.70 | 1.25 (Index Only Scan `employee_country_dept_idx`) |
| Deep page, name order (offset 9,980) | **Seq Scan + full sort** | 8.6 | 5.97 |
| Deep page, salary desc | **Seq Scan + full sort** | 6.4 | 8.43 (**Index Scan Backward `employee_salary_idx` + incremental sort**) |
| Deep page, hire date asc | **Seq Scan + full sort** | 4.0 | 5.08 |
| Search `patel` (42 matches) | BitmapOr of both trigram indexes | 0.27 | page 3.60 (**Index Scan `employee_full_name_idx` + filter**); count 0.21 (BitmapOr) |
| Search `00042@` (1 match) | BitmapOr of both trigram indexes | 0.11 | 0.09 |
| `country=IN`, salary order, last page (offset 3,480) | Bitmap Scan `employee_country_dept_idx` + sort | 2.3 | 2.79; count 0.47 |
| `department=Engineering` | Index Scan `employee_full_name_idx` + incremental sort | 0.06 | 0.11 |
| `jobTitle=Recruiter` | Index Scan `employee_full_name_idx` + incremental sort | 0.21 | 0.51 |
| `country=IN` + `department=Engineering` | Index Scan `employee_full_name_idx` + incremental sort | 0.06 | 0.11 |

### Findings

- **The seed's `VACUUM ANALYZE` works:** search uses both trigram indexes straight after seeding (0.1 to
  0.3 ms), with no wait for autovacuum.
- **Deep pages no longer use the sort indexes.** For an offset of 9,980 the planner prefers reading the
  whole table and sorting it (4 to 9 ms) to walking an index whose ties need re-sorting. A `(column, id)`
  index would let it stop after 10,000 index entries, but the cost now is under 5% of the 200 ms budget,
  so **ADR-045 stands: the sort indexes stay single-column.** Revisit if the table grows past about
  100,000 rows, or move to keyset paging.
- First pages, filters and counts behave as in 4.5.
- **Stage agrees, at the same scale (all under 9 ms on the server).** Run by the engineer on 2026-10-26
  straight after the stage seed; Neon chose the same plans as local except in three places, all cheap:
  - the deep salary page walks `employee_salary_idx` backwards and re-sorts the 291 tie groups (8.4 ms)
    instead of a full scan and sort;
  - the `patel` page walks the name index and filters (4,782 rows removed, 3.6 ms) instead of the
    trigram indexes, because the planner expects 104 matches and there are 42. The count still uses the
    trigram indexes (0.2 ms). A rarer term would push it back onto the trigram indexes;
  - the unfiltered count reads `employee_country_dept_idx` instead of `employee_country_title_idx`
    (both Index Only Scans of the same size).
  These are server times only; the network from Render to Neon is on top.

## Insights query plans on seeded data (task 8.2, 2026-10-26)

**How:** `EXPLAIN (ANALYZE, BUFFERS)` of the three queries in `InsightsRepository`, for India, the largest
country (3,500 of 10,000 active employees), on the seeded local database (docker compose Postgres 18,
after the seed's `VACUUM ANALYZE`). Three runs; server time only.

| Query | Plan | ms (3 runs) |
|---|---|---|
| Salary stats: count, min, max, average and the exact median (two `percentile_disc`) | Index Only Scan `employee_country_salary_idx` + Aggregate | 2.98 / 1.27 / 1.88 |
| Average salary by job title (18 groups) | Bitmap Scan `employee_country_dept_idx` + HashAggregate | 1.05 / 0.96 / 1.23 |
| Headcount by department (6 groups) | Index Only Scan `employee_country_dept_idx` + GroupAggregate + sort | 0.57 / 0.49 / 0.41 |

The median, the heaviest statistic, reads the salaries for the country straight out of
`employee_country_salary_idx` (no heap access), which is the index task 4.5 kept for exactly this.

## Live latency, warm (task 8.2, 2026-10-26)

**Where:** from the engineer's machine in India to the production API on Render (Singapore), which talks
to Neon. Read-only GETs; no data changed. **What:** `curl` `time_total`, which includes the network, TLS,
the Spring Boot app and the database. One warm-up request per shape, then 20 timed requests.

**With a new HTTPS connection for every request** (the pessimistic case: a browser reuses connections):

| Shape | Median | p95 | Max |
|---|---|---|---|
| Health check (network baseline, no database) | 111 ms | 206 ms | 234 ms |
| Default list (page 0, name order), measured first | 266 ms | 371 ms | 461 ms |
| Default list, measured again last | 146 ms | 269 ms | 281 ms |
| Search `patel` | 149 ms | 244 ms | 318 ms |
| `country=IN` + `department=Engineering` | 135 ms | 276 ms | 323 ms |
| Deep page (page 499 of 500) | 135 ms | 156 ms | 204 ms |
| Insights for India | 158 ms | 268 ms | 356 ms |

**Over one reused connection** (what a browser does):

| Shape | Median | p95 | Max |
|---|---|---|---|
| Default list | 114 ms | 204 ms | 205 ms |
| Insights for India | 79 ms | 102 ms | 103 ms |

### Findings

- **Most of the time is the network.** The health check, which touches no table, takes 111 ms; the
  database work behind a list is under 10 ms. A user in Singapore would see far less.
- **The first list of the session paid a one-off cost.** The very first list request took 1.7 s while the
  health check took 0.23 s, so the app was up but the data path was not: most likely Neon resuming its
  suspended compute (ADR-002). The default list's first batch (266 ms median) still carried some of that
  warm-up; measured again at the end it was 146 ms, in line with the other shapes.
- **This is a snapshot**, not a benchmark: one machine, one day, Render's free tier. The verdicts hold with a
  wide margin, so the conclusion does not depend on the exact figures.
