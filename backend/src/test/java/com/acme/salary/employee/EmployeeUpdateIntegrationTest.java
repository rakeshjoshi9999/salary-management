package com.acme.salary.employee;

import java.math.BigDecimal;
import java.util.Map;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import com.acme.salary.AbstractIntegrationTest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * PUT /api/v1/employees/{id} through the whole application against Postgres (ADR-023, ADR-041). These
 * tests commit, so each one removes the employees it made.
 */
class EmployeeUpdateIntegrationTest extends AbstractIntegrationTest {

	private static final String CREATE = """
			{"fullName": "Asha Rao", "email": "%s", "jobTitle": "Recruiter", "department": "Human Resources",
			 "countryCode": "IN", "salary": 2400000.00, "hireDate": "2021-04-12"}
			""";

	private static final String UPDATE = """
			{"fullName": "Asha Rao", "email": "%s", "jobTitle": "Recruiter", "department": "Human Resources",
			 "countryCode": "IN", "salary": %s, "hireDate": "2021-04-12", "version": %d}
			""";

	private static final JsonMapper JSON = JsonMapper.builder().build();

	@Autowired
	private MockMvc mvc;

	@Autowired
	private JdbcClient jdbc;

	@Autowired
	private EmployeeService service;

	@Autowired
	private EmployeeRepository repository;

	@Autowired
	private PlatformTransactionManager transactions;

	@AfterEach
	void removeEmployees() {
		jdbc.sql("delete from employee").update();
	}

	@Test
	void updatePersistsAndBumpsVersion() throws Exception {
		long id = create("asha.rao@acme.com");

		update(id, "asha.rao@acme.com", "2500000.00", 0).andExpect(status().isOk())
			.andExpect(jsonPath("$.version").value(1))
			.andExpect(jsonPath("$.salary").value(2500000.00));

		mvc.perform(get("/api/v1/employees/" + id))
			.andExpect(jsonPath("$.version").value(1))
			.andExpect(jsonPath("$.salary").value(2500000.00));
	}

	@Test
	void staleUpdateIs409AndWritesNothing() throws Exception {
		long id = create("asha.rao@acme.com");
		update(id, "asha.rao@acme.com", "2500000.00", 0).andExpect(status().isOk());

		update(id, "asha.rao@acme.com", "9999.00", 0).andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("STALE_VERSION"))
			.andExpect(jsonPath("$.currentVersion").value(1));

		Map<String, Object> row = jdbc.sql("select salary, version from employee where id = :id")
			.param("id", id)
			.query()
			.singleRow();
		assertThat((BigDecimal) row.get("salary")).isEqualByComparingTo("2500000.00");
		assertThat(row.get("version")).isEqualTo(1L);
	}

	@Test
	void noOpUpdateKeepsVersion() throws Exception {
		long id = create("asha.rao@acme.com");

		update(id, "asha.rao@acme.com", "2400000.00", 0).andExpect(status().isOk())
			.andExpect(jsonPath("$.version").value(0));
	}

	/**
	 * The race ADR-023 guards: the employee is loaded in an open transaction, another transaction commits
	 * a change (version 5), and only then does the update run in the first transaction.
	 */
	@Test
	void concurrentCommitIs409WithTrueVersion() throws Exception {
		long id = create("asha.rao@acme.com");
		TransactionTemplate outer = new TransactionTemplate(transactions);
		TransactionTemplate other = new TransactionTemplate(transactions);
		other.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);

		Throwable thrown = outer.execute(status -> {
			repository.findActiveById(id).orElseThrow();
			other.executeWithoutResult(s -> jdbc.sql("update employee set salary = 1.00, version = 5 where id = :id")
				.param("id", id)
				.update());
			Throwable caught = catchThrowable(() -> service
				.update(id, Requests.valid().with("salary", new BigDecimal("2500000.00")).buildUpdate(0L)));
			status.setRollbackOnly();
			return caught;
		});

		assertThat(thrown).isInstanceOf(StaleVersionException.class);
		StaleVersionException stale = (StaleVersionException) thrown;
		assertThat(stale.getBody().getStatus()).isEqualTo(409);
		assertThat(stale.currentVersion()).isEqualTo(5L);
	}

	@Test
	void updatingDeletedEmployeeIs404() throws Exception {
		long id = create("asha.rao@acme.com");
		jdbc.sql("update employee set deleted_at = now()").update();

		update(id, "asha.rao@acme.com", "2500000.00", 0).andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("EMPLOYEE_NOT_FOUND"));
	}

	@Test
	void updateToEmailOfAnotherEmployeeIs409() throws Exception {
		create("asha.rao@acme.com");
		long ben = create("ben.ito@acme.com");

		update(ben, "ASHA.RAO@acme.com", "2400000.00", 0).andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("DUPLICATE_EMAIL"));
	}

	@Test
	void changingCaseOfOwnEmailSucceeds() throws Exception {
		long id = create("Asha.Rao@acme.com");

		update(id, "asha.rao@acme.com", "2400000.00", 0).andExpect(status().isOk())
			.andExpect(jsonPath("$.email").value("asha.rao@acme.com"));
	}

	private long create(String email) throws Exception {
		String body = mvc
			.perform(post("/api/v1/employees").contentType(MediaType.APPLICATION_JSON).content(CREATE.formatted(email)))
			.andExpect(status().isCreated())
			.andReturn()
			.getResponse()
			.getContentAsString();
		JsonNode created = JSON.readTree(body);
		return created.get("id").asLong();
	}

	private ResultActions update(long id, String email, String salary, long version) throws Exception {
		return mvc.perform(put("/api/v1/employees/" + id).contentType(MediaType.APPLICATION_JSON)
			.content(UPDATE.formatted(email, salary, version)));
	}

}
