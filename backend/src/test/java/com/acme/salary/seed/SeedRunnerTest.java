package com.acme.salary.seed;

import java.time.Duration;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** The runner only orders the work: generate, seed in one transaction, then vacuum outside it (6.3). */
class SeedRunnerTest {

	@Test
	void runnerSeedsThenVacuums() {
		EmployeeGenerator generator = mock(EmployeeGenerator.class);
		EmployeeSeeder seeder = mock(EmployeeSeeder.class);
		List<SeedEmployee> employees = List.of();
		when(generator.generate(EmployeeGenerator.DEFAULT_SEED)).thenReturn(employees);
		when(seeder.seed(employees)).thenReturn(new SeedResult(0, 0, Duration.ZERO));
		when(seeder.vacuumAnalyze()).thenReturn(Duration.ZERO);

		new SeedRunner(generator, seeder).run();

		InOrder order = inOrder(generator, seeder);
		order.verify(generator).generate(EmployeeGenerator.DEFAULT_SEED);
		order.verify(seeder).seed(employees);
		order.verify(seeder).vacuumAnalyze();
	}

}
