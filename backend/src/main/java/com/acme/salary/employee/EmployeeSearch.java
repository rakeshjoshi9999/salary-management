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

	/**
	 * What to match and how to order it; a null value means "no condition", and filters combine with
	 * AND (ADR-016). {@code sortField} is one of the contract's names, checked before it gets here.
	 */
	record Criteria(String q, String country, String department, String jobTitle, String sortField,
			boolean descending) {
	}

	/** One listed employee, as read; the service adds the currency and makes it a response. */
	record EmployeeRow(long id, String fullName, String email, String jobTitle, String department,
			String countryCode, BigDecimal salary, LocalDate hireDate, long version) {
	}

}
