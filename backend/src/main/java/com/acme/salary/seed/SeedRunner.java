package com.acme.salary.seed;

import java.time.Duration;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Runs the seed when the {@code seed} profile is active, and only then (ADR-049). That profile also turns
 * the web server off, so the application exits when this finishes:
 * {@code ./mvnw spring-boot:run -Dspring-boot.run.profiles=seed}.
 */
@Component
@Profile("seed")
class SeedRunner implements CommandLineRunner {

	private static final Logger log = LoggerFactory.getLogger(SeedRunner.class);

	private final EmployeeGenerator generator;

	private final EmployeeSeeder seeder;

	SeedRunner(EmployeeGenerator generator, EmployeeSeeder seeder) {
		this.generator = generator;
		this.seeder = seeder;
	}

	@Override
	public void run(String... args) {
		long start = System.nanoTime();
		List<SeedEmployee> employees = generator.generate(EmployeeGenerator.DEFAULT_SEED);
		Duration generate = Duration.ofNanos(System.nanoTime() - start);
		SeedResult result = seeder.seed(employees);
		Duration vacuum = seeder.vacuumAnalyze();
		log.info("Seed finished: {} inserted, {} already present. Generate {} ms, insert {} ms, vacuum analyze {} ms,"
				+ " total {} ms", result.inserted(), result.skipped(), generate.toMillis(),
				result.insertTime().toMillis(), vacuum.toMillis(),
				generate.plus(result.insertTime()).plus(vacuum).toMillis());
	}

}
