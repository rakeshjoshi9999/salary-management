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
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
public abstract class AbstractIntegrationTest {

}
