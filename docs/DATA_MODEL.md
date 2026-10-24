# Data Model

The schema for v1, designed in task 2.1. The reasoning and rejected options live in
[ADR-008 to ADR-012](DECISIONS.md). Task 3.1 turns this into Flyway migrations. The SQL below is the
**target**, not a migration file.

## Tables

```
country (code PK, name, currency_code)
   ▲
   │ country_code
employee ───────────────► job_title (name PK, department) ───► department (name PK)
          (department, job_title) → (department, name)
```

| Table | Purpose |
|---|---|
| `country` | Supported countries and the currency each one uses |
| `department` | Supported departments |
| `job_title` | Supported titles. Each title belongs to one department, and names are unique globally |
| `employee` | One row per employee. Soft-deleted rows stay, with `deleted_at` set |

## Target DDL

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE country (
    code          CHAR(2)      PRIMARY KEY,          -- ISO 3166-1 alpha-2
    name          VARCHAR(100) NOT NULL UNIQUE,
    currency_code CHAR(3)      NOT NULL              -- ISO 4217
);

CREATE TABLE department (
    name VARCHAR(100) PRIMARY KEY
);

CREATE TABLE job_title (
    name       VARCHAR(100) PRIMARY KEY,             -- unique across all departments
    department VARCHAR(100) NOT NULL REFERENCES department (name),
    UNIQUE (department, name)                         -- target of the employee composite FK
);

CREATE SEQUENCE employee_id_seq START WITH 1 INCREMENT BY 50;   -- = JPA allocationSize

CREATE TABLE employee (
    id           BIGINT        PRIMARY KEY,          -- from employee_id_seq via the JPA generator
    full_name    VARCHAR(200)  NOT NULL,
    email        VARCHAR(254)  NOT NULL,
    job_title    VARCHAR(100)  NOT NULL,
    department   VARCHAR(100)  NOT NULL,
    country_code CHAR(2)       NOT NULL REFERENCES country (code),
    salary       NUMERIC(14,2) NOT NULL CHECK (salary > 0),
    hire_date    DATE          NOT NULL CHECK (hire_date >= DATE '1950-01-01'),
    version      BIGINT        NOT NULL DEFAULT 0,
    deleted_at   TIMESTAMPTZ,
    FOREIGN KEY (department, job_title) REFERENCES job_title (department, name)
);
```

There is no `currency` column on `employee`. Currency always comes from `country` (ADR-008).

## Indexes

All are partial on `WHERE deleted_at IS NULL` (ADR-011, ADR-012). Queries must include that predicate
literally.

| Index | Columns | Serves |
|---|---|---|
| `employee_email_active_uq` (unique) | `lower(email)` | Duplicate email → 409 (3.3), unique among active rows only |
| `employee_full_name_trgm` (GIN) | `full_name gin_trgm_ops` | Partial name search, `ILIKE '%x%'` (4.2) |
| `employee_email_trgm` (GIN) | `email gin_trgm_ops` | Partial email search (4.2) |
| `employee_country_salary_idx` | `(country_code, salary)` | Min, max, avg, median per country (5.1) |
| `employee_country_title_idx` | `(country_code, job_title)` | Average by title within a country (5.2), title filter (4.3) |
| `employee_country_dept_idx` | `(country_code, department)` | Headcount by department (5.3), department filter (4.3) |
| `employee_full_name_idx` | `full_name` | Sort by name (4.4) |
| `employee_salary_idx` | `salary` | Sort by salary (4.4) |
| `employee_hire_date_idx` | `hire_date` | Sort by hire date (4.4) |

## Rules

| Rule | Database | App |
|---|---|---|
| Required fields | `NOT NULL` | `@NotBlank` / `@NotNull` |
| Valid email | — | `@Email` |
| Email unique (case-insensitive, active only) | partial unique index | pre-check, then 409 (3.3) |
| Salary > 0 | `CHECK` | `@Positive` |
| Hire date not before 1950-01-01 | `CHECK` | validated |
| Hire date not after today **(UTC)** | — | validated with an injected `Clock` |
| Supported country | FK | validated, then 400 |
| Title belongs to department | composite FK | validated, then 400 |
| Text lengths 200 / 254 / 100 | `VARCHAR(n)` | `@Size` |
| Stale update | `version` | optimistic lock, then 409 (3.5) |

## Reference data

**Countries**

| Code | Name | Currency |
|---|---|---|
| US | United States | USD |
| GB | United Kingdom | GBP |
| IN | India | INR |
| DE | Germany | EUR |
| FR | France | EUR |

**Departments and job titles**

| Department | Job titles |
|---|---|
| Engineering | Software Engineer, Senior Software Engineer, QA Engineer, Engineering Manager |
| Sales | Sales Representative, Account Executive, Sales Manager |
| Marketing | Marketing Specialist, Content Strategist, Marketing Manager |
| Finance | Accountant, Financial Analyst, Finance Manager |
| Human Resources | HR Generalist, Recruiter, HR Manager |
| Operations | Operations Analyst, Operations Manager |

6 departments and 18 titles. Changes go through a new Flyway migration.

## Soft delete

- Delete sets `deleted_at` from the injected `Clock` and bumps `version`. API: 204.
- Every read excludes deleted rows: get (404), list, search, filters, insights, the duplicate-email check.
- No restore through the API. Recovery is done with SQL.

## Left for later tasks
- **2.2:** whether salary input with more than 2 decimals is rejected or rounded; whether whitespace in
  text fields is trimmed.
- **3.1:** whether reference data goes in the same migration as the tables or its own.
- **4.4:** pagination tiebreaker (`id`), and whether sort indexes widen to `(column, id)`.
- **6.3:** if the seed inserts outside JPA, it must take ids from `employee_id_seq` in the same blocks
  of 50.
