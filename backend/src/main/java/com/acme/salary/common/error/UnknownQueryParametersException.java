package com.acme.salary.common.error;

import java.util.List;

/** The request named query parameters the endpoint does not take: 400 VALIDATION_FAILED (ADR-044). */
public class UnknownQueryParametersException extends RuntimeException {

	private final List<String> names;

	public UnknownQueryParametersException(List<String> names) {
		super("Unknown query parameters");
		this.names = List.copyOf(names);
	}

	List<String> names() {
		return names;
	}

}
