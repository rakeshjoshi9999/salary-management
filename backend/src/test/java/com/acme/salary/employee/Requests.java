package com.acme.salary.employee;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.acme.salary.employee.dto.EmployeeCreateRequest;

/** A valid create request, changed one field at a time by each test. */
final class Requests {

	private String fullName = "Asha Rao";

	private String email = "asha.rao@acme.com";

	private String jobTitle = "Software Engineer";

	private String department = "Engineering";

	private String countryCode = "IN";

	private BigDecimal salary = new BigDecimal("2400000.00");

	private LocalDate hireDate = LocalDate.of(2021, 4, 12);

	static Requests valid() {
		return new Requests();
	}

	/** Sets one field by its JSON name, so a parameterized test can name the field it breaks. */
	Requests with(String field, Object value) {
		switch (field) {
			case "fullName" -> fullName = (String) value;
			case "email" -> email = (String) value;
			case "jobTitle" -> jobTitle = (String) value;
			case "department" -> department = (String) value;
			case "countryCode" -> countryCode = (String) value;
			case "salary" -> salary = (BigDecimal) value;
			case "hireDate" -> hireDate = (LocalDate) value;
			default -> throw new IllegalArgumentException("unknown field " + field);
		}
		return this;
	}

	EmployeeCreateRequest build() {
		return new EmployeeCreateRequest(fullName, email, jobTitle, department, countryCode, salary, hireDate);
	}

}
