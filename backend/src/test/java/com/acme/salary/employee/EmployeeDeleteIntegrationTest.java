package com.acme.salary.employee;

import java.util.Map;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.acme.salary.AbstractIntegrationTest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** DELETE /api/v1/employees/{id} through the whole application (ADR-011, ADR-042). Each test cleans up. */
class EmployeeDeleteIntegrationTest extends AbstractIntegrationTest {

	private static final String CREATE = """
			{"fullName": "Asha Rao", "email": "asha.rao@acme.com", "jobTitle": "Recruiter",
			 "department": "Human Resources", "countryCode": "IN", "salary": 2400000.00, "hireDate": "2021-04-12"}
			""";

	private static final String UPDATE = """
			{"fullName": "Asha Rao", "email": "asha.rao@acme.com", "jobTitle": "Recruiter",
			 "department": "Human Resources", "countryCode": "IN", "salary": 2500000.00, "hireDate": "2021-04-12",
			 "version": 0}
			""";

	@Autowired
	private MockMvc mvc;

	@Autowired
	private JdbcClient jdbc;

	@AfterEach
	void removeEmployees() {
		jdbc.sql("delete from employee").update();
	}

	@Test
	void deleteThenGetIs404() throws Exception {
		long id = createdId();

		mvc.perform(delete("/api/v1/employees/" + id)).andExpect(status().isNoContent());

		mvc.perform(get("/api/v1/employees/" + id))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("EMPLOYEE_NOT_FOUND"));
	}

	@Test
	void secondDeleteIs404() throws Exception {
		long id = createdId();
		mvc.perform(delete("/api/v1/employees/" + id)).andExpect(status().isNoContent());

		mvc.perform(delete("/api/v1/employees/" + id))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("EMPLOYEE_NOT_FOUND"));
	}

	@Test
	void deletedRowIsKept() throws Exception {
		long id = createdId();

		mvc.perform(delete("/api/v1/employees/" + id)).andExpect(status().isNoContent());

		Map<String, Object> row = jdbc.sql("select deleted_at, version from employee where id = :id")
			.param("id", id)
			.query()
			.singleRow();
		assertThat(row.get("deleted_at")).isNotNull();
		assertThat(row.get("version")).isEqualTo(1L);
	}

	@Test
	void updateAfterDeleteIs404() throws Exception {
		long id = createdId();
		mvc.perform(delete("/api/v1/employees/" + id)).andExpect(status().isNoContent());

		mvc.perform(put("/api/v1/employees/" + id).contentType(MediaType.APPLICATION_JSON).content(UPDATE))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("EMPLOYEE_NOT_FOUND"));
	}

	@Test
	void emailIsReusableAfterDelete() throws Exception {
		long id = createdId();
		mvc.perform(delete("/api/v1/employees/" + id)).andExpect(status().isNoContent());

		create().andExpect(status().isCreated());
	}

	private long createdId() throws Exception {
		return idOf(create().andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
	}

	private ResultActions create() throws Exception {
		return mvc.perform(post("/api/v1/employees").contentType(MediaType.APPLICATION_JSON).content(CREATE));
	}

	private long idOf(String body) {
		return JsonMapper.builder().build().readTree(body).get("id").asLong();
	}

}
