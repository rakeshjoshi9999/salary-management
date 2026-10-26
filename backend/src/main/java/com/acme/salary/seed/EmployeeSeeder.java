package com.acme.salary.seed;

import java.sql.Date;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Inserts seed employees in JDBC batches, in one transaction, and vacuums the table afterwards (ADR-049).
 * Employees whose email is already active are skipped, so a rerun inserts nothing.
 */
@Component
class EmployeeSeeder {

	private static final int BATCH_SIZE = 500;

	/** Equals the sequence's INCREMENT BY and the JPA allocationSize (ADR-009). */
	private static final int ID_BLOCK = 50;

	private static final String INSERT = """
			insert into employee (id, full_name, email, job_title, department, country_code, salary, hire_date)
			values (?, ?, ?, ?, ?, ?, ?, ?)
			on conflict (lower(email)) where deleted_at is null do nothing""";

	private final JdbcTemplate jdbc;

	private final TransactionTemplate transaction;

	EmployeeSeeder(JdbcTemplate jdbc, PlatformTransactionManager transactionManager) {
		this.jdbc = jdbc;
		this.transaction = new TransactionTemplate(transactionManager);
	}

	SeedResult seed(List<SeedEmployee> employees) {
		long start = System.nanoTime();
		int inserted = transaction.execute(status -> insertMissing(employees));
		return new SeedResult(inserted, employees.size() - inserted, Duration.ofNanos(System.nanoTime() - start));
	}

	/**
	 * Runs outside any transaction, which VACUUM requires. It merges the trigram indexes' pending lists, so
	 * search uses them at once rather than after autovacuum (4.5), and refreshes the planner's statistics.
	 */
	Duration vacuumAnalyze() {
		long start = System.nanoTime();
		jdbc.execute("vacuum analyze employee");
		return Duration.ofNanos(System.nanoTime() - start);
	}

	private int insertMissing(List<SeedEmployee> employees) {
		Set<String> active = new HashSet<>(jdbc.queryForList(
				"select lower(email) from employee where deleted_at is null and lower(email) like ?", String.class,
				"%@" + SeedCatalog.EMAIL_DOMAIN));
		List<SeedEmployee> missing = employees.stream()
			.filter(e -> !active.contains(e.email().toLowerCase(Locale.ROOT)))
			.toList();
		List<Long> ids = reserveIds(missing.size());
		List<Row> rows = new ArrayList<>(missing.size());
		for (int i = 0; i < missing.size(); i++) {
			rows.add(new Row(ids.get(i), missing.get(i)));
		}
		int[][] counts = jdbc.batchUpdate(INSERT, rows, BATCH_SIZE, (ps, row) -> {
			SeedEmployee e = row.employee();
			ps.setLong(1, row.id());
			ps.setString(2, e.fullName());
			ps.setString(3, e.email());
			ps.setString(4, e.jobTitle());
			ps.setString(5, e.department());
			ps.setString(6, e.countryCode());
			ps.setBigDecimal(7, e.salary());
			ps.setDate(8, Date.valueOf(e.hireDate()));
		});
		// Per-row counts are 1 or 0 (ON CONFLICT). pgjdbc's reWriteBatchedInserts would report -2 instead.
		int inserted = 0;
		for (int[] batch : counts) {
			for (int count : batch) {
				inserted += count;
			}
		}
		return inserted;
	}

	/**
	 * Ids the JPA generator will never hand out (ADR-049): for each sequence value V, the block V-49..V. Any
	 * value Hibernate takes later is at least V+50, and it uses the 50 ids up to that value. A value below 50
	 * (a fresh sequence) is skipped, since its block would reach below 1. All values come in one query, so
	 * the cost over Neon's network is one round trip, not one per block. One race is not covered: on a
	 * fresh sequence, a first API create running at the same moment as the seed (Hibernate takes two values
	 * when the first is 1). Do not seed an empty database while someone is adding its first employee.
	 */
	private List<Long> reserveIds(int count) {
		List<Long> ids = new ArrayList<>(count);
		if (count == 0) {
			return ids;
		}
		// One spare value covers the skipped first value of a fresh sequence.
		int blocks = Math.ceilDiv(count, ID_BLOCK) + 1;
		List<Long> values = jdbc.queryForList("select nextval('employee_id_seq') from generate_series(1, ?)",
				Long.class, blocks);
		for (long value : values) {
			if (value < ID_BLOCK) {
				continue;
			}
			for (long id = value - ID_BLOCK + 1; id <= value && ids.size() < count; id++) {
				ids.add(id);
			}
		}
		if (ids.size() < count) {
			throw new IllegalStateException("employee_id_seq must increment by " + ID_BLOCK);
		}
		return ids;
	}

	private record Row(long id, SeedEmployee employee) {
	}

}
