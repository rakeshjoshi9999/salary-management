package com.acme.salary.schema;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;

import com.acme.salary.AbstractIntegrationTest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.assertj.core.api.Assertions.tuple;

/** The app_settings table from V3 (ADR-028, ADR-036 naming). Every test rolls back. */
@Transactional
class SettingsSchemaTest extends AbstractIntegrationTest {

	@Autowired
	private JdbcClient jdbc;

	@Test
	void migrationSeedsIndia() {
		Map<String, Object> row = jdbc.sql("select id, default_country_code, version from app_settings").query().singleRow();
		List<Map<String, Object>> constraints = jdbc.sql("""
				select conname, pg_get_constraintdef(oid) as definition
				from pg_constraint
				where conrelid = 'app_settings'::regclass
				  and contype in ('p', 'u', 'f', 'c')
				order by conname
				""").query().listOfRows();

		assertThat(row).containsEntry("id", 1).containsEntry("default_country_code", "IN").containsEntry("version", 0L);
		assertThat(constraints).extracting(c -> c.get("conname"), c -> c.get("definition"))
			.containsExactly(tuple("app_settings_country_fk", "FOREIGN KEY (default_country_code) REFERENCES country(code)"),
					tuple("app_settings_pk", "PRIMARY KEY (id)"),
					tuple("app_settings_single_row_ck", "CHECK ((id = 1))"));
	}

	@Test
	void rejectsSecondSettingsRow() {
		DataIntegrityViolationException violation = catchThrowableOfType(DataIntegrityViolationException.class,
				() -> jdbc.sql("insert into app_settings (id, default_country_code) values (2, 'DE')").update());

		assertThat(violation).isNotNull();
		assertThat(violation.getMessage()).contains("app_settings_single_row_ck");
	}

}
