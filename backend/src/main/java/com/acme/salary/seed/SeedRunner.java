package com.acme.salary.seed;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/** Runs the seed when the {@code seed} profile is active (ADR-049). Stub. */
@Component
@Profile("seed")
class SeedRunner implements CommandLineRunner {

	SeedRunner(EmployeeGenerator generator, EmployeeSeeder seeder) {
	}

	@Override
	public void run(String... args) {
	}

}
