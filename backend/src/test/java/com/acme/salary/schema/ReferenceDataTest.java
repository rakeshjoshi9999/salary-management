package com.acme.salary.schema;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.simple.JdbcClient;

import com.acme.salary.AbstractIntegrationTest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

/** The supported countries, departments and titles that V2 seeds (ADR-008, `DATA_MODEL.md`). */
class ReferenceDataTest extends AbstractIntegrationTest {

	@Autowired
	private JdbcClient jdbc;

	@Test
	void seedsSupportedCountriesWithCurrencies() {
		List<Map<String, Object>> countries = jdbc.sql("select code, name, currency_code from country")
				.query()
				.listOfRows();

		assertThat(countries)
				.extracting(row -> row.get("code"), row -> row.get("name"), row -> row.get("currency_code"))
				.containsExactlyInAnyOrder(
						tuple("US", "United States", "USD"),
						tuple("GB", "United Kingdom", "GBP"),
						tuple("IN", "India", "INR"),
						tuple("DE", "Germany", "EUR"),
						tuple("FR", "France", "EUR"));
	}

	@Test
	void seedsDepartments() {
		List<String> departments = jdbc.sql("select name from department").query(String.class).list();

		assertThat(departments).containsExactlyInAnyOrder(
				"Engineering", "Sales", "Marketing", "Finance", "Human Resources", "Operations");
	}

	@Test
	void seedsJobTitlesInTheirDepartments() {
		List<Map<String, Object>> titles = jdbc.sql("select name, department from job_title").query().listOfRows();

		assertThat(titles)
				.extracting(row -> row.get("name"), row -> row.get("department"))
				.containsExactlyInAnyOrder(
						tuple("Software Engineer", "Engineering"),
						tuple("Senior Software Engineer", "Engineering"),
						tuple("QA Engineer", "Engineering"),
						tuple("Engineering Manager", "Engineering"),
						tuple("Sales Representative", "Sales"),
						tuple("Account Executive", "Sales"),
						tuple("Sales Manager", "Sales"),
						tuple("Marketing Specialist", "Marketing"),
						tuple("Content Strategist", "Marketing"),
						tuple("Marketing Manager", "Marketing"),
						tuple("Accountant", "Finance"),
						tuple("Financial Analyst", "Finance"),
						tuple("Finance Manager", "Finance"),
						tuple("HR Generalist", "Human Resources"),
						tuple("Recruiter", "Human Resources"),
						tuple("HR Manager", "Human Resources"),
						tuple("Operations Analyst", "Operations"),
						tuple("Operations Manager", "Operations"));
	}

}
