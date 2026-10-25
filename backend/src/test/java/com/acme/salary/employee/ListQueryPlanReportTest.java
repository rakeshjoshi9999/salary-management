package com.acme.salary.employee;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.simple.JdbcClient;

import com.acme.salary.AbstractIntegrationTest;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Query-plan report for the list (task 4.5, ADR-045): not a regression test. It loads 10,000 synthetic
 * employees and writes EXPLAIN (ANALYZE, BUFFERS) for one search before VACUUM and for each list shape
 * after VACUUM ANALYZE to
 * target/performance/list-plans.txt, using the exact SQL the application builds. It asserts only each
 * query's count, so a wrong query cannot produce a plausible-looking report.
 *
 * Tagged "performance", so the normal suite and CI skip it. Run it with
 * {@code ./mvnw test -Dgroups=performance -DexcludedGroups=none}.
 */
@Tag("performance")
class ListQueryPlanReportTest extends AbstractIntegrationTest {

	private static final int ROWS = 10_000;

	private static final String[] COUNTRIES = { "US", "GB", "IN", "DE", "FR" };

	/** The 18 V2 titles with their departments; row i gets title i % 18. */
	private static final String[][] TITLES = { { "Software Engineer", "Engineering" },
			{ "Senior Software Engineer", "Engineering" }, { "QA Engineer", "Engineering" },
			{ "Engineering Manager", "Engineering" }, { "Sales Representative", "Sales" },
			{ "Account Executive", "Sales" }, { "Sales Manager", "Sales" }, { "Marketing Specialist", "Marketing" },
			{ "Content Strategist", "Marketing" }, { "Marketing Manager", "Marketing" }, { "Accountant", "Finance" },
			{ "Financial Analyst", "Finance" }, { "Finance Manager", "Finance" },
			{ "HR Generalist", "Human Resources" }, { "Recruiter", "Human Resources" },
			{ "HR Manager", "Human Resources" }, { "Operations Analyst", "Operations" },
			{ "Operations Manager", "Operations" } };

	@Autowired
	private JdbcClient jdbc;


	@BeforeEach
	void loadSyntheticEmployees() {
		String titles = sqlArray(IntStream.range(0, TITLES.length).mapToObj(i -> TITLES[i][0]).toList());
		String departments = sqlArray(IntStream.range(0, TITLES.length).mapToObj(i -> TITLES[i][1]).toList());
		String countries = sqlArray(List.of(COUNTRIES));
		jdbc.sql("""
				insert into employee (id, full_name, email, job_title, department, country_code, salary, hire_date)
				select nextval('employee_id_seq'),
				       'Employee ' || lpad(i::text, 5, '0'),
				       'employee' || i || '@acme.com',
				       (%s)[1 + i %% 18],
				       (%s)[1 + i %% 18],
				       (%s)[1 + i %% 5],
				       30000 + (i * 37) %% 200000,
				       date '2000-01-01' + (i %% 9000)
				from generate_series(1, %d) as s(i)
				""".formatted(titles, departments, countries, ROWS)).update();
		jdbc.sql("analyze employee").update();
	}

	@AfterEach
	void removeEmployees() {
		jdbc.sql("delete from employee").update();
	}

	@Test
	void listQueryPlanReport() throws IOException {
		StringBuilder report = new StringBuilder("# List query plans: " + ROWS + " synthetic rows, local Testcontainers\n");

		// Rows inserted into an existing GIN index wait in its pending list until VACUUM, and the planner
		// then avoids the trigram index. Shown once; every shape after it is the steady state.
		report.append("\n# Before VACUUM (trigram pending list full)\n");
		report.append(explain("Search by name (q=01234), before VACUUM",
				criteria("01234", null, null, null, "fullName", false), 20, 0, 1));
		jdbc.sql("vacuum analyze employee").update();
		report.append("\n# After VACUUM ANALYZE\n");

		report.append(explain("Default page (name order)", criteria(null, null, null, null, "fullName", false), 20, 0,
				ROWS));
		report.append(explain("Deep page (offset 9,980)", criteria(null, null, null, null, "fullName", false), 20, 9_980,
				ROWS));
		report.append(explain("Search by name (q=01234)", criteria("01234", null, null, null, "fullName", false), 20, 0,
				1));
		report.append(explain("Search by email (q=1234@)", criteria("1234@", null, null, null, "fullName", false), 20, 0,
				1));
		report.append(explain("Filter country=IN", criteria(null, "IN", null, null, "fullName", false), 20, 0,
				expected(i -> COUNTRIES[i % 5].equals("IN"))));
		report.append(explain("Filter department=Engineering",
				criteria(null, null, "Engineering", null, "fullName", false), 20, 0,
				expected(i -> TITLES[i % 18][1].equals("Engineering"))));
		report.append(explain("Filter jobTitle=Recruiter", criteria(null, null, null, "Recruiter", "fullName", false), 20,
				0, expected(i -> TITLES[i % 18][0].equals("Recruiter"))));
		report.append(explain("Filter country=IN and department=Engineering",
				criteria(null, "IN", "Engineering", null, "fullName", false), 20, 0,
				expected(i -> COUNTRIES[i % 5].equals("IN") && TITLES[i % 18][1].equals("Engineering"))));
		report.append(explain("Sort salary desc", criteria(null, null, null, null, "salary", true), 20, 0, ROWS));
		report.append(explain("Sort hireDate asc", criteria(null, null, null, null, "hireDate", false), 20, 0, ROWS));

		Path out = Path.of("target", "performance", "list-plans.txt");
		Files.createDirectories(out.getParent());
		Files.writeString(out, report, StandardCharsets.UTF_8);
		System.out.println(report);
	}

	/** Checks the count, then EXPLAINs the page and the count exactly as the application builds them. */
	private String explain(String title, EmployeeSearch.Criteria criteria, int limit, long offset, long expectedCount) {
		EmployeeSearchImpl.Sql count = EmployeeSearchImpl.countSql(criteria);
		long actual = jdbc.sql(count.text()).params(count.params()).query(Long.class).single();
		assertThat(actual).as(title).isEqualTo(expectedCount);

		EmployeeSearchImpl.Sql page = EmployeeSearchImpl.pageSql(criteria, limit, offset);
		return "\n## " + title + " (matches " + actual + ")\n\n### Page\n" + plan(page) + "\n### Count\n" + plan(count);
	}

	private String plan(EmployeeSearchImpl.Sql sql) {
		return jdbc.sql("explain (analyze, buffers) " + sql.text())
			.params(sql.params())
			.query(String.class)
			.list()
			.stream()
			.collect(Collectors.joining("\n", "", "\n"));
	}

	private static EmployeeSearch.Criteria criteria(String q, String country, String department, String jobTitle,
			String sortField, boolean descending) {
		return new EmployeeSearch.Criteria(q, country, department, jobTitle, sortField, descending);
	}

	private static long expected(java.util.function.IntPredicate matches) {
		return IntStream.rangeClosed(1, ROWS).filter(matches).count();
	}

	private static String sqlArray(List<String> values) {
		return values.stream().map(v -> "'" + v + "'").collect(Collectors.joining(",", "array[", "]::text[]"));
	}

}
