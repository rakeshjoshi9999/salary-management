package com.acme.salary.employee;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import com.acme.salary.employee.dto.EmployeeResponse;
import com.acme.salary.reference.TestReferenceData;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
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

}
