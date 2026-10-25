package com.acme.salary.employee;

import java.net.URI;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.ErrorResponseException;

/** Another active employee already has this email, ignoring case: 409 DUPLICATE_EMAIL (ADR-038). */
class DuplicateEmailException extends ErrorResponseException {

	DuplicateEmailException(String email) {
		super(HttpStatus.CONFLICT, problem(email), null);
	}

	private static ProblemDetail problem(String email) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT,
				"Another employee already uses " + email + ".");
		problem.setType(URI.create("/problems/duplicate-email"));
		problem.setTitle("Email already in use");
		problem.setProperty("code", "DUPLICATE_EMAIL");
		return problem;
	}

}
