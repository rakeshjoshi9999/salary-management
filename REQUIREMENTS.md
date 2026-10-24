# Salary Management — Requirements

## Goal
Replace ACME's spreadsheet-based salary tracking with a web app where the HR Manager can manage salary data for ~10,000 employees across multiple countries, and quickly answer: **"How does the org pay people?"**

## User
**HR Manager** — a single, trusted user who maintains employee salary records and needs reliable answers about pay, without hunting through Excel files.

## Success criteria
- The HR Manager can find any employee and update their salary in under 30 seconds.
- Salary insights for a country load in under 1 second.
- No manual spreadsheet work is needed for the in-scope questions below.

## In scope

**1. Employee management**
- Add, view, edit and delete an employee.
- Fields: full name, email (unique), job title, department, country, salary (annual gross), hire date. Currency is derived from the country.
- Validation: required fields, valid email, salary > 0, hire date not in the future, supported countries only.
- Concurrent edits are protected; a stale update is rejected rather than silently overwritten.

**2. Find employees**
- Paginated list (server-side) with search by name or email.
- Filter by country, job title and department; sort by name, salary or hire date.
- Filters are kept in the URL so a view can be bookmarked or shared.

**3. Salary insights (per country, in local currency)**
- Minimum, maximum, average and median salary in a country.
- Average salary by job title within a country.
- Headcount by department within a country.

**4. Data seeding**
- A deterministic, idempotent seed script that creates 10,000 realistic employees across all supported countries.

**5. Settings** *(added 2026-10-24 during UI design; see ADR-028 in `docs/DECISIONS.md`)*
- The HR Manager can choose the default country that the Insights dashboard opens on (India until
  changed). The currency shown follows the country.

## Assumptions
- **Currency:** each country uses one currency, and insights are shown per country in that currency. Cross-country comparison is not needed; if added later, it would use a fixed conversion-rate table.
- **Salary** means current annual gross base pay. Bonuses, equity and allowances are excluded.
- **One HR user**, trusted, with no login.
- **Settings are app-wide**, not per user: without a login, anyone with the URL changes them for everyone.
  *(Added 2026-10-24, ADR-028.)*

## Deliberately out of scope

| Left out | Why | How it would be added |
|---|---|---|
| Authentication & roles | Single trusted user confirmed by stakeholders | Spring Security with OAuth2/OIDC and an `HR_MANAGER` role |
| Salary history | Current salary is enough for v1 | A `salary_change` table (employee, old, new, effective date, reason); `employee.salary` stays the latest value |
| Cross-country comparison | Per-country insights confirmed as enough | A fixed rate table to normalize to one reporting currency |
| Payroll, tax, payslips | A different product; high complexity, not asked for | — |
| Bulk Excel import/export | Valuable for migration, but not core to v1 | CSV import with row-level validation report |
| Approval workflows, audit log | No multi-user process in v1 | Arrives naturally with roles and history |

## Non-functional requirements
- Handles 10,000 employees comfortably: list queries under ~200 ms, with aggregations done in the database.
- Seed completes in under 10 seconds.
- Fast, deterministic unit tests covering the core logic; built test-first.
- Publicly deployed: Angular on Vercel, Spring Boot on Render.

## Tech choices (details in `DECISIONS.md`)
Java 21 + Spring Boot 4 · PostgreSQL + Flyway · Angular (standalone, signals) · JUnit 5, Mockito, Testcontainers · Vercel + Render.
