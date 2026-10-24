-- Schema for v1: docs/DATA_MODEL.md, ADR-008 to ADR-012, constraint names from ADR-036.
-- Reference rows are in V2. Never edit this file once applied; change the schema with a new migration.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE country (
    code          CHAR(2)      CONSTRAINT country_pk PRIMARY KEY,           -- ISO 3166-1 alpha-2
    name          VARCHAR(100) NOT NULL CONSTRAINT country_name_uq UNIQUE,
    currency_code CHAR(3)      NOT NULL                                     -- ISO 4217
);

CREATE TABLE department (
    name VARCHAR(100) CONSTRAINT department_pk PRIMARY KEY
);

CREATE TABLE job_title (
    name       VARCHAR(100) CONSTRAINT job_title_pk PRIMARY KEY,           -- unique across all departments
    department VARCHAR(100) NOT NULL
               CONSTRAINT job_title_department_fk REFERENCES department (name),
    CONSTRAINT job_title_department_name_uq UNIQUE (department, name)      -- target of the employee composite FK
);

-- Increment equals the JPA allocationSize (ADR-009). Any insert outside JPA takes ids in the same blocks.
CREATE SEQUENCE employee_id_seq START WITH 1 INCREMENT BY 50;

-- No currency column: currency always comes from country (ADR-008).
CREATE TABLE employee (
    id           BIGINT        CONSTRAINT employee_pk PRIMARY KEY,
    full_name    VARCHAR(200)  NOT NULL,
    email        VARCHAR(254)  NOT NULL,
    job_title    VARCHAR(100)  NOT NULL,
    department   VARCHAR(100)  NOT NULL,
    country_code CHAR(2)       NOT NULL CONSTRAINT employee_country_fk REFERENCES country (code),
    salary       NUMERIC(14,2) NOT NULL CONSTRAINT employee_salary_positive_ck CHECK (salary > 0),
    hire_date    DATE          NOT NULL
                 CONSTRAINT employee_hire_date_min_ck CHECK (hire_date >= DATE '1950-01-01'),
    version      BIGINT        NOT NULL DEFAULT 0,
    deleted_at   TIMESTAMPTZ,
    CONSTRAINT employee_title_in_department_fk
        FOREIGN KEY (department, job_title) REFERENCES job_title (department, name)
);

-- All partial on active rows (ADR-011, ADR-012). Queries must state deleted_at IS NULL literally.
CREATE UNIQUE INDEX employee_email_active_uq    ON employee (lower(email))                   WHERE deleted_at IS NULL;
CREATE INDEX        employee_full_name_trgm     ON employee USING gin (full_name gin_trgm_ops) WHERE deleted_at IS NULL;
CREATE INDEX        employee_email_trgm         ON employee USING gin (email gin_trgm_ops)     WHERE deleted_at IS NULL;
CREATE INDEX        employee_country_salary_idx ON employee (country_code, salary)           WHERE deleted_at IS NULL;
CREATE INDEX        employee_country_title_idx  ON employee (country_code, job_title)        WHERE deleted_at IS NULL;
CREATE INDEX        employee_country_dept_idx   ON employee (country_code, department)       WHERE deleted_at IS NULL;
CREATE INDEX        employee_full_name_idx      ON employee (full_name)                      WHERE deleted_at IS NULL;
CREATE INDEX        employee_salary_idx         ON employee (salary)                         WHERE deleted_at IS NULL;
CREATE INDEX        employee_hire_date_idx      ON employee (hire_date)                      WHERE deleted_at IS NULL;
