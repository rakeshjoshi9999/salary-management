package com.acme.salary.employee;

import java.math.BigDecimal;
import java.net.URI;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.Optional;

import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ProblemDetail;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.test.util.ReflectionTestUtils;

import com.acme.salary.employee.dto.EmployeeResponse;
import com.acme.salary.employee.dto.EmployeeUpdateRequest;
import com.acme.salary.reference.TestReferenceData;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** The create path in the service, with the repository mocked and the V2 reference rows in memory. */
class EmployeeServiceTest {

	private final EmployeeRepository repository = mock(EmployeeRepository.class);

	private final EmployeeService service = new EmployeeService(repository, TestReferenceData.v2());

	@Test
	void createDerivesCurrencyFromCountry() {
		when(repository.save(any(Employee.class))).thenAnswer(call -> call.getArgument(0));

		EmployeeResponse created = service.create(Requests.valid().with("countryCode", "DE").build());

		assertThat(created.countryCode()).isEqualTo("DE");
		assertThat(created.currency()).isEqualTo("EUR");
	}

	@Test
	void createSavesActiveEmployee() {
		when(repository.save(any(Employee.class))).thenAnswer(call -> call.getArgument(0));
		ArgumentCaptor<Employee> saved = ArgumentCaptor.forClass(Employee.class);

		service.create(Requests.valid().build());

		verify(repository).save(saved.capture());
		Employee employee = saved.getValue();
		assertThat(employee.getFullName()).isEqualTo("Asha Rao");
		assertThat(employee.getEmail()).isEqualTo("asha.rao@acme.com");
		assertThat(employee.getJobTitle()).isEqualTo("Software Engineer");
		assertThat(employee.getDepartment()).isEqualTo("Engineering");
		assertThat(employee.getCountryCode()).isEqualTo("IN");
		assertThat(employee.getSalary()).isEqualByComparingTo("2400000.00");
		assertThat(employee.getHireDate()).isEqualTo("2021-04-12");
		assertThat(employee.getDeletedAt()).isNull();
	}

	@Test
	void createRejectsEmailOfActiveEmployee() {
		when(repository.existsActiveByEmail("asha.rao@acme.com")).thenReturn(true);

		Throwable thrown = catchThrowable(() -> service.create(Requests.valid().build()));

		assertThat(thrown).isInstanceOf(DuplicateEmailException.class);
		verify(repository, never()).save(any());
	}

	@Test
	void duplicateEmailExceptionCarriesProblem() {
		ProblemDetail problem = new DuplicateEmailException("asha.rao@acme.com").getBody();

		assertThat(problem.getStatus()).isEqualTo(409);
		assertThat(problem.getType()).isEqualTo(URI.create("/problems/duplicate-email"));
		assertThat(problem.getTitle()).isEqualTo("Email already in use");
		assertThat(problem.getDetail()).isEqualTo("Another employee already uses asha.rao@acme.com.");
		assertThat(problem.getProperties()).containsEntry("code", "DUPLICATE_EMAIL");
	}

	@Test
	void createTranslatesUniqueIndexViolationToDuplicateEmail() {
		when(repository.save(any(Employee.class))).thenAnswer(call -> call.getArgument(0));
		doThrow(violationOf("employee_email_active_uq", "23505")).when(repository).flush();

		Throwable thrown = catchThrowable(() -> service.create(Requests.valid().build()));

		assertThat(thrown).isInstanceOf(DuplicateEmailException.class);
	}

	@Test
	void createRethrowsOtherIntegrityViolations() {
		DataIntegrityViolationException other = violationOf("employee_country_fk", "23503");
		when(repository.save(any(Employee.class))).thenAnswer(call -> call.getArgument(0));
		doThrow(other).when(repository).flush();

		Throwable thrown = catchThrowable(() -> service.create(Requests.valid().build()));

		assertThat(thrown).isSameAs(other);
	}

	@Test
	void getReturnsActiveEmployee() {
		Employee stored = new Employee("Asha Rao", "asha.rao@acme.com", "Software Engineer", "Engineering", "DE",
				new BigDecimal("2400000.00"), LocalDate.of(2021, 4, 12));
		ReflectionTestUtils.setField(stored, "id", 42L);
		ReflectionTestUtils.setField(stored, "version", 3L);
		when(repository.findActiveById(42L)).thenReturn(Optional.of(stored));

		EmployeeResponse found = service.get(42L);

		assertThat(found.id()).isEqualTo(42L);
		assertThat(found.fullName()).isEqualTo("Asha Rao");
		assertThat(found.email()).isEqualTo("asha.rao@acme.com");
		assertThat(found.jobTitle()).isEqualTo("Software Engineer");
		assertThat(found.department()).isEqualTo("Engineering");
		assertThat(found.hireDate()).isEqualTo("2021-04-12");
		assertThat(found.countryCode()).isEqualTo("DE");
		assertThat(found.currency()).isEqualTo("EUR");
		assertThat(found.salary()).isEqualByComparingTo("2400000.00");
		assertThat(found.version()).isEqualTo(3L);
	}

	@Test
	void getThrowsNotFoundForMissingId() {
		when(repository.findActiveById(42L)).thenReturn(Optional.empty());

		Throwable thrown = catchThrowable(() -> service.get(42L));

		assertThat(thrown).isInstanceOf(EmployeeNotFoundException.class);
		assertThat(((EmployeeNotFoundException) thrown).getBody().getDetail()).isEqualTo("No employee with id 42.");
	}

	@Test
	void employeeNotFoundExceptionCarriesProblem() {
		ProblemDetail problem = new EmployeeNotFoundException(42L).getBody();

		assertThat(problem.getStatus()).isEqualTo(404);
		assertThat(problem.getType()).isEqualTo(URI.create("/problems/employee-not-found"));
		assertThat(problem.getTitle()).isEqualTo("Employee not found");
		assertThat(problem.getDetail()).isEqualTo("No employee with id 42.");
		assertThat(problem.getProperties()).containsEntry("code", "EMPLOYEE_NOT_FOUND");
	}

	@Test
	void updateReplacesAllFields() {
		Employee stored = storedEmployee(42L, 3L);
		when(repository.findActiveById(42L)).thenReturn(Optional.of(stored));
		EmployeeUpdateRequest request = new EmployeeUpdateRequest("Asha R. Menon", "asha.menon@acme.com", "Recruiter",
				"Human Resources", "DE", new BigDecimal("75000.00"), LocalDate.of(2022, 1, 3), 3L);

		EmployeeResponse updated = service.update(42L, request);

		assertThat(stored.getFullName()).isEqualTo("Asha R. Menon");
		assertThat(stored.getEmail()).isEqualTo("asha.menon@acme.com");
		assertThat(stored.getJobTitle()).isEqualTo("Recruiter");
		assertThat(stored.getDepartment()).isEqualTo("Human Resources");
		assertThat(stored.getCountryCode()).isEqualTo("DE");
		assertThat(stored.getSalary()).isEqualByComparingTo("75000.00");
		assertThat(stored.getHireDate()).isEqualTo("2022-01-03");
		assertThat(updated.currency()).isEqualTo("EUR");
		assertThat(updated.fullName()).isEqualTo("Asha R. Menon");
	}

	@Test
	void updateRejectsStaleVersion() {
		Employee stored = storedEmployee(42L, 4L);
		when(repository.findActiveById(42L)).thenReturn(Optional.of(stored));

		Throwable thrown = catchThrowable(
				() -> service.update(42L, Requests.valid().with("salary", new BigDecimal("1.00")).buildUpdate(3L)));

		assertThat(thrown).isInstanceOf(StaleVersionException.class);
		assertThat(((StaleVersionException) thrown).currentVersion()).isEqualTo(4L);
		assertThat(stored.getSalary()).isEqualByComparingTo("2400000.00");
		verify(repository, never()).flush();
	}

	@Test
	void staleVersionExceptionCarriesProblem() {
		ProblemDetail problem = new StaleVersionException(3L, 4L).getBody();

		assertThat(problem.getStatus()).isEqualTo(409);
		assertThat(problem.getType()).isEqualTo(URI.create("/problems/stale-version"));
		assertThat(problem.getTitle()).isEqualTo("Employee was changed by someone else");
		assertThat(problem.getDetail())
			.isEqualTo("You sent version 3, but the current version is 4. Reload and try again.");
		assertThat(problem.getProperties()).containsEntry("code", "STALE_VERSION").containsEntry("currentVersion", 4L);
	}

	@Test
	void updateThrowsNotFoundForMissingId() {
		when(repository.findActiveById(42L)).thenReturn(Optional.empty());

		Throwable thrown = catchThrowable(() -> service.update(42L, Requests.valid().buildUpdate(0L)));

		assertThat(thrown).isInstanceOf(EmployeeNotFoundException.class);
	}

	@Test
	void updateRejectsEmailOfAnotherActiveEmployee() {
		when(repository.findActiveById(42L)).thenReturn(Optional.of(storedEmployee(42L, 3L)));
		when(repository.existsActiveByEmailExcludingId("taken@acme.com", 42L)).thenReturn(true);

		Throwable thrown = catchThrowable(
				() -> service.update(42L, Requests.valid().with("email", "taken@acme.com").buildUpdate(3L)));

		assertThat(thrown).isInstanceOf(DuplicateEmailException.class);
		verify(repository, never()).flush();
	}

	@Test
	void updateChecksVersionBeforeEmail() {
		when(repository.findActiveById(42L)).thenReturn(Optional.of(storedEmployee(42L, 4L)));
		when(repository.existsActiveByEmailExcludingId("taken@acme.com", 42L)).thenReturn(true);

		Throwable thrown = catchThrowable(
				() -> service.update(42L, Requests.valid().with("email", "taken@acme.com").buildUpdate(3L)));

		assertThat(thrown).isInstanceOf(StaleVersionException.class);
	}

	@Test
	void updateTranslatesUniqueIndexViolationToDuplicateEmail() {
		when(repository.findActiveById(42L)).thenReturn(Optional.of(storedEmployee(42L, 3L)));
		doThrow(violationOf("employee_email_active_uq", "23505")).when(repository).flush();

		Throwable thrown = catchThrowable(() -> service.update(42L, Requests.valid().buildUpdate(3L)));

		assertThat(thrown).isInstanceOf(DuplicateEmailException.class);
	}

	@Test
	void lostRaceReportsTrueCurrentVersion() {
		when(repository.findActiveById(42L)).thenReturn(Optional.of(storedEmployee(42L, 3L)));
		doThrow(new ObjectOptimisticLockingFailureException(Employee.class, 42L)).when(repository).flush();
		when(repository.findActiveVersionById(42L)).thenReturn(Optional.of(7L));

		Throwable thrown = catchThrowable(
				() -> service.update(42L, Requests.valid().with("salary", new BigDecimal("1.00")).buildUpdate(3L)));

		assertThat(thrown).isInstanceOf(StaleVersionException.class);
		assertThat(((StaleVersionException) thrown).currentVersion()).isEqualTo(7L);
	}

	@Test
	void lostRaceToDeleteGives404() {
		when(repository.findActiveById(42L)).thenReturn(Optional.of(storedEmployee(42L, 3L)));
		doThrow(new ObjectOptimisticLockingFailureException(Employee.class, 42L)).when(repository).flush();
		when(repository.findActiveVersionById(42L)).thenReturn(Optional.empty());

		Throwable thrown = catchThrowable(
				() -> service.update(42L, Requests.valid().with("salary", new BigDecimal("1.00")).buildUpdate(3L)));

		assertThat(thrown).isInstanceOf(EmployeeNotFoundException.class);
	}

	/** The baseline employee as if loaded from the database, with the given id and version. */
	private static Employee storedEmployee(long id, long version) {
		Employee stored = new Employee("Asha Rao", "asha.rao@acme.com", "Software Engineer", "Engineering", "IN",
				new BigDecimal("2400000.00"), LocalDate.of(2021, 4, 12));
		ReflectionTestUtils.setField(stored, "id", id);
		ReflectionTestUtils.setField(stored, "version", version);
		return stored;
	}

	/** The shape Spring and Hibernate give a Postgres constraint violation (checked for real in EmployeeRepositoryTest). */
	private static DataIntegrityViolationException violationOf(String constraint, String sqlState) {
		return new DataIntegrityViolationException("could not execute statement",
				new ConstraintViolationException("violation", new SQLException("violation", sqlState), constraint));
	}

}
