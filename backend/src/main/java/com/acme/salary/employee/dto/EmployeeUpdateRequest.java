package com.acme.salary.employee.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record EmployeeUpdateRequest(String fullName, String email, String jobTitle, String department,
		String countryCode, BigDecimal salary, LocalDate hireDate, Long version) {
}
