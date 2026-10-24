package com.acme.salary.schema;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.simple.JdbcClient;

import com.acme.salary.AbstractIntegrationTest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;
import static org.assertj.core.api.SoftAssertions.assertSoftly;

/**
 * The parts of the schema that behaviour cannot reach: types, indexes, names and the sequence
 * (ADR-009, ADR-012, ADR-036). Definitions are pinned in the text Postgres 18 itself reports.
 */
class SchemaCatalogTest extends AbstractIntegrationTest {

	private static final String PARTIAL = " WHERE (deleted_at IS NULL)";

	@Autowired
	private JdbcClient jdbc;

	@Test
	void employeeColumnsMatchDesign() {
		List<String> columns = columnsOf("employee");

		assertThat(columns).containsExactly(
				"id bigint not null",
				"full_name character varying(200) not null",
				"email character varying(254) not null",
				"job_title character varying(100) not null",
				"department character varying(100) not null",
				"country_code character(2) not null",
				"salary numeric(14,2) not null",
				"hire_date date not null",
				"version bigint not null",
				"deleted_at timestamp with time zone null");
	}

	@Test
	void referenceColumnsMatchDesign() {
		assertSoftly(softly -> {
			softly.assertThat(columnsOf("country")).containsExactly(
					"code character(2) not null",
					"name character varying(100) not null",
					"currency_code character(3) not null");
			softly.assertThat(columnsOf("department")).containsExactly(
					"name character varying(100) not null");
			softly.assertThat(columnsOf("job_title")).containsExactly(
					"name character varying(100) not null",
					"department character varying(100) not null");
		});
	}

	@Test
	void employeeIdSequenceIncrementsBy50() {
		Map<String, Object> sequence = jdbc.sql("""
				select start_value, increment_by from pg_sequences
				where schemaname = 'public' and sequencename = 'employee_id_seq'
				""").query().singleRow();

		assertThat(sequence).containsEntry("start_value", 1L).containsEntry("increment_by", 50L);
	}

	@Test
	void trigramExtensionIsInstalled() {
		List<String> extensions = jdbc.sql("select extname from pg_extension").query(String.class).list();

		assertThat(extensions).contains("pg_trgm");
	}

	static List<Arguments> indexes() {
		return List.of(
				Arguments.of("employee_email_active_uq",
						"CREATE UNIQUE INDEX employee_email_active_uq ON public.employee USING btree (lower((email)::text))"
								+ PARTIAL),
				Arguments.of("employee_full_name_trgm",
						"CREATE INDEX employee_full_name_trgm ON public.employee USING gin (full_name gin_trgm_ops)"
								+ PARTIAL),
				Arguments.of("employee_email_trgm",
						"CREATE INDEX employee_email_trgm ON public.employee USING gin (email gin_trgm_ops)" + PARTIAL),
				Arguments.of("employee_country_salary_idx",
						"CREATE INDEX employee_country_salary_idx ON public.employee USING btree (country_code, salary)"
								+ PARTIAL),
				Arguments.of("employee_country_title_idx",
						"CREATE INDEX employee_country_title_idx ON public.employee USING btree (country_code, job_title)"
								+ PARTIAL),
				Arguments.of("employee_country_dept_idx",
						"CREATE INDEX employee_country_dept_idx ON public.employee USING btree (country_code, department)"
								+ PARTIAL),
				Arguments.of("employee_full_name_idx",
						"CREATE INDEX employee_full_name_idx ON public.employee USING btree (full_name)" + PARTIAL),
				Arguments.of("employee_salary_idx",
						"CREATE INDEX employee_salary_idx ON public.employee USING btree (salary)" + PARTIAL),
				Arguments.of("employee_hire_date_idx",
						"CREATE INDEX employee_hire_date_idx ON public.employee USING btree (hire_date)" + PARTIAL));
	}

	@ParameterizedTest(name = "{0}")
	@MethodSource("indexes")
	void indexDefinitionMatches(String name, String expectedDefinition) {
		List<String> definitions = jdbc
				.sql("select indexdef from pg_indexes where schemaname = 'public' and indexname = :name")
				.param("name", name)
				.query(String.class)
				.list();

		assertThat(definitions).containsExactly(expectedDefinition);
	}

	@Test
	void employeeHasNoUnexpectedIndexes() {
		List<String> names = jdbc
				.sql("select indexname from pg_indexes where schemaname = 'public' and tablename = 'employee'")
				.query(String.class)
				.list();

		List<String> expected = new ArrayList<>(
				indexes().stream().map(arguments -> (String) arguments.get()[0]).toList());
		expected.add("employee_pk");
		assertThat(names).containsExactlyInAnyOrderElementsOf(expected);
	}

	@Test
	void constraintsMatchDesign() {
		// Postgres 18 also lists every NOT NULL as a constraint with a generated name; those are left out.
		List<Map<String, Object>> constraints = jdbc.sql("""
				select conrelid::regclass::text as table_name, conname, pg_get_constraintdef(oid) as definition
				from pg_constraint
				where conrelid in ('country'::regclass, 'department'::regclass, 'job_title'::regclass,
				                   'employee'::regclass)
				  and contype in ('p', 'u', 'f', 'c')
				""").query().listOfRows();

		assertThat(constraints)
				.extracting(row -> row.get("table_name"), row -> row.get("conname"), row -> row.get("definition"))
				.containsExactlyInAnyOrder(
						tuple("country", "country_pk", "PRIMARY KEY (code)"),
						tuple("country", "country_name_uq", "UNIQUE (name)"),
						tuple("department", "department_pk", "PRIMARY KEY (name)"),
						tuple("job_title", "job_title_pk", "PRIMARY KEY (name)"),
						tuple("job_title", "job_title_department_fk",
								"FOREIGN KEY (department) REFERENCES department(name)"),
						tuple("job_title", "job_title_department_name_uq", "UNIQUE (department, name)"),
						tuple("employee", "employee_pk", "PRIMARY KEY (id)"),
						tuple("employee", "employee_country_fk",
								"FOREIGN KEY (country_code) REFERENCES country(code)"),
						tuple("employee", "employee_title_in_department_fk",
								"FOREIGN KEY (department, job_title) REFERENCES job_title(department, name)"),
						tuple("employee", "employee_salary_positive_ck", "CHECK ((salary > (0)::numeric))"),
						tuple("employee", "employee_hire_date_min_ck", "CHECK ((hire_date >= '1950-01-01'::date))"));
	}

	@Test
	void flywayAppliedBothMigrations() {
		List<Map<String, Object>> history = jdbc.sql("""
				select version, description, success from flyway_schema_history
				where version is not null
				""").query().listOfRows();

		// Later migrations add rows; this test only cares that V1 and V2 ran and nothing failed.
		assertThat(history)
				.extracting(row -> row.get("version"), row -> row.get("description"), row -> row.get("success"))
				.contains(
						tuple("1", "create schema", true),
						tuple("2", "seed reference data", true));
		assertThat(history).extracting(row -> row.get("success")).containsOnly(true);
	}

	private List<String> columnsOf(String table) {
		return jdbc.sql("""
				select attname || ' ' || format_type(atttypid, atttypmod)
				       || case when attnotnull then ' not null' else ' null' end
				from pg_attribute
				where attrelid = to_regclass(:table) and attnum > 0 and not attisdropped
				order by attnum
				""").param("table", table).query(String.class).list();
	}

}
