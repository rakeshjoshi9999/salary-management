package com.acme.salary.employee;

import java.time.LocalDate;
import java.util.List;

import org.springframework.jdbc.core.simple.JdbcClient;

/**
 * The list query in plain SQL through {@code JdbcClient} (ADR-044): the page and the count share one
 * WHERE clause, which states {@code deleted_at IS NULL} literally so the partial indexes apply (ADR-012).
 * Spring Data picks this class up by its {@code Impl} suffix.
 */
class EmployeeSearchImpl implements EmployeeSearch {

	private static final String COLUMNS = """
			e.id, e.full_name, e.email, e.job_title, e.department, e.country_code, e.salary, e.hire_date, \
			e.version""";

	private static final String WHERE = "where e.deleted_at is null";

	/** The id tiebreak keeps pages from overlapping when sort values repeat (ADR-016). */
	private static final String ORDER = "order by e.full_name asc, e.id asc";

	private final JdbcClient jdbc;

	EmployeeSearchImpl(JdbcClient jdbc) {
		this.jdbc = jdbc;
	}

	@Override
	public List<EmployeeRow> findPage(int limit, long offset) {
		return jdbc.sql("select " + COLUMNS + " from employee e " + WHERE + " " + ORDER
				+ " limit :limit offset :offset")
			.param("limit", limit)
			.param("offset", offset)
			.query((rs, rowNum) -> new EmployeeRow(rs.getLong("id"), rs.getString("full_name"), rs.getString("email"),
					rs.getString("job_title"), rs.getString("department"), rs.getString("country_code"),
					rs.getBigDecimal("salary"), rs.getObject("hire_date", LocalDate.class), rs.getLong("version")))
			.list();
	}

	@Override
	public long countMatching() {
		return jdbc.sql("select count(*) from employee e " + WHERE).query(Long.class).single();
	}

}
