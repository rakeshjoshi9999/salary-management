package com.acme.salary.insights;

import java.net.URI;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.ErrorResponseException;

/** The country is not supported, or not written in uppercase: 404 COUNTRY_NOT_FOUND (ADR-017). */
class CountryNotFoundException extends ErrorResponseException {

	CountryNotFoundException(String countryCode) {
		super(HttpStatus.NOT_FOUND, problem(countryCode), null);
	}

	private static ProblemDetail problem(String countryCode) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND,
				"Country " + countryCode + " is not supported.");
		problem.setType(URI.create("/problems/country-not-found"));
		problem.setTitle("Country not supported");
		problem.setProperty("code", "COUNTRY_NOT_FOUND");
		return problem;
	}

}
