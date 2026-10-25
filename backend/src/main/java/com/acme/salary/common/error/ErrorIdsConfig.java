package com.acme.salary.common.error;

import java.util.UUID;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** The real error ids: random UUIDs, so two 500s never share one (ADR-043). Tests define their own. */
@Configuration
class ErrorIdsConfig {

	@Bean
	ErrorIds errorIds() {
		return () -> UUID.randomUUID().toString();
	}

}
