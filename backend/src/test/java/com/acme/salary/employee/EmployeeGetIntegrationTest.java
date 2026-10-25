package com.acme.salary.employee;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.MockMvc;

import com.acme.salary.AbstractIntegrationTest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** GET /api/v1/employees/{id} through the whole application. Each test removes what it created. */
class EmployeeGetIntegrationTest extends AbstractIntegrationTest {

	private static final String BODY = """
			{"fullName": "Asha Rao", "email": "asha.rao@acme.com", "jobTitle": "Recruiter",
			 "department": "Human Resources", "countryCode": "IN", "salary": 2400000.00, "hireDate": "2021-04-12"}
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
	void getsCreatedEmployee() throws Exception {
		MockHttpServletResponse created = create();

		String fetched = mvc.perform(get(created.getHeader("Location")))
			.andExpect(status().isOk())
			.andReturn()
			.getResponse()
			.getContentAsString();

		assertThat(fetched).isEqualTo(created.getContentAsString());
	}

	@Test
	void softDeletedEmployeeIs404() throws Exception {
		String location = create().getHeader("Location");
		jdbc.sql("update employee set deleted_at = now()").update();

		mvc.perform(get(location))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("EMPLOYEE_NOT_FOUND"));
	}

	@ParameterizedTest
	@ValueSource(strings = { "0", "-5" })
	void nonPositiveIdIs404(String id) throws Exception {
		mvc.perform(get("/api/v1/employees/" + id))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("EMPLOYEE_NOT_FOUND"));
	}

	private MockHttpServletResponse create() throws Exception {
		return mvc.perform(post("/api/v1/employees").contentType(MediaType.APPLICATION_JSON).content(BODY))
			.andExpect(status().isCreated())
			.andReturn()
			.getResponse();
	}

}
