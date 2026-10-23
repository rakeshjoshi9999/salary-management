package com.acme.salary;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;

import javax.sql.DataSource;

import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The walking skeleton's reason to exist: proof that the application can reach
 * its database and say so. No domain schema is involved - see ADR-001.
 */
class DatabaseConnectivityTest extends AbstractIntegrationTest {

	@Autowired
	private DataSource dataSource;

	@Autowired
	private MockMvcTester mockMvc;

	@Test
	void flywayCreatesItsSchemaHistoryTable() throws Exception {
		try (Connection connection = dataSource.getConnection();
				Statement statement = connection.createStatement();
				ResultSet result = statement
						.executeQuery("select to_regclass('public.flyway_schema_history') is not null")) {

			assertThat(result.next()).isTrue();
			assertThat(result.getBoolean(1))
					.as("Flyway must have run and been able to write to the database")
					.isTrue();
		}
	}

	@Test
	void healthEndpointReportsUp() {
		assertThat(mockMvc.get().uri("/actuator/health"))
				.hasStatusOk()
				.bodyText().contains("\"status\":\"UP\"");
	}

}
