package com.acme.salary.employee.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import com.acme.salary.employee.validation.KnownDepartment;
import com.acme.salary.employee.validation.KnownJobTitle;
import com.acme.salary.employee.validation.SupportedCountry;

/**
 * The query string of GET /api/v1/employees (ADR-016, ADR-044), bound by name and validated like a
 * request body. Missing values take the contract's defaults; {@code q} is trimmed, and blank means no
 * search. Each filter value must exist in the reference data (ADR-016).
 */
public record EmployeeListQuery(
		@Min(0) Integer page,
		@Min(1) @Max(100) Integer size,
		String sort,
		@Size(min = 2, message = "must be at least 2 characters")
		@Size(max = 254, message = "must be at most 254 characters") String q,
		@Pattern(regexp = SupportedCountry.FORMAT, message = "must be two uppercase letters")
		@SupportedCountry String country,
		@KnownDepartment String department,
		@KnownJobTitle String jobTitle) {

	public static final int DEFAULT_SIZE = 20;

	public static final String DEFAULT_SORT = "fullName,asc";

	public EmployeeListQuery {
		page = page == null ? 0 : page;
		size = size == null ? DEFAULT_SIZE : size;
		sort = sort == null ? DEFAULT_SORT : sort;
		q = q == null || q.isBlank() ? null : q.strip();
	}

}
