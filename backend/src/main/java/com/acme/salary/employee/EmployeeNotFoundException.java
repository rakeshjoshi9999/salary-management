package com.acme.salary.employee;

import java.net.URI;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.ErrorResponseException;

/** No active employee has this id, including one that was soft-deleted: 404 EMPLOYEE_NOT_FOUND (ADR-039). */
class EmployeeNotFoundException extends ErrorResponseException {

	EmployeeNotFoundException(long id) {
		super(HttpStatus.NOT_FOUND, problem(id), null);
	}

	private static ProblemDetail problem(long id) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, "No employee with id " + id + ".");
		problem.setType(URI.create("/problems/employee-not-found"));
		problem.setTitle("Employee not found");
		problem.setProperty("code", "EMPLOYEE_NOT_FOUND");
		return problem;
	}

}
