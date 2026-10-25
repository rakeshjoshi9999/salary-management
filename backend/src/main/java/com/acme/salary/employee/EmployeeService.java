package com.acme.salary.employee;

import org.hibernate.exception.ConstraintViolationException;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.acme.salary.employee.dto.EmployeeCreateRequest;
import com.acme.salary.employee.dto.EmployeeResponse;
import com.acme.salary.reference.ReferenceService;

@Service
public class EmployeeService {

	private static final String ACTIVE_EMAIL_UNIQUE = "employee_email_active_uq";

	private final EmployeeRepository employees;

	private final ReferenceService reference;

	EmployeeService(EmployeeRepository employees, ReferenceService reference) {
		this.employees = employees;
		this.reference = reference;
	}

	/**
	 * Expects a validated request, so its country is supported and has a currency. The pre-check gives
	 * the usual 409; the flush makes the insert happen here, so a create racing another with the same
	 * email gets the same 409 from the unique index instead of a failure at commit (ADR-038).
	 */
	@Transactional
	public EmployeeResponse create(EmployeeCreateRequest request) {
		if (employees.existsActiveByEmail(request.email())) {
			throw new DuplicateEmailException(request.email());
		}
		Employee employee = employees.save(new Employee(request.fullName(), request.email(), request.jobTitle(),
				request.department(), request.countryCode(), request.salary(), request.hireDate()));
		try {
			employees.flush();
		}
		catch (DataIntegrityViolationException ex) {
			if (isDuplicateEmail(ex)) {
				throw new DuplicateEmailException(request.email());
			}
			throw ex;
		}
		return toResponse(employee);
	}

	/** True only for a violation of the active-email unique index, named in V1 (ADR-036). */
	static boolean isDuplicateEmail(DataIntegrityViolationException ex) {
		for (Throwable cause = ex; cause != null; cause = cause.getCause()) {
			if (cause instanceof ConstraintViolationException violation
					&& ACTIVE_EMAIL_UNIQUE.equals(violation.getConstraintName())) {
				return true;
			}
		}
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
