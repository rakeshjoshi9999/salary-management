package com.acme.salary.settings;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.ErrorResponseException;

import com.acme.salary.AbstractIntegrationTest;
import com.acme.salary.settings.dto.SettingsUpdateRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * GET and PUT /api/v1/settings against Postgres (ADR-028, ADR-047), with the same optimistic locking as
 * employees (ADR-023). The single row is put back to IN at version 0 after each test.
 */
class SettingsIntegrationTest extends AbstractIntegrationTest {

	@Autowired
	private MockMvc mvc;

	@Autowired
	private JdbcClient jdbc;

	@Autowired
	private SettingsService service;

	@Autowired
	private PlatformTransactionManager transactions;

	@AfterEach
	void restoreDefault() {
		jdbc.sql("update app_settings set default_country_code = 'IN', version = 0").update();
	}

	@Test
	void getReturnsSettings() throws Exception {
		mvc.perform(get("/api/v1/settings"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.defaultCountryCode").value("IN"))
			.andExpect(jsonPath("$.version").value(0));
	}

	@Test
	void putChangesDefaultCountryAndBumpsVersion() throws Exception {
		save("{\"defaultCountryCode\": \"DE\", \"version\": 0}").andExpect(status().isOk())
			.andExpect(jsonPath("$.defaultCountryCode").value("DE"))
			.andExpect(jsonPath("$.version").value(1));

		mvc.perform(get("/api/v1/settings"))
			.andExpect(jsonPath("$.defaultCountryCode").value("DE"))
			.andExpect(jsonPath("$.version").value(1));
	}

	@Test
	void putWithSameCountryKeepsVersion() throws Exception {
		save("{\"defaultCountryCode\": \"IN\", \"version\": 0}").andExpect(status().isOk())
			.andExpect(jsonPath("$.defaultCountryCode").value("IN"))
			.andExpect(jsonPath("$.version").value(0));
	}

	@Test
	void staleSettingsPutIs409() throws Exception {
		save("{\"defaultCountryCode\": \"DE\", \"version\": 0}").andExpect(status().isOk());

		save("{\"defaultCountryCode\": \"FR\", \"version\": 0}").andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("STALE_VERSION"))
			.andExpect(jsonPath("$.type").value("/problems/stale-version"))
			.andExpect(jsonPath("$.title").value("Settings were changed by someone else"))
			.andExpect(jsonPath("$.currentVersion").value(1));
		assertThat(jdbc.sql("select default_country_code from app_settings").query(String.class).single())
			.isEqualTo("DE");
	}

	/**
	 * As for employees (3.5): loaded in an open transaction, another commits version 5, then the save.
	 * This reaches the {@code @Version} path only because {@code get()} loads the JPA entity through the
	 * repository in the caller's transaction, so {@code update()} finds that stale managed copy and its
	 * explicit compare passes; a {@code get()} reading through JdbcClient would make this test check the
	 * explicit compare instead.
	 */
	@Test
	void concurrentSettingsCommitIs409WithTrueVersion() {
		TransactionTemplate outer = new TransactionTemplate(transactions);
		TransactionTemplate other = new TransactionTemplate(transactions);
		other.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);

		Throwable thrown = outer.execute(status -> {
			service.get();
			other.executeWithoutResult(
					s -> jdbc.sql("update app_settings set default_country_code = 'FR', version = 5").update());
			Throwable caught = catchThrowable(() -> service.update(new SettingsUpdateRequest("DE", 0L)));
			status.setRollbackOnly();
			return caught;
		});

		assertThat(thrown).isInstanceOf(ErrorResponseException.class);
		ProblemDetail problem = ((ErrorResponseException) thrown).getBody();
		assertThat(problem.getStatus()).isEqualTo(409);
		assertThat(problem.getProperties()).containsEntry("code", "STALE_VERSION").containsEntry("currentVersion", 5L);
	}

	@ParameterizedTest
	@ValueSource(strings = { "JP", "in" })
	void unsupportedOrLowercaseCountryIs400(String country) throws Exception {
		save("{\"defaultCountryCode\": \"" + country + "\", \"version\": 0}").andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
			.andExpect(jsonPath("$.errors[0].field").value("defaultCountryCode"));
	}

	@ParameterizedTest
	@ValueSource(strings = { "{\"defaultCountryCode\": \"DE\", \"version\": 0, \"theme\": \"dark\"}",
			"{\"defaultCountryCode\": \"DE\"}" })
	void rejectsUnknownFieldOrMissingVersion(String body) throws Exception {
		save(body).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
			.andExpect(jsonPath("$.errors[0].field").value(body.contains("theme") ? "theme" : "version"));
	}

	private ResultActions save(String body) throws Exception {
		return mvc.perform(put("/api/v1/settings").contentType(MediaType.APPLICATION_JSON).content(body));
	}

}
