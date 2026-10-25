package com.acme.salary.employee;

import java.math.BigDecimal;
import java.time.LocalDate;

import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;

import com.acme.salary.AbstractIntegrationTest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

/** The duplicate-email pre-check and backstop against real Postgres (ADR-038). Every test rolls back. */
@Transactional
class EmployeeRepositoryTest extends AbstractIntegrationTest {

	@Autowired
	private EmployeeRepository repository;

	@Autowired
	private JdbcClient jdbc;

	@Test
	void findsActiveEmailIgnoringCase() {
		repository.saveAndFlush(employeeWithEmail("Asha.Rao@Acme.com"));

		assertThat(repository.existsActiveByEmail("asha.rao@acme.com")).isTrue();
		assertThat(repository.existsActiveByEmail("ASHA.RAO@acme.com")).isTrue();
	}

	@Test
	void ignoresEmailOfSoftDeletedEmployee() {
		repository.saveAndFlush(employeeWithEmail("asha.rao@acme.com"));
		jdbc.sql("update employee set deleted_at = now() where email = 'asha.rao@acme.com'").update();

		assertThat(repository.existsActiveByEmail("asha.rao@acme.com")).isFalse();
	}

	@Test
	void recognisesRealUniqueIndexViolation() {
		repository.saveAndFlush(employeeWithEmail("asha.rao@acme.com"));

		DataIntegrityViolationException violation = catchThrowableOfType(DataIntegrityViolationException.class,
				() -> repository.saveAndFlush(employeeWithEmail("ASHA.RAO@acme.com")));

		assertThat(violation).isNotNull();
		assertThat(EmployeeService.isDuplicateEmail(violation)).isTrue();
	}

	@Test
	void findsActiveEmployeeById() {
		Employee saved = repository.saveAndFlush(employeeWithEmail("asha.rao@acme.com"));

		assertThat(repository.findActiveById(saved.getId())).get()
			.extracting(Employee::getEmail)
			.isEqualTo("asha.rao@acme.com");
	}

	@Test
	void doesNotFindSoftDeletedEmployeeById() {
		Employee saved = repository.saveAndFlush(employeeWithEmail("asha.rao@acme.com"));
		jdbc.sql("update employee set deleted_at = now() where id = :id").param("id", saved.getId()).update();

		assertThat(repository.findActiveById(saved.getId())).isEmpty();
	}

	private static Employee employeeWithEmail(String email) {
		return new Employee("Asha Rao", email, "Software Engineer", "Engineering", "IN", new BigDecimal("2400000.00"),
				LocalDate.of(2021, 4, 12));
	}

}
