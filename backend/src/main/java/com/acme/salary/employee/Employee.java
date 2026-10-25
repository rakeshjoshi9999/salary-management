package com.acme.salary.employee;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** One row of {@code employee} (DATA_MODEL.md). Never leaves the service layer. */
@Entity
@Table(name = "employee")
class Employee {

	/** allocationSize must equal the sequence's INCREMENT BY 50 (ADR-009); Hibernate checks it at startup. */
	@Id
	@GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "employee_id")
	@SequenceGenerator(name = "employee_id", sequenceName = "employee_id_seq", allocationSize = 50)
	private Long id;

	@Column(name = "full_name", nullable = false, length = 200)
	private String fullName;

	@Column(nullable = false, length = 254)
	private String email;

	@Column(name = "job_title", nullable = false, length = 100)
	private String jobTitle;

	@Column(nullable = false, length = 100)
	private String department;

	@JdbcTypeCode(SqlTypes.CHAR)
	@Column(name = "country_code", nullable = false, length = 2)
	private String countryCode;

	@Column(nullable = false, precision = 14, scale = 2)
	private BigDecimal salary;

	@Column(name = "hire_date", nullable = false)
	private LocalDate hireDate;

	@Version
	@Column(nullable = false)
	private Long version;

	@Column(name = "deleted_at")
	private Instant deletedAt;

	protected Employee() {
	}

	Employee(String fullName, String email, String jobTitle, String department, String countryCode,
			BigDecimal salary, LocalDate hireDate) {
		this.fullName = fullName;
		this.email = email;
		this.jobTitle = jobTitle;
		this.department = department;
		this.countryCode = countryCode;
		this.salary = salary;
		this.hireDate = hireDate;
	}

	Long getId() {
		return id;
	}

	String getFullName() {
		return fullName;
	}

	String getEmail() {
		return email;
	}

	String getJobTitle() {
		return jobTitle;
	}

	String getDepartment() {
		return department;
	}

	String getCountryCode() {
		return countryCode;
	}

	BigDecimal getSalary() {
		return salary;
	}

	LocalDate getHireDate() {
		return hireDate;
	}

	Long getVersion() {
		return version;
	}

	Instant getDeletedAt() {
		return deletedAt;
	}

}
