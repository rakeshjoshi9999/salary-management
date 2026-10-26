package com.acme.salary.seed;

import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;

import com.acme.salary.AbstractIntegrationTest;

import static org.assertj.core.api.Assertions.assertThat;

/** A normal start, like every other test, must never seed (ADR-049). */
class SeedProfileTest extends AbstractIntegrationTest {

	@Autowired
	private ApplicationContext context;

	@Test
	void seedRunnerIsNotLoadedWithoutSeedProfile() {
		assertThat(context.getBeanProvider(SeedRunner.class).getIfAvailable()).isNull();
	}

}
