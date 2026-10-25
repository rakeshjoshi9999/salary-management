package com.acme.salary.employee;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * The list query (ADR-044), a Spring Data fragment of {@link EmployeeRepository} implemented with plain
 * SQL in {@link EmployeeSearchImpl}.
 */
interface EmployeeSearch {

	/** One page of the active employees matching the criteria, in list order. */
	List<EmployeeRow> findPage(Criteria criteria, int limit, long offset);

	/** How many active employees match the same criteria. */
	long countMatching(Criteria criteria);

	/** What to match: {@code q} is trimmed text or null for no search. */
	record Criteria(String q) {
	}

	/** One listed employee, as read; the service adds the currency and makes it a response. */
	record EmployeeRow(long id, String fullName, String email, String jobTitle, String department,
			String countryCode, BigDecimal salary, LocalDate hireDate, long version) {
	}

}
