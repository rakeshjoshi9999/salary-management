package com.acme.salary.common.config;

import java.time.Clock;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** "Now" for the whole application, in UTC (ADR-010). Tests replace this bean with a fixed clock. */
@Configuration
public class ClockConfig {

	@Bean
	Clock clock() {
		return Clock.systemUTC();
	}

}
