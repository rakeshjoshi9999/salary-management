package com.acme.salary.employee.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/** The {@code Employee} schema in openapi.yaml. */
public record EmployeeResponse(Long id, String fullName, String email, String jobTitle, String department,
		String countryCode, String currency, BigDecimal salary, LocalDate hireDate, Long version) {
}
