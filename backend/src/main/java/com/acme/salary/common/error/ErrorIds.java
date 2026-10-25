package com.acme.salary.common.error;

/** Makes the id that ties a 500 response to its log line (ADR-043). A bean, so tests can fix it. */
@FunctionalInterface
public interface ErrorIds {

	String next();

}
