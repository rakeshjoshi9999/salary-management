package com.acme.salary.reference;

import java.util.List;

/**
 * A {@link ReferenceService} holding exactly the rows V2 seeds, for tests that should not need a
 * database. ReferenceDataTest pins the real rows, so a change to V2 shows up there first.
 */
public final class TestReferenceData {

	private TestReferenceData() {
	}

	public static ReferenceService v2() {
		List<Country> countries = List.of(new Country("US", "United States", "USD"),
				new Country("GB", "United Kingdom", "GBP"), new Country("IN", "India", "INR"),
				new Country("DE", "Germany", "EUR"), new Country("FR", "France", "EUR"));
		List<String> departments = List.of("Engineering", "Sales", "Marketing", "Finance", "Human Resources",
				"Operations");
		List<JobTitle> titles = List.of(new JobTitle("Software Engineer", "Engineering"),
				new JobTitle("Senior Software Engineer", "Engineering"), new JobTitle("QA Engineer", "Engineering"),
				new JobTitle("Engineering Manager", "Engineering"), new JobTitle("Sales Representative", "Sales"),
				new JobTitle("Account Executive", "Sales"), new JobTitle("Sales Manager", "Sales"),
				new JobTitle("Marketing Specialist", "Marketing"), new JobTitle("Content Strategist", "Marketing"),
				new JobTitle("Marketing Manager", "Marketing"), new JobTitle("Accountant", "Finance"),
				new JobTitle("Financial Analyst", "Finance"), new JobTitle("Finance Manager", "Finance"),
				new JobTitle("HR Generalist", "Human Resources"), new JobTitle("Recruiter", "Human Resources"),
				new JobTitle("HR Manager", "Human Resources"), new JobTitle("Operations Analyst", "Operations"),
				new JobTitle("Operations Manager", "Operations"));
		return new ReferenceService(countries, departments, titles);
	}

}
