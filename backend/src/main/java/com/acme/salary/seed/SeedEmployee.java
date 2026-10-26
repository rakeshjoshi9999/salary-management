package com.acme.salary.seed;

import java.math.BigDecimal;
import java.time.LocalDate;

/** One generated employee, ready to insert. Its id comes from the database sequence on insert. */
record SeedEmployee(String fullName, String email, String jobTitle, String department, String countryCode,
		BigDecimal salary, LocalDate hireDate) {
}
