package com.acme.salary.reference;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.acme.salary.AbstractIntegrationTest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** GET /api/v1/reference, the dropdown data, from the rows V2 seeds (ADR-017). */
class ReferenceEndpointTest extends AbstractIntegrationTest {

	@Autowired
	private MockMvc mvc;

	@Test
	void listsCountriesByNameWithCurrency() throws Exception {
		List<String> countries = new ArrayList<>();
		body().get("countries")
			.forEach(c -> countries.add(c.get("code").asString() + " " + c.get("name").asString() + " "
					+ c.get("currency").asString()));

		assertThat(countries).containsExactly("FR France EUR", "DE Germany EUR", "IN India INR",
				"GB United Kingdom GBP", "US United States USD");
	}

	@Test
	void nestsTitlesUnderDepartmentsSorted() throws Exception {
		List<String> departments = new ArrayList<>();
		List<List<String>> titles = new ArrayList<>();
		body().get("departments").forEach(d -> {
			departments.add(d.get("name").asString());
			List<String> names = new ArrayList<>();
			d.get("jobTitles").forEach(t -> names.add(t.asString()));
			titles.add(names);
		});

		assertThat(departments).containsExactly("Engineering", "Finance", "Human Resources", "Marketing",
				"Operations", "Sales");
		assertThat(titles).containsExactly(
				List.of("Engineering Manager", "QA Engineer", "Senior Software Engineer", "Software Engineer"),
				List.of("Accountant", "Finance Manager", "Financial Analyst"),
				List.of("HR Generalist", "HR Manager", "Recruiter"),
				List.of("Content Strategist", "Marketing Manager", "Marketing Specialist"),
				List.of("Operations Analyst", "Operations Manager"),
				List.of("Account Executive", "Sales Manager", "Sales Representative"));
		assertThat(titles.stream().mapToInt(List::size).sum()).isEqualTo(18);
	}

	@Test
	void isCacheableForAnHour() throws Exception {
		MvcResult result = mvc.perform(get("/api/v1/reference")).andExpect(status().isOk()).andReturn();

		assertThat(result.getResponse().getHeader("Cache-Control")).contains("public").contains("max-age=3600");
	}

	private JsonNode body() throws Exception {
		String body = mvc.perform(get("/api/v1/reference"))
			.andExpect(status().isOk())
			.andReturn()
			.getResponse()
			.getContentAsString();
		return JsonMapper.builder().build().readTree(body);
	}

}
