# Performance

Measurements behind the requirement that lists answer within about 200 ms and insights within 1 second
at 10,000 employees (`REQUIREMENTS.md`). Each section says where and how it was measured.

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
| Stage (laptop → Neon, includes network) | — | _pending (6.4)_ | | | |

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

| Shape | Local seeded: plan | ms | Stage: ms |
|---|---|---|---|
| Default page (name order) | Index Scan `employee_full_name_idx` + incremental sort | 0.12 | _pending_ |
| Count, no filter | Index Only Scan `employee_country_title_idx` | 0.70 | |
| Deep page, name order (offset 9,980) | **Seq Scan + full sort** | 8.6 | |
| Deep page, salary desc | **Seq Scan + full sort** | 6.4 | |
| Deep page, hire date asc | **Seq Scan + full sort** | 4.0 | |
| Search `patel` (42 matches) | BitmapOr of both trigram indexes | 0.27 | |
| Search `00042@` (1 match) | BitmapOr of both trigram indexes | 0.11 | |
| `country=IN`, salary order, last page (offset 3,480) | Bitmap Scan `employee_country_dept_idx` + sort | 2.3 | |
| `department=Engineering` | Index Scan `employee_full_name_idx` + incremental sort | 0.06 | |
| `jobTitle=Recruiter` | Index Scan `employee_full_name_idx` + incremental sort | 0.21 | |
| `country=IN` + `department=Engineering` | Index Scan `employee_full_name_idx` + incremental sort | 0.06 | |

### Findings

- **The seed's `VACUUM ANALYZE` works:** search uses both trigram indexes straight after seeding (0.1 to
  0.3 ms), with no wait for autovacuum.
- **Deep pages no longer use the sort indexes.** For an offset of 9,980 the planner prefers reading the
  whole table and sorting it (4 to 9 ms) to walking an index whose ties need re-sorting. A `(column, id)`
  index would let it stop after 10,000 index entries, but the cost now is under 5% of the 200 ms budget,
  so **ADR-045 stands: the sort indexes stay single-column.** Revisit if the table grows past about
  100,000 rows, or move to keyset paging.
- First pages, filters and counts behave as in 4.5.
