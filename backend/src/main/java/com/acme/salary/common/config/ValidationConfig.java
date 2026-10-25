package com.acme.salary.common.config;

import java.time.Clock;

import org.springframework.boot.validation.autoconfigure.ValidationConfigurationCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Bean Validation reads "today" from the Clock bean, so {@code @PastOrPresent} uses the same clock as
 * the rest of the app and tests can fix the date (ADR-010, ADR-037).
 */
@Configuration
public class ValidationConfig {

	@Bean
	ValidationConfigurationCustomizer clockFromBean(Clock clock) {
		return configuration -> configuration.clockProvider(() -> clock);
	}

}
