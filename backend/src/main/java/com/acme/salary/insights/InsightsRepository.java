package com.acme.salary.insights;

import java.math.BigDecimal;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/**
 * The insights aggregates in plain SQL (ADR-022). Aggregation happens here, never in Java; values come
 * back unrounded, and the service rounds them once (ADR-021). Every query states
 * {@code deleted_at IS NULL} literally (ADR-011).
 */
@Repository
class InsightsRepository {

	/**
	 * The median is exact in numeric (ADR-017, ADR-047): the lower middle salary (ascending) plus the
	 * upper middle salary (descending), halved. For an odd headcount both are the same salary.
	 */
	private static final String SALARY_STATS = """
			select count(*) as headcount,
			       min(e.salary) as min,
			       max(e.salary) as max,
			       avg(e.salary) as average,
			       (percentile_disc(0.5) within group (order by e.salary)
			        + percentile_disc(0.5) within group (order by e.salary desc)) / 2 as median
			from employee e
			where e.deleted_at is null and e.country_code = :country
			""";

	private final JdbcClient jdbc;

	InsightsRepository(JdbcClient jdbc) {
		this.jdbc = jdbc;
	}

	RawStats salaryStats(String countryCode) {
		return jdbc.sql(SALARY_STATS)
			.param("country", countryCode)
			.query((rs, rowNum) -> new RawStats(rs.getLong("headcount"), rs.getBigDecimal("min"),
					rs.getBigDecimal("max"), rs.getBigDecimal("average"), rs.getBigDecimal("median")))
			.single();
	}

	/** Unrounded aggregates; all but the headcount are null when nobody matches. */
	record RawStats(long headcount, BigDecimal min, BigDecimal max, BigDecimal average, BigDecimal median) {
	}

}
