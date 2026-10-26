package com.acme.salary.seed;

import java.time.Duration;
import java.util.List;

import org.springframework.stereotype.Component;

/** Inserts seed employees and vacuums the table (ADR-049). Stub. */
@Component
class EmployeeSeeder {

	SeedResult seed(List<SeedEmployee> employees) {
		throw new UnsupportedOperationException("not implemented");
	}

	Duration vacuumAnalyze() {
		throw new UnsupportedOperationException("not implemented");
	}

}
