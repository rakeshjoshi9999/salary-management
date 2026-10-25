package com.acme.salary.settings;

import java.net.URI;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.ErrorResponseException;

/** The client's settings version is not the stored one: 409 STALE_VERSION with currentVersion (ADR-028). */
class StaleSettingsException extends ErrorResponseException {

	StaleSettingsException(long sentVersion, long currentVersion) {
		super(HttpStatus.CONFLICT, problem(sentVersion, currentVersion), null);
	}

	private static ProblemDetail problem(long sentVersion, long currentVersion) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, "You sent version " + sentVersion
				+ ", but the current version is " + currentVersion + ". Reload and try again.");
		problem.setType(URI.create("/problems/stale-version"));
		problem.setTitle("Settings were changed by someone else");
		problem.setProperty("code", "STALE_VERSION");
		problem.setProperty("currentVersion", currentVersion);
		return problem;
	}

}
