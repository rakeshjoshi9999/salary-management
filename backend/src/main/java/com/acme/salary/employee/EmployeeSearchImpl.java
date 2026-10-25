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

	/** The id tiebreak keeps pages from overlapping when sort values repeat (ADR-016). */
	private static final String ORDER = "order by e.full_name asc, e.id asc";

	private final JdbcClient jdbc;

	EmployeeSearchImpl(JdbcClient jdbc) {
		this.jdbc = jdbc;
	}

	@Override
	public List<EmployeeRow> findPage(Criteria criteria, int limit, long offset) {
		Where where = where(criteria);
		return jdbc.sql("select " + COLUMNS + " from employee e " + where.sql() + " " + ORDER
				+ " limit :limit offset :offset")
			.params(where.params())
			.param("limit", limit)
			.param("offset", offset)
			.query((rs, rowNum) -> new EmployeeRow(rs.getLong("id"), rs.getString("full_name"), rs.getString("email"),
					rs.getString("job_title"), rs.getString("department"), rs.getString("country_code"),
					rs.getBigDecimal("salary"), rs.getObject("hire_date", LocalDate.class), rs.getLong("version")))
			.list();
	}

	@Override
	public long countMatching(Criteria criteria) {
		Where where = where(criteria);
		return jdbc.sql("select count(*) from employee e " + where.sql())
			.params(where.params())
			.query(Long.class)
			.single();
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
		return new Where(sql.toString(), params);
	}

	/** Makes {@code \}, {@code %} and {@code _} match themselves. The backslash goes first (ADR-044). */
	private static String escapeLike(String text) {
		return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
	}

	private record Where(String sql, Map<String, Object> params) {
	}

}
