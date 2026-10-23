package com.acme.salary;

import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The deployed frontend and the API live on different origins, so the browser will
 * only read a response the API explicitly permits. The allowed origin comes from an
 * environment variable because Vercel gives every preview deployment a generated
 * hostname - see ADR-003.
 *
 * These exercise the actuator surface, which is what the health page in task 1.10
 * calls. The MVC surface has no endpoint yet; its first controller slice test in
 * phase 3 covers it.
 */
class CorsIntegrationTest extends AbstractIntegrationTest {

	private static final String UNKNOWN_ORIGIN = "https://not-our-frontend.example.test";

	@Autowired
	private MockMvcTester mockMvc;

	@Test
	void allowsTheConfiguredOrigin() {
		assertThat(mockMvc.get().uri("/actuator/health").header("Origin", ALLOWED_ORIGIN))
				.hasStatusOk()
				.hasHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
	}

	@Test
	void doesNotAllowAnUnknownOrigin() {
		assertThat(mockMvc.get().uri("/actuator/health").header("Origin", UNKNOWN_ORIGIN))
				.doesNotContainHeader("Access-Control-Allow-Origin");
	}

	@Test
	void answersPreflightForTheConfiguredOrigin() {
		assertThat(mockMvc.options().uri("/actuator/health")
				.header("Origin", ALLOWED_ORIGIN)
				.header("Access-Control-Request-Method", "GET"))
				.hasStatusOk()
				.hasHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
	}

}
