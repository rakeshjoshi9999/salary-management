package com.acme.salary;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;

/**
 * Base for tests that need the whole application and a real database.
 *
 * Testcontainers starts one Postgres per test run; Spring's context cache keeps
 * every subclass sharing that container and context rather than paying for a new one.
 * MockMvc rather than a real port: it needs no servlet container and no HTTP client.
 *
 * The allowed origin is pinned here rather than per test class on purpose: adding
 * properties to a subclass would give it a different context cache key, and a second
 * context means a second Postgres container for the same run.
 */
@SpringBootTest(properties = "cors.allowed-origins=" + AbstractIntegrationTest.ALLOWED_ORIGIN)
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
public abstract class AbstractIntegrationTest {

	/** The only origin these tests treat as the deployed frontend. */
	static final String ALLOWED_ORIGIN = "https://app.example.test";

}
