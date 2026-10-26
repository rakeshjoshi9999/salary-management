-- List query plans on a seeded database (task 6.4, ADR-045, ADR-049).
--
-- Run it against stage after the seed, with the connection string in your own shell:
--   psql "$STAGE_DB_URL" -f backend/src/test/resources/performance/list-plans.sql > stage-plans.txt
--
-- It is read-only: everything runs in a READ ONLY transaction that is rolled back.
-- The SQL is copied from EmployeeSearchImpl.pageSql and countSql (values inlined). If the list query
-- changes there, update this file too.

\pset pager off
begin transaction read only;

\echo '== Table size and last vacuum =='
select count(*) filter (where deleted_at is null) as active, count(*) as total from employee;
select last_vacuum, last_autovacuum, last_analyze, last_autoanalyze
from pg_stat_user_tables where relname = 'employee';

\echo '== Default page (name order) =='
explain (analyze, buffers)
select e.id, e.full_name, e.email, e.job_title, e.department, e.country_code, e.salary, e.hire_date, e.version
from employee e where e.deleted_at is null order by e.full_name asc, e.id asc limit 20 offset 0;
explain (analyze, buffers)
select count(*) from employee e where e.deleted_at is null;

\echo '== Deep page, name order (offset 9,980; names repeat in the seed) =='
explain (analyze, buffers)
select e.id, e.full_name, e.email, e.job_title, e.department, e.country_code, e.salary, e.hire_date, e.version
from employee e where e.deleted_at is null order by e.full_name asc, e.id asc limit 20 offset 9980;

\echo '== Deep page, salary order (salaries are round, so many ties) =='
explain (analyze, buffers)
select e.id, e.full_name, e.email, e.job_title, e.department, e.country_code, e.salary, e.hire_date, e.version
from employee e where e.deleted_at is null order by e.salary desc, e.id asc limit 20 offset 9980;

\echo '== Deep page, hire date order (about 1.6 hires per day) =='
explain (analyze, buffers)
select e.id, e.full_name, e.email, e.job_title, e.department, e.country_code, e.salary, e.hire_date, e.version
from employee e where e.deleted_at is null order by e.hire_date asc, e.id asc limit 20 offset 9980;

\echo '== Search by name: q=patel =='
explain (analyze, buffers)
select e.id, e.full_name, e.email, e.job_title, e.department, e.country_code, e.salary, e.hire_date, e.version
from employee e where e.deleted_at is null
  and (e.full_name ilike '%patel%' escape '\' or e.email ilike '%patel%' escape '\')
order by e.full_name asc, e.id asc limit 20 offset 0;
explain (analyze, buffers)
select count(*) from employee e where e.deleted_at is null
  and (e.full_name ilike '%patel%' escape '\' or e.email ilike '%patel%' escape '\');

\echo '== Search by email: q=00042@ =='
explain (analyze, buffers)
select e.id, e.full_name, e.email, e.job_title, e.department, e.country_code, e.salary, e.hire_date, e.version
from employee e where e.deleted_at is null
  and (e.full_name ilike '%00042@%' escape '\' or e.email ilike '%00042@%' escape '\')
order by e.full_name asc, e.id asc limit 20 offset 0;

\echo '== country=IN, sorted by salary, last page of the country =='
explain (analyze, buffers)
select e.id, e.full_name, e.email, e.job_title, e.department, e.country_code, e.salary, e.hire_date, e.version
from employee e where e.deleted_at is null and e.country_code = 'IN'
order by e.salary asc, e.id asc limit 20 offset 3480;
explain (analyze, buffers)
select count(*) from employee e where e.deleted_at is null and e.country_code = 'IN';

\echo '== department=Engineering =='
explain (analyze, buffers)
select e.id, e.full_name, e.email, e.job_title, e.department, e.country_code, e.salary, e.hire_date, e.version
from employee e where e.deleted_at is null and e.department = 'Engineering'
order by e.full_name asc, e.id asc limit 20 offset 0;

\echo '== jobTitle=Recruiter =='
explain (analyze, buffers)
select e.id, e.full_name, e.email, e.job_title, e.department, e.country_code, e.salary, e.hire_date, e.version
from employee e where e.deleted_at is null and e.job_title = 'Recruiter'
order by e.full_name asc, e.id asc limit 20 offset 0;

\echo '== country=IN + department=Engineering =='
explain (analyze, buffers)
select e.id, e.full_name, e.email, e.job_title, e.department, e.country_code, e.salary, e.hire_date, e.version
from employee e where e.deleted_at is null and e.country_code = 'IN' and e.department = 'Engineering'
order by e.full_name asc, e.id asc limit 20 offset 0;

rollback;
