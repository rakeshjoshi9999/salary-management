package com.acme.salary.common.error;

/**
 * A query parameter that Bean Validation cannot judge on its own, such as one sent twice: 400
 * VALIDATION_FAILED naming it (ADR-044).
 */
public class InvalidQueryParameterException extends RuntimeException {

	private final String name;

	public InvalidQueryParameterException(String name, String message) {
		super(message);
		this.name = name;
	}

	String name() {
		return name;
	}

}
