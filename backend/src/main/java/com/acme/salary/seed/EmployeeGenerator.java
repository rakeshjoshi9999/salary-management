package com.acme.salary.seed;

import java.util.List;

import org.springframework.stereotype.Component;

/** Generates the seed employees from a fixed random seed (ADR-049). Stub. */
@Component
class EmployeeGenerator {

	static final long DEFAULT_SEED = 20261026L;

	List<SeedEmployee> generate(long seed) {
		throw new UnsupportedOperationException("not implemented");
	}

}
