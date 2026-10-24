package com.acme.salary.schema;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.postgresql.util.PSQLException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;

import com.acme.salary.AbstractIntegrationTest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

/**
 * What the database itself accepts and rejects (ADR-010, ADR-036). Each test starts from one valid
 * employee and changes a single column. Every test rolls back.
 */
@Transactional
class EmployeeConstraintsTest extends AbstractIntegrationTest {

	private static final String INSERT_EMPLOYEE = """
			insert into employee (id, full_name, email, job_title, department, country_code, salary, hire_date)
			values (nextval('employee_id_seq'), :full_name, :email, :job_title, :department, :country_code,
			        :salary, :hire_date)
			""";

	@Autowired
	private JdbcClient jdbc;

	@Test
	void acceptsValidEmployee() {
		insertEmployee(validEmployee());

		Map<String, Object> row = jdbc.sql("select version, deleted_at from employee where email = :email")
				.param("email", "ada@example.com")
				.query()
				.singleRow();
		assertThat(row.get("version")).isEqualTo(0L);
		assertThat(row.get("deleted_at")).isNull();
	}

	@ParameterizedTest
	@ValueSource(strings = { "full_name", "email", "job_title", "department", "country_code", "salary",
			"hire_date" })
	void rejectsMissingRequiredField(String column) {
		Map<String, Object> employee = validEmployee();
		employee.put(column, null);

		PSQLException error = rootCause(() -> insertEmployee(employee));

		assertThat(error.getSQLState()).as("not-null violation").isEqualTo("23502");
		assertThat(error.getServerErrorMessage().getColumn()).isEqualTo(column);
	}

	@Test
	void rejectsSalaryOfZero() {
		Map<String, Object> employee = validEmployee();
		employee.put("salary", BigDecimal.ZERO);

		assertThat(violatedConstraint(employee)).isEqualTo("employee_salary_positive_ck");
	}

	@Test
	void rejectsNegativeSalary() {
		Map<String, Object> employee = validEmployee();
		employee.put("salary", new BigDecimal("-0.01"));

		assertThat(violatedConstraint(employee)).isEqualTo("employee_salary_positive_ck");
	}

	@Test
	void rejectsHireDateBefore1950() {
		Map<String, Object> employee = validEmployee();
		employee.put("hire_date", LocalDate.of(1949, 12, 31));

		assertThat(violatedConstraint(employee)).isEqualTo("employee_hire_date_min_ck");
	}

	@Test
	void acceptsHireDateOnFirstOf1950() {
		Map<String, Object> employee = validEmployee();
		employee.put("hire_date", LocalDate.of(1950, 1, 1));

		insertEmployee(employee);

		assertThat(countByEmail("ada@example.com")).isEqualTo(1);
	}

	@Test
	void rejectsUnsupportedCountry() {
		Map<String, Object> employee = validEmployee();
		employee.put("country_code", "JP");

		assertThat(violatedConstraint(employee)).isEqualTo("employee_country_fk");
	}

	@Test
	void rejectsTitleFromAnotherDepartment() {
		Map<String, Object> employee = validEmployee();
		employee.put("job_title", "Recruiter");

		assertThat(violatedConstraint(employee)).isEqualTo("employee_title_in_department_fk");
	}

	@Test
	void rejectsUnknownJobTitle() {
		Map<String, Object> employee = validEmployee();
		employee.put("job_title", "Astronaut");

		assertThat(violatedConstraint(employee)).isEqualTo("employee_title_in_department_fk");
	}

	@Test
	void rejectsDuplicateEmailIgnoringCase() {
		insertEmployee(validEmployee());
		Map<String, Object> duplicate = validEmployee();
		duplicate.put("email", "ADA@Example.COM");

		assertThat(violatedConstraint(duplicate)).isEqualTo("employee_email_active_uq");
	}

	@Test
	void allowsEmailOfSoftDeletedEmployee() {
		insertEmployee(validEmployee());
		jdbc.sql("update employee set deleted_at = now() where email = :email")
				.param("email", "ada@example.com")
				.update();

		insertEmployee(validEmployee());

		assertThat(countByEmail("ada@example.com")).isEqualTo(2);
	}

	@Test
	void rejectsJobTitleInUnknownDepartment() {
		PSQLException error = rootCause(() -> jdbc
				.sql("insert into job_title (name, department) values ('Astronaut', 'Space')")
				.update());

		assertThat(error.getServerErrorMessage().getConstraint()).isEqualTo("job_title_department_fk");
	}

	private static Map<String, Object> validEmployee() {
		Map<String, Object> employee = new HashMap<>();
		employee.put("full_name", "Ada Lovelace");
		employee.put("email", "ada@example.com");
		employee.put("job_title", "Software Engineer");
		employee.put("department", "Engineering");
		employee.put("country_code", "GB");
		employee.put("salary", new BigDecimal("85000.00"));
		employee.put("hire_date", LocalDate.of(2020, 3, 15));
		return employee;
	}

	private void insertEmployee(Map<String, Object> employee) {
		jdbc.sql(INSERT_EMPLOYEE).params(employee).update();
	}

	private int countByEmail(String email) {
		return jdbc.sql("select count(*) from employee where email = :email")
				.param("email", email)
				.query(Integer.class)
				.single();
	}

	private String violatedConstraint(Map<String, Object> employee) {
		return rootCause(() -> insertEmployee(employee)).getServerErrorMessage().getConstraint();
	}

	/** Runs a write that must break a database rule, and returns the driver's error for it. */
	private static PSQLException rootCause(Runnable write) {
		DataIntegrityViolationException error = catchThrowableOfType(DataIntegrityViolationException.class,
				write::run);
		assertThat(error).as("the write must violate a database rule").isNotNull();
		assertThat(error.getMostSpecificCause()).isInstanceOf(PSQLException.class);
		return (PSQLException) error.getMostSpecificCause();
	}

}
