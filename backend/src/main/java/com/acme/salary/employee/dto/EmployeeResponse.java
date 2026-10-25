package com.acme.salary.employee.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.acme.salary.common.money.MoneyRounding;

/** The {@code Employee} schema in openapi.yaml. Salary always carries 2 decimals. */
public record EmployeeResponse(Long id, String fullName, String email, String jobTitle, String department,
		String countryCode, String currency, BigDecimal salary, LocalDate hireDate, Long version) {

	public EmployeeResponse {
		salary = MoneyRounding.toMoney(salary);
	}

}
