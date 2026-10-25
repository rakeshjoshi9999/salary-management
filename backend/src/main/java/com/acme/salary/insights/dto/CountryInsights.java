package com.acme.salary.insights.dto;

import java.util.List;

/** The {@code CountryInsights} schema in openapi.yaml: one call fills the dashboard (ADR-017). */
public record CountryInsights(String countryCode, String currency, SalaryStats salary,
		List<TitleAverage> averageByJobTitle, List<DepartmentHeadcount> headcountByDepartment) {
}
