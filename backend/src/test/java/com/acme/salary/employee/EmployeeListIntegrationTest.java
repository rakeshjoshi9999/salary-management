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
import static org.hamcrest.Matchers.containsInAnyOrder;
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

	@Test
	void searchMatchesPartialNameIgnoringCase() throws Exception {
		insert("Asha Rao", "a.rao@acme.com");
		insert("Ben Ito", "ben@acme.com");

		list(get("/api/v1/employees").param("q", "SHA")).andExpect(status().isOk())
			.andExpect(jsonPath("$.items[*].fullName").value(containsInAnyOrder("Asha Rao")));
	}

	@Test
	void searchMatchesPartialEmail() throws Exception {
		insert("Asha Rao", "asha@north.example");
		insert("Ben Ito", "ben@south.example");

		list(get("/api/v1/employees").param("q", "south.ex")).andExpect(status().isOk())
			.andExpect(jsonPath("$.items[*].fullName").value(containsInAnyOrder("Ben Ito")));
	}

	@Test
	void searchMatchesNameOrEmail() throws Exception {
		insert("Kim Lee", "lee@acme.com");
		insert("Ana Park", "ana.kimura@acme.com");
		insert("Ben Ito", "ben@acme.com");

		list(get("/api/v1/employees").param("q", "kim")).andExpect(status().isOk())
			.andExpect(jsonPath("$.items[*].fullName").value(containsInAnyOrder("Kim Lee", "Ana Park")));
	}

	@Test
	void searchTreatsPercentAndUnderscoreLiterally() throws Exception {
		insert("a_b Rao", "one@acme.com");
		insert("axb Rao", "two@acme.com");
		insert("Got 50% raise", "three@acme.com");
		insert("Got 500 raise", "four@acme.com");

		list(get("/api/v1/employees").param("q", "a_b")).andExpect(status().isOk())
			.andExpect(jsonPath("$.items[*].fullName").value(containsInAnyOrder("a_b Rao")));
		list(get("/api/v1/employees").param("q", "50%")).andExpect(status().isOk())
			.andExpect(jsonPath("$.items[*].fullName").value(containsInAnyOrder("Got 50% raise")));
	}

	/**
	 * Unescaped, {@code a\b} would match "ab" ({@code \b} reads as {@code b}), and {@code ab\} would turn
	 * the closing {@code %} into a literal and find nothing.
	 */
	@Test
	void searchTreatsBackslashLiterally() throws Exception {
		insert("Dir a\\b Rao", "one@acme.com");
		insert("Dir ab Rao", "two@acme.com");
		insert("Dir ab\\ Rao", "three@acme.com");

		list(get("/api/v1/employees").param("q", "a\\b")).andExpect(status().isOk())
			.andExpect(jsonPath("$.items[*].fullName").value(containsInAnyOrder("Dir a\\b Rao")));
		list(get("/api/v1/employees").param("q", "ab\\")).andExpect(status().isOk())
			.andExpect(jsonPath("$.items[*].fullName").value(containsInAnyOrder("Dir ab\\ Rao")));
	}

	@Test
	void blankSearchMeansNoSearch() throws Exception {
		insertNumbered(3);

		list(get("/api/v1/employees").param("q", "  ")).andExpect(status().isOk())
			.andExpect(jsonPath("$.totalItems").value(3));
	}

	@Test
	void rejectsOneCharacterSearch() throws Exception {
		list(get("/api/v1/employees").param("q", " a ")).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
			.andExpect(jsonPath("$.errors[0].field").value("q"))
			.andExpect(jsonPath("$.errors[0].message").value("must be at least 2 characters"));
	}

	@Test
	void rejectsSearchOver254Characters() throws Exception {
		list(get("/api/v1/employees").param("q", "a".repeat(255))).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
			.andExpect(jsonPath("$.errors[0].field").value("q"))
			.andExpect(jsonPath("$.errors[0].message").value("must be at most 254 characters"));
	}

	@Test
	void totalsCountOnlyMatches() throws Exception {
		insertNumbered(25);
		insert("Zara Khan", "zara@acme.com");

		list(get("/api/v1/employees").param("q", "employee 0")).andExpect(status().isOk())
			.andExpect(jsonPath("$.totalItems").value(9))
			.andExpect(jsonPath("$.totalPages").value(1));
	}

	@Test
	void filtersByCountry() throws Exception {
		insertThreeTeams();

		list(get("/api/v1/employees").param("country", "IN")).andExpect(status().isOk())
			.andExpect(jsonPath("$.items[*].fullName").value(containsInAnyOrder("Asha Rao", "Chen Wu")))
			.andExpect(jsonPath("$.totalItems").value(2));
	}

	@Test
	void filtersByDepartment() throws Exception {
		insertThreeTeams();

		list(get("/api/v1/employees").param("department", "Engineering")).andExpect(status().isOk())
			.andExpect(jsonPath("$.items[*].fullName").value(containsInAnyOrder("Asha Rao", "Ben Ito")))
			.andExpect(jsonPath("$.totalItems").value(2));
	}

	@Test
	void filtersByJobTitle() throws Exception {
		insertThreeTeams();

		list(get("/api/v1/employees").param("jobTitle", "QA Engineer")).andExpect(status().isOk())
			.andExpect(jsonPath("$.items[*].fullName").value(containsInAnyOrder("Ben Ito")))
			.andExpect(jsonPath("$.totalItems").value(1));
	}

	@Test
	void filtersAndSearchCombineWithAnd() throws Exception {
		insertThreeTeams();

		list(get("/api/v1/employees").param("country", "IN").param("department", "Engineering"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.items[*].fullName").value(containsInAnyOrder("Asha Rao")))
			.andExpect(jsonPath("$.totalItems").value(1));
		list(get("/api/v1/employees").param("country", "IN").param("q", "wu")).andExpect(status().isOk())
			.andExpect(jsonPath("$.items[*].fullName").value(containsInAnyOrder("Chen Wu")))
			.andExpect(jsonPath("$.totalItems").value(1));
	}

	@Test
	void validCombinationMatchingNobodyIsEmpty() throws Exception {
		insertThreeTeams();

		list(get("/api/v1/employees").param("department", "Sales").param("jobTitle", "Recruiter"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.items", hasSize(0)))
			.andExpect(jsonPath("$.totalItems").value(0));
	}

	@Test
	void rejectsUnsupportedOrLowercaseCountry() throws Exception {
		list(get("/api/v1/employees").param("country", "JP")).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
			.andExpect(jsonPath("$.errors", hasSize(1)))
			.andExpect(jsonPath("$.errors[0].field").value("country"))
			.andExpect(jsonPath("$.errors[0].message").value("must be a supported country"));
		list(get("/api/v1/employees").param("country", "in")).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
			.andExpect(jsonPath("$.errors", hasSize(1)))
			.andExpect(jsonPath("$.errors[0].field").value("country"))
			.andExpect(jsonPath("$.errors[0].message").value("must be two uppercase letters"));
	}

	@Test
	void rejectsUnknownDepartmentOrJobTitle() throws Exception {
		list(get("/api/v1/employees").param("department", "Legal")).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors", hasSize(1)))
			.andExpect(jsonPath("$.errors[0].field").value("department"))
			.andExpect(jsonPath("$.errors[0].message").value("must be a supported department"));
		list(get("/api/v1/employees").param("jobTitle", "Astronaut")).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors", hasSize(1)))
			.andExpect(jsonPath("$.errors[0].field").value("jobTitle"))
			.andExpect(jsonPath("$.errors[0].message").value("must be a supported job title"));
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
		return insert(fullName, email, "IN", "Engineering", "Software Engineer");
	}

	private long insert(String fullName, String email, String country, String department, String jobTitle) {
		return jdbc.sql("""
				insert into employee (id, full_name, email, job_title, department, country_code, salary, hire_date)
				values (nextval('employee_id_seq'), :name, :email, :jobTitle, :department, :country,
				        :salary, :hireDate)
				returning id
				""")
			.param("name", fullName)
			.param("email", email)
			.param("jobTitle", jobTitle)
			.param("department", department)
			.param("country", country)
			.param("salary", new BigDecimal("1000000.00"))
			.param("hireDate", LocalDate.of(2021, 4, 12))
			.query(Long.class)
			.single();
	}

	/** Asha (IN, Engineering, Software Engineer), Ben (DE, Engineering, QA Engineer), Chen (IN, Sales, Sales Manager). */
	private void insertThreeTeams() {
		insert("Asha Rao", "asha@acme.com", "IN", "Engineering", "Software Engineer");
		insert("Ben Ito", "ben@acme.com", "DE", "Engineering", "QA Engineer");
		insert("Chen Wu", "chen@acme.com", "IN", "Sales", "Sales Manager");
	}

}
