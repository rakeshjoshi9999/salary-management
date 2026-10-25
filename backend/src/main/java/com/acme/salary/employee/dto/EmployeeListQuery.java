package com.acme.salary.employee.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/**
 * The query string of GET /api/v1/employees (ADR-016, ADR-044), bound by name and validated like a
 * request body. Missing values take the contract's defaults.
 */
public record EmployeeListQuery(
		@Min(0) Integer page,
		@Min(1) @Max(100) Integer size,
		String sort,
		String q,
		String country,
		String department,
		String jobTitle) {

	public static final int DEFAULT_SIZE = 20;

	public static final String DEFAULT_SORT = "fullName,asc";

	public EmployeeListQuery {
		page = page == null ? 0 : page;
		size = size == null ? DEFAULT_SIZE : size;
		sort = sort == null ? DEFAULT_SORT : sort;
	}

}
