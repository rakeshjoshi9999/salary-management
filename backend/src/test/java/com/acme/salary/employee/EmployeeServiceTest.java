package com.acme.salary.employee;

import java.net.URI;
import java.sql.SQLException;

import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ProblemDetail;

import com.acme.salary.employee.dto.EmployeeResponse;
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

	/** The shape Spring and Hibernate give a Postgres constraint violation (checked for real in EmployeeRepositoryTest). */
	private static DataIntegrityViolationException violationOf(String constraint, String sqlState) {
		return new DataIntegrityViolationException("could not execute statement",
				new ConstraintViolationException("violation", new SQLException("violation", sqlState), constraint));
	}

}
