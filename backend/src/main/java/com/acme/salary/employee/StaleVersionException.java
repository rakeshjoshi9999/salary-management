package com.acme.salary.employee;

import java.net.URI;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.ErrorResponseException;

/**
 * The client's version is not the stored one: 409 STALE_VERSION, carrying {@code currentVersion} so the
 * client knows it must reload (ADR-018, ADR-023, ADR-041).
 */
class StaleVersionException extends ErrorResponseException {

	private final long currentVersion;

	StaleVersionException(long sentVersion, long currentVersion) {
		super(HttpStatus.CONFLICT, problem(sentVersion, currentVersion), null);
		this.currentVersion = currentVersion;
	}

	long currentVersion() {
		return currentVersion;
	}

	private static ProblemDetail problem(long sentVersion, long currentVersion) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, "You sent version " + sentVersion
				+ ", but the current version is " + currentVersion + ". Reload and try again.");
		problem.setType(URI.create("/problems/stale-version"));
		problem.setTitle("Employee was changed by someone else");
		problem.setProperty("code", "STALE_VERSION");
		problem.setProperty("currentVersion", currentVersion);
		return problem;
	}

}
