package com.acme.salary.reference.dto;

import java.util.List;

/** The {@code ReferenceData} schema in openapi.yaml: everything the dropdowns need, in one call (ADR-017). */
public record ReferenceData(List<CountryItem> countries, List<DepartmentItem> departments) {

	public record CountryItem(String code, String name, String currency) {
	}

	public record DepartmentItem(String name, List<String> jobTitles) {
	}

}
