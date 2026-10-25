package com.acme.salary.employee;

import java.time.Clock;

import org.hibernate.exception.ConstraintViolationException;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.acme.salary.employee.dto.EmployeeCreateRequest;
import com.acme.salary.employee.dto.EmployeeResponse;
import com.acme.salary.employee.dto.EmployeeUpdateRequest;
import com.acme.salary.reference.ReferenceService;

@Service
public class EmployeeService {

	private static final String ACTIVE_EMAIL_UNIQUE = "employee_email_active_uq";

	private final EmployeeRepository employees;

	private final ReferenceService reference;

	private final Clock clock;

	EmployeeService(EmployeeRepository employees, ReferenceService reference, Clock clock) {
		this.employees = employees;
		this.reference = reference;
		this.clock = clock;
	}

	public void delete(long id) {
		throw new UnsupportedOperationException("not implemented yet");
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

	@Transactional(readOnly = true)
	public EmployeeResponse get(long id) {
		return employees.findActiveById(id).map(this::toResponse).orElseThrow(() -> new EmployeeNotFoundException(id));
	}

	/**
	 * Checks run in the order 404, stale version, duplicate email (ADR-041). The version is compared
	 * explicitly because Hibernate would only compare against what it just loaded (ADR-023); the flush
	 * makes {@code @Version} catch a commit that lands between this load and this write.
	 */
	@Transactional
	public EmployeeResponse update(long id, EmployeeUpdateRequest request) {
		Employee employee = employees.findActiveById(id).orElseThrow(() -> new EmployeeNotFoundException(id));
		if (employee.getVersion().longValue() != request.version().longValue()) {
			throw new StaleVersionException(request.version(), employee.getVersion());
		}
		if (employees.existsActiveByEmailExcludingId(request.email(), id)) {
			throw new DuplicateEmailException(request.email());
		}
		employee.replace(request.fullName(), request.email(), request.jobTitle(), request.department(),
				request.countryCode(), request.salary(), request.hireDate());
		try {
			employees.flush();
		}
		catch (OptimisticLockingFailureException ex) {
			long current = employees.findActiveVersionById(id).orElseThrow(() -> new EmployeeNotFoundException(id));
			throw new StaleVersionException(request.version(), current);
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
