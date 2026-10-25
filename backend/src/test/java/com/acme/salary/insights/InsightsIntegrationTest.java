package com.acme.salary.insights;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.acme.salary.AbstractIntegrationTest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * GET /api/v1/insights/countries/{code} against Postgres, on small hand-calculated fixtures (ADR-017,
 * ADR-021, ADR-047). Each test inserts only the rows it reasons about and removes them afterwards.
 *
 * Money is read as an exact BigDecimal from {@code $.salary}, never matched as a substring of the body,
 * and compared with {@code isEqualTo} on purpose: the scale must be 2 as well as the value right.
 */
class InsightsIntegrationTest extends AbstractIntegrationTest {

	private static final AtomicInteger EMAILS = new AtomicInteger();

	private static final JsonMapper JSON = JsonMapper.builder()
		.enable(DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS)
		.build();

	@Autowired
	private MockMvc mvc;

	@Autowired
	private JdbcClient jdbc;

	@AfterEach
	void removeEmployees() {
		jdbc.sql("delete from employee").update();
	}

	@Test
	void statsForOddHeadcount() throws Exception {
		employees("IN", "100.00", "250.00", "300.00");

		JsonNode salary = salary("IN");

		assertThat(salary.get("headcount").asInt()).isEqualTo(3);
		assertThat(money(salary, "min")).isEqualTo(new BigDecimal("100.00"));
		assertThat(money(salary, "max")).isEqualTo(new BigDecimal("300.00"));
		assertThat(money(salary, "average")).isEqualTo(new BigDecimal("216.67"));
		assertThat(money(salary, "median")).isEqualTo(new BigDecimal("250.00"));
	}

	@Test
	void medianOfEvenHeadcountIsMeanOfMiddleTwo() throws Exception {
		employees("IN", "100.00", "200.00", "300.00", "1000.00");

		JsonNode salary = salary("IN");

		assertThat(money(salary, "median")).isEqualTo(new BigDecimal("250.00"));
		assertThat(money(salary, "average")).isEqualTo(new BigDecimal("400.00"));
	}

	/**
	 * IN is an exact .005 tie: HALF_EVEN gives 100.00, while HALF_UP and Postgres round() give 100.01.
	 * DE (100.015) rules out truncation and HALF_DOWN.
	 */
	@Test
	void averageAndMedianRoundHalfEven() throws Exception {
		employees("IN", "100.00", "100.01");
		employees("DE", "100.01", "100.02");

		JsonNode india = salary("IN");
		JsonNode germany = salary("DE");

		assertThat(money(india, "average")).isEqualTo(new BigDecimal("100.00"));
		assertThat(money(india, "median")).isEqualTo(new BigDecimal("100.00"));
		assertThat(money(germany, "average")).isEqualTo(new BigDecimal("100.02"));
		assertThat(money(germany, "median")).isEqualTo(new BigDecimal("100.02"));
	}

	/**
	 * The exact median is 99999999999.105, a tie that HALF_EVEN takes to .10. A double mean is
	 * 99999999999.10501, which becomes .11 under every rounding mode, and HALF_UP on the exact value also
	 * gives .11: only exact numeric arithmetic with HALF_EVEN passes.
	 */
	@Test
	void medianIsExact() throws Exception {
		employees("IN", "99999999999.10", "99999999999.11");

		assertThat(money(salary("IN"), "median")).isEqualTo(new BigDecimal("99999999999.10"));
	}

	@Test
	void statsCountOnlyTheCountry() throws Exception {
		employees("IN", "100.00", "200.00");
		employees("DE", "900.00");

		JsonNode salary = salary("IN");

		assertThat(salary.get("headcount").asInt()).isEqualTo(2);
		assertThat(money(salary, "max")).isEqualTo(new BigDecimal("200.00"));
	}

	@Test
	void statsExcludeSoftDeleted() throws Exception {
		employees("IN", "100.00", "200.00");
		long deleted = employee("IN", "Software Engineer", "Engineering", "900.00");
		jdbc.sql("update employee set deleted_at = now() where id = :id").param("id", deleted).update();

		JsonNode salary = salary("IN");

		assertThat(salary.get("headcount").asInt()).isEqualTo(2);
		assertThat(money(salary, "max")).isEqualTo(new BigDecimal("200.00"));
	}

	@Test
	void responseCarriesCountryAndCurrency() throws Exception {
		employees("IN", "100.00");

		insights("IN").andExpect(status().isOk())
			.andExpect(jsonPath("$.countryCode").value("IN"))
			.andExpect(jsonPath("$.currency").value("INR"));
	}

	/** avg() and the median come back from Postgres with many decimals; the response must carry two. */
	@Test
	void moneyIsWrittenWithTwoDecimals() throws Exception {
		employees("IN", "100", "300");

		JsonNode salary = salary("IN");

		assertThat(money(salary, "min")).isEqualTo(new BigDecimal("100.00"));
		assertThat(money(salary, "max")).isEqualTo(new BigDecimal("300.00"));
		assertThat(money(salary, "average")).isEqualTo(new BigDecimal("200.00"));
		assertThat(money(salary, "median")).isEqualTo(new BigDecimal("200.00"));
	}

	@ParameterizedTest
	@ValueSource(strings = { "JP", "in" })
	void unsupportedOrLowercaseCountryIs404(String code) throws Exception {
		insights(code).andExpect(status().isNotFound())
			.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
			.andExpect(jsonPath("$.code").value("COUNTRY_NOT_FOUND"))
			.andExpect(jsonPath("$.type").value("/problems/country-not-found"))
			.andExpect(jsonPath("$.title").value("Country not supported"))
			.andExpect(jsonPath("$.detail").value("Country " + code + " is not supported."));
	}

	@Test
	void averagesByTitleWithinCountry() throws Exception {
		employee("IN", "Software Engineer", "Engineering", "100.00");
		employee("IN", "Software Engineer", "Engineering", "300.00");
		employee("IN", "Recruiter", "Human Resources", "150.00");
		employee("DE", "Recruiter", "Human Resources", "9000.00");

		// The higher average sorts later by title and has the larger headcount, so ordering by either fails.
		assertThat(titleAverages("IN")).containsExactly(
				new Title("Software Engineer", "Engineering", 2, new BigDecimal("200.00")),
				new Title("Recruiter", "Human Resources", 1, new BigDecimal("150.00")));
	}

	@Test
	void onlyTitlesWithEmployeesAppear() throws Exception {
		employee("IN", "Accountant", "Finance", "100.00");

		assertThat(titleAverages("IN")).extracting(Title::jobTitle).containsExactly("Accountant");
	}

	@Test
	void equalAveragesSortByTitle() throws Exception {
		employee("IN", "Software Engineer", "Engineering", "100.00");
		employee("IN", "Software Engineer", "Engineering", "300.00");
		employee("IN", "Accountant", "Finance", "200.00");
		employee("IN", "Content Strategist", "Marketing", "200.00");

		assertThat(titleAverages("IN")).extracting(Title::jobTitle)
			.containsExactly("Accountant", "Content Strategist", "Software Engineer");
	}

	/**
	 * 100.005 is a tie: HALF_EVEN gives 100.00, HALF_UP and Postgres round() give 100.01. 100.015 gives
	 * 100.02 under HALF_EVEN, while truncation or HALF_DOWN give 100.01.
	 */
	@Test
	void titleAverageRoundsHalfEven() throws Exception {
		employee("IN", "Software Engineer", "Engineering", "100.00");
		employee("IN", "Software Engineer", "Engineering", "100.01");
		employee("DE", "Software Engineer", "Engineering", "100.01");
		employee("DE", "Software Engineer", "Engineering", "100.02");

		assertThat(titleAverages("IN")).extracting(Title::average).containsExactly(new BigDecimal("100.00"));
		assertThat(titleAverages("DE")).extracting(Title::average).containsExactly(new BigDecimal("100.02"));
	}

	/**
	 * Software Engineer averages 200.004 and Accountant 200.001: both show 200.00, so the title decides.
	 * Sorting on the unrounded average would put Software Engineer first.
	 */
	@Test
	void averagesEqualAfterRoundingSortByTitle() throws Exception {
		for (int i = 0; i < 4; i++) {
			employee("IN", "Software Engineer", "Engineering", "200.00");
		}
		employee("IN", "Software Engineer", "Engineering", "200.02");
		for (int i = 0; i < 9; i++) {
			employee("IN", "Accountant", "Finance", "200.00");
		}
		employee("IN", "Accountant", "Finance", "200.01");

		assertThat(titleAverages("IN")).containsExactly(
				new Title("Accountant", "Finance", 10, new BigDecimal("200.00")),
				new Title("Software Engineer", "Engineering", 5, new BigDecimal("200.00")));
	}

	@Test
	void titleAveragesExcludeSoftDeleted() throws Exception {
		employee("IN", "Software Engineer", "Engineering", "100.00");
		long deleted = employee("IN", "Software Engineer", "Engineering", "900.00");
		jdbc.sql("update employee set deleted_at = now() where id = :id").param("id", deleted).update();

		assertThat(titleAverages("IN"))
			.containsExactly(new Title("Software Engineer", "Engineering", 1, new BigDecimal("100.00")));
	}

	private List<Title> titleAverages(String code) throws Exception {
		List<Title> titles = new ArrayList<>();
		body(code).get("averageByJobTitle")
			.forEach(t -> titles.add(new Title(t.get("jobTitle").asString(), t.get("department").asString(),
					t.get("headcount").asInt(), t.get("average").decimalValue())));
		return titles;
	}

	/** One entry of {@code averageByJobTitle}; {@code average} is compared with its scale. */
	private record Title(String jobTitle, String department, int headcount, BigDecimal average) {
	}

	private JsonNode body(String code) throws Exception {
		String body = insights(code).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
		return JSON.readTree(body);
	}

	private ResultActions insights(String code) throws Exception {
		return mvc.perform(get("/api/v1/insights/countries/" + code));
	}

	/** The {@code salary} object of a successful insights response. */
	private JsonNode salary(String code) throws Exception {
		String body = insights(code).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
		return JSON.readTree(body).get("salary");
	}

	private static BigDecimal money(JsonNode stats, String field) {
		return stats.get(field).decimalValue();
	}

	/** Software Engineers in Engineering, one per salary. */
	private void employees(String country, String... salaries) {
		for (String salary : salaries) {
			employee(country, "Software Engineer", "Engineering", salary);
		}
	}

	private long employee(String country, String jobTitle, String department, String salary) {
		return jdbc.sql("""
				insert into employee (id, full_name, email, job_title, department, country_code, salary, hire_date)
				values (nextval('employee_id_seq'), 'Fixture', :email, :jobTitle, :department, :country, :salary,
				        :hireDate)
				returning id
				""")
			.param("email", "fixture" + EMAILS.incrementAndGet() + "@acme.com")
			.param("jobTitle", jobTitle)
			.param("department", department)
			.param("country", country)
			.param("salary", new BigDecimal(salary))
			.param("hireDate", LocalDate.of(2021, 4, 12))
			.query(Long.class)
			.single();
	}

}
