package com.acme.salary.employee;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "employee")
class Employee {

	@Id
	private Long id;

	Long getId() {
		return id;
	}

	String getFullName() {
		return null;
	}

	String getEmail() {
		return null;
	}

	String getJobTitle() {
		return null;
	}

	String getDepartment() {
		return null;
	}

	String getCountryCode() {
		return null;
	}

	BigDecimal getSalary() {
		return null;
	}

	LocalDate getHireDate() {
		return null;
	}

	Instant getDeletedAt() {
		return null;
	}

}
