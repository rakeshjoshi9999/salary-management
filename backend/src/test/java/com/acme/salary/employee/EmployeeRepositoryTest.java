package com.acme.salary.employee;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;

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

	@Test
	void emailCheckExcludesTheEmployeeItself() {
		Employee asha = repository.saveAndFlush(employeeWithEmail("Asha.Rao@acme.com"));
		Employee ben = repository.saveAndFlush(employeeWithEmail("ben.ito@acme.com"));

		assertThat(repository.existsActiveByEmailExcludingId("asha.rao@ACME.com", asha.getId())).isFalse();
		assertThat(repository.existsActiveByEmailExcludingId("asha.rao@ACME.com", ben.getId())).isTrue();
	}

	@Test
	void softDeleteSetsDeletedAtAndBumpsVersion() {
		Employee saved = repository.saveAndFlush(employeeWithEmail("asha.rao@acme.com"));
		Instant now = Instant.parse("2026-10-25T12:00:00Z");

		int deleted = repository.softDeleteActive(saved.getId(), now);

		assertThat(deleted).isEqualTo(1);
		assertThat(rowOf(saved.getId())).isEqualTo(new DeletionState(now, 1L));
	}

	@Test
	void softDeleteIgnoresAlreadyDeletedRow() {
		Employee saved = repository.saveAndFlush(employeeWithEmail("asha.rao@acme.com"));
		Instant first = Instant.parse("2026-10-25T12:00:00Z");
		repository.softDeleteActive(saved.getId(), first);

		int deleted = repository.softDeleteActive(saved.getId(), Instant.parse("2026-10-26T12:00:00Z"));

		assertThat(deleted).isZero();
		assertThat(rowOf(saved.getId())).isEqualTo(new DeletionState(first, 1L));
	}

	private DeletionState rowOf(long id) {
		return jdbc.sql("select deleted_at, version from employee where id = :id")
			.param("id", id)
			.query((rs, rowNum) -> {
				OffsetDateTime deletedAt = rs.getObject("deleted_at", OffsetDateTime.class);
				return new DeletionState(deletedAt == null ? null : deletedAt.toInstant(), rs.getLong("version"));
			})
			.single();
	}

	/** {@code deletedAt} is null while the row is active. */
	private record DeletionState(Instant deletedAt, long version) {
	}

	private static Employee employeeWithEmail(String email) {
		return new Employee("Asha Rao", email, "Software Engineer", "Engineering", "IN", new BigDecimal("2400000.00"),
				LocalDate.of(2021, 4, 12));
	}

}
