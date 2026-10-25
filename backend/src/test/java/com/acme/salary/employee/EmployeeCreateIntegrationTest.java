package com.acme.salary.employee;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.ZoneOffset;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;

import com.acme.salary.AbstractIntegrationTest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Create through the whole application against Postgres. These tests commit, so each one removes the
 * employees it made.
 */
class EmployeeCreateIntegrationTest extends AbstractIntegrationTest {

	private static final String BODY = """
			{"fullName": "Asha Rao", "email": "%s", "jobTitle": "Recruiter", "department": "Human Resources",
			 "countryCode": "%s", "salary": 2400000.00, "hireDate": "2021-04-12"}
			""";

	@Autowired
	private MockMvc mvc;

	@Autowired
	private JdbcClient jdbc;

	@Autowired
	private EmployeeService service;

	@Autowired
	private ApplicationContext context;

	@AfterEach
	void removeEmployees() {
		jdbc.sql("delete from employee").update();
	}

	@Test
	void persistsCreatedEmployee() throws Exception {
		String response = mvc
			.perform(post("/api/v1/employees").contentType(MediaType.APPLICATION_JSON)
				.content(BODY.formatted("asha.rao@acme.com", "IN")))
			.andExpect(status().isCreated())
			.andReturn()
			.getResponse()
			.getContentAsString();
		long id = JsonMapper.builder().build().readTree(response).get("id").asLong();

		Map<String, Object> row = jdbc.sql("select * from employee where id = :id").param("id", id).query().singleRow();
		assertThat(row).containsEntry("full_name", "Asha Rao")
			.containsEntry("email", "asha.rao@acme.com")
			.containsEntry("job_title", "Recruiter")
			.containsEntry("department", "Human Resources")
			.containsEntry("country_code", "IN")
			.containsEntry("version", 0L)
			.containsEntry("deleted_at", null);
		assertThat((BigDecimal) row.get("salary")).isEqualByComparingTo("2400000.00");
		assertThat(row.get("hire_date").toString()).isEqualTo("2021-04-12");
	}

	@Test
	void validatesAgainstSeededReferenceData() throws Exception {
		mvc.perform(post("/api/v1/employees").contentType(MediaType.APPLICATION_JSON)
			.content(BODY.formatted("asha.rao@acme.com", "JP")))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
			.andExpect(jsonPath("$.errors[0].field").value("countryCode"));
	}

	@Test
	void idsComeFromSequenceInBlocksOf50() {
		service.create(Requests.valid().with("email", "warm.up@acme.com").build());
		long before = sequenceLastValue();
		Set<Long> ids = new HashSet<>();

		for (int i = 0; i < 51; i++) {
			ids.add(service.create(Requests.valid().with("email", "employee" + i + "@acme.com").build()).id());
		}

		long after = sequenceLastValue();
		assertThat(ids).hasSize(51).doesNotContainNull();
		assertThat(after - before).as("one id per sequence call would advance it by 2,550").isLessThanOrEqualTo(100);
	}

	@Test
	void clockBeanIsUtc() {
		assertThat(context.getBean(Clock.class).getZone()).isEqualTo(ZoneOffset.UTC);
	}

	private long sequenceLastValue() {
		return jdbc.sql("select last_value from employee_id_seq").query(Long.class).single();
	}

}
