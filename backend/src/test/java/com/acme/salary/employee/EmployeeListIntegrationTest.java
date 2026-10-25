package com.acme.salary.employee;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.acme.salary.AbstractIntegrationTest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * GET /api/v1/employees against Postgres (ADR-016, ADR-044). Rows are inserted directly, so each test's
 * expected page can be worked out by hand; each test removes them.
 */
class EmployeeListIntegrationTest extends AbstractIntegrationTest {

	private static final JsonMapper JSON = JsonMapper.builder().build();

	@Autowired
	private MockMvc mvc;

	@Autowired
	private JdbcClient jdbc;

	@AfterEach
	void removeEmployees() {
		jdbc.sql("delete from employee").update();
	}

	@Test
	void firstPageUsesDefaults() throws Exception {
		insertNumbered(25);

		list(get("/api/v1/employees")).andExpect(status().isOk())
			.andExpect(jsonPath("$.page").value(0))
			.andExpect(jsonPath("$.size").value(20))
			.andExpect(jsonPath("$.totalItems").value(25))
			.andExpect(jsonPath("$.totalPages").value(2))
			.andExpect(jsonPath("$.items", hasSize(20)))
			.andExpect(jsonPath("$.items[0].fullName").value("Employee 01"))
			.andExpect(jsonPath("$.items[19].fullName").value("Employee 20"));
	}

	@Test
	void returnsRequestedPage() throws Exception {
		insertNumbered(25);

		list(get("/api/v1/employees").param("page", "1")).andExpect(status().isOk())
			.andExpect(jsonPath("$.page").value(1))
			.andExpect(jsonPath("$.items", hasSize(5)))
			.andExpect(jsonPath("$.items[0].fullName").value("Employee 21"))
			.andExpect(jsonPath("$.items[4].fullName").value("Employee 25"));
	}

	@Test
	void pagePastEndIsEmptyWithTotals() throws Exception {
		insertNumbered(25);

		list(get("/api/v1/employees").param("page", "5")).andExpect(status().isOk())
			.andExpect(jsonPath("$.items", hasSize(0)))
			.andExpect(jsonPath("$.totalItems").value(25))
			.andExpect(jsonPath("$.totalPages").value(2));
	}

	@Test
	void emptyListHasZeroTotals() throws Exception {
		list(get("/api/v1/employees")).andExpect(status().isOk())
			.andExpect(jsonPath("$.items", hasSize(0)))
			.andExpect(jsonPath("$.totalItems").value(0))
			.andExpect(jsonPath("$.totalPages").value(0));
	}

	@Test
	void excludesSoftDeletedEmployees() throws Exception {
		insertNumbered(3);
		jdbc.sql("update employee set deleted_at = now() where full_name = 'Employee 02'").update();

		list(get("/api/v1/employees")).andExpect(status().isOk())
			.andExpect(jsonPath("$.items", hasSize(2)))
			.andExpect(jsonPath("$.totalItems").value(2))
			.andExpect(jsonPath("$.items[0].fullName").value("Employee 01"))
			.andExpect(jsonPath("$.items[1].fullName").value("Employee 03"));
	}

	@Test
	void pagesNeverOverlap() throws Exception {
		List<Long> inserted = new ArrayList<>();
		for (int i = 1; i <= 6; i++) {
			inserted.add(insert("Same Name", "same" + i + "@acme.com"));
		}
		List<Long> seen = new ArrayList<>();

		for (int page = 0; page < 3; page++) {
			JsonNode body = body(list(get("/api/v1/employees").param("size", "2").param("page", String.valueOf(page))));
			body.get("items").forEach(item -> seen.add(item.get("id").asLong()));
		}

		// Same names, so only the id tiebreak fixes the order; ids come from nextval, so inserted is ascending.
		assertThat(seen).containsExactlyElementsOf(inserted);
	}

	private ResultActions list(MockHttpServletRequestBuilder request) throws Exception {
		return mvc.perform(request);
	}

	private static JsonNode body(ResultActions result) throws Exception {
		return JSON.readTree(result.andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
	}

	/** Employees "Employee 01" to "Employee nn", inserted in reverse so the sort, not insertion order, decides. */
	private void insertNumbered(int count) {
		for (int i = count; i >= 1; i--) {
			insert("Employee %02d".formatted(i), "employee%02d@acme.com".formatted(i));
		}
	}

	private long insert(String fullName, String email) {
		return jdbc.sql("""
				insert into employee (id, full_name, email, job_title, department, country_code, salary, hire_date)
				values (nextval('employee_id_seq'), :name, :email, 'Software Engineer', 'Engineering', 'IN',
				        :salary, :hireDate)
				returning id
				""")
			.param("name", fullName)
			.param("email", email)
			.param("salary", new BigDecimal("1000000.00"))
			.param("hireDate", LocalDate.of(2021, 4, 12))
			.query(Long.class)
			.single();
	}

}
