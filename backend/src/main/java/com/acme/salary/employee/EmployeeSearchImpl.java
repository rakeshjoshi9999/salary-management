package com.acme.salary.employee;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.simple.JdbcClient;

/**
 * The list query in plain SQL through {@code JdbcClient} (ADR-044): the page and the count share one
 * WHERE clause, which states {@code deleted_at IS NULL} literally so the partial indexes apply (ADR-012).
 * Values always travel as named parameters. Spring Data picks this class up by its {@code Impl} suffix.
 */
class EmployeeSearchImpl implements EmployeeSearch {

	private static final String COLUMNS = """
			e.id, e.full_name, e.email, e.job_title, e.department, e.country_code, e.salary, e.hire_date, \
			e.version""";

	/** API sort names to columns: the only way a sort reaches the SQL (ADR-044). */
	private static final Map<String, String> SORT_COLUMNS = Map.of("fullName", "e.full_name", "salary", "e.salary",
			"hireDate", "e.hire_date");

	private final JdbcClient jdbc;

	EmployeeSearchImpl(JdbcClient jdbc) {
		this.jdbc = jdbc;
	}

	@Override
	public List<EmployeeRow> findPage(Criteria criteria, int limit, long offset) {
		Sql page = pageSql(criteria, limit, offset);
		return jdbc.sql(page.text())
			.params(page.params())
			.query((rs, rowNum) -> new EmployeeRow(rs.getLong("id"), rs.getString("full_name"), rs.getString("email"),
					rs.getString("job_title"), rs.getString("department"), rs.getString("country_code"),
					rs.getBigDecimal("salary"), rs.getObject("hire_date", LocalDate.class), rs.getLong("version")))
			.list();
	}

	@Override
	public long countMatching(Criteria criteria) {
		Sql count = countSql(criteria);
		return jdbc.sql(count.text()).params(count.params()).query(Long.class).single();
	}

	/** The page query exactly as it runs; the plan report (4.5, ADR-045) explains this same text. */
	static Sql pageSql(Criteria criteria, int limit, long offset) {
		Where where = where(criteria);
		Map<String, Object> params = new HashMap<>(where.params());
		params.put("limit", limit);
		params.put("offset", offset);
		return new Sql("select " + COLUMNS + " from employee e " + where.sql() + " " + orderBy(criteria)
				+ " limit :limit offset :offset", params);
	}

	/** The count query exactly as it runs. */
	static Sql countSql(Criteria criteria) {
		Where where = where(criteria);
		return new Sql("select count(*) from employee e " + where.sql(), where.params());
	}

	/**
	 * The requested column and direction, then {@code id} ascending, so pages never overlap when sort
	 * values repeat (ADR-016). An unknown field fails here rather than reaching the SQL.
	 */
	private static String orderBy(Criteria criteria) {
		String column = SORT_COLUMNS.get(criteria.sortField());
		if (column == null) {
			throw new IllegalArgumentException("Unsupported sort field: " + criteria.sortField());
		}
		return "order by " + column + (criteria.descending() ? " desc" : " asc") + ", e.id asc";
	}

	/**
	 * Search uses ILIKE on the raw columns, which the trigram indexes serve; {@code lower(col) LIKE}
	 * would not (ADR-012).
	 */
	private static Where where(Criteria criteria) {
		StringBuilder sql = new StringBuilder("where e.deleted_at is null");
		Map<String, Object> params = new HashMap<>();
		if (criteria.q() != null) {
			sql.append(" and (e.full_name ilike :q escape '\\' or e.email ilike :q escape '\\')");
			params.put("q", "%" + escapeLike(criteria.q()) + "%");
		}
		if (criteria.country() != null) {
			sql.append(" and e.country_code = :country");
			params.put("country", criteria.country());
		}
		if (criteria.department() != null) {
			sql.append(" and e.department = :department");
			params.put("department", criteria.department());
		}
		if (criteria.jobTitle() != null) {
			sql.append(" and e.job_title = :jobTitle");
			params.put("jobTitle", criteria.jobTitle());
		}
		return new Where(sql.toString(), params);
	}

	/** Makes {@code \}, {@code %} and {@code _} match themselves. The backslash goes first (ADR-044). */
	private static String escapeLike(String text) {
		return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
	}

	private record Where(String sql, Map<String, Object> params) {
	}

	/** A statement and its named parameters. */
	record Sql(String text, Map<String, Object> params) {
	}

}
