package com.acme.salary.employee;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.acme.salary.employee.dto.EmployeeCreateRequest;
import com.acme.salary.employee.dto.EmployeeResponse;
import com.acme.salary.reference.ReferenceService;

@Service
public class EmployeeService {

	private final EmployeeRepository employees;

	private final ReferenceService reference;

	EmployeeService(EmployeeRepository employees, ReferenceService reference) {
		this.employees = employees;
		this.reference = reference;
	}

	/** Expects a validated request, so its country is supported and has a currency. */
	@Transactional
	public EmployeeResponse create(EmployeeCreateRequest request) {
		Employee employee = employees.save(new Employee(request.fullName(), request.email(), request.jobTitle(),
				request.department(), request.countryCode(), request.salary(), request.hireDate()));
		return toResponse(employee);
	}

	static boolean isDuplicateEmail(DataIntegrityViolationException ex) {
		return false;
	}

	private EmployeeResponse toResponse(Employee employee) {
		String currency = reference.currencyOf(employee.getCountryCode())
			.orElseThrow(() -> new IllegalStateException("No currency for country " + employee.getCountryCode()));
		return new EmployeeResponse(employee.getId(), employee.getFullName(), employee.getEmail(),
				employee.getJobTitle(), employee.getDepartment(), employee.getCountryCode(), currency,
				employee.getSalary(), employee.getHireDate(), employee.getVersion());
	}

}
