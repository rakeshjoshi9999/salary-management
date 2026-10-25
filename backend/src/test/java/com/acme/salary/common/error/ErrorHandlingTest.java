package com.acme.salary.common.error;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.function.Consumer;
import java.util.stream.Stream;

import org.junit.jupiter.api.Named;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestComponent;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.RequestBuilder;
import org.springframework.web.bind.ServletRequestBindingException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.acme.salary.common.config.JacksonConfig;
import com.acme.salary.common.config.ValidationConfig;
import com.acme.salary.employee.EmployeeService;
import com.acme.salary.employee.dto.EmployeeResponse;
import com.acme.salary.insights.InsightsService;
import com.acme.salary.reference.ReferenceService;
import com.acme.salary.reference.TestReferenceData;
import com.acme.salary.settings.SettingsService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.blankOrNullString;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Every error path that is not a feature's own (ADR-018, ADR-043): each becomes RFC 7807 with a stable
 * code, and none shows the client what went wrong inside.
 */
@WebMvcTest
@Import({ JacksonConfig.class, ValidationConfig.class, ErrorHandlingTest.Fixtures.class,
		ErrorHandlingTest.ThrowingController.class })
@ExtendWith(OutputCaptureExtension.class)
class ErrorHandlingTest {

	static final String ERROR_ID = "err-0001";

	/** Appears only in exception messages; it must never reach a response body. */
	static final String SECRET = "secret-internal-detail";

	/** A real body, so content negotiation has something to refuse. */
	private static final EmployeeResponse EMPLOYEE = new EmployeeResponse(1L, "Asha Rao", "asha.rao@acme.com",
			"Recruiter", "Human Resources", "IN", "INR", new BigDecimal("2400000.00"), LocalDate.of(2021, 4, 12), 0L);

	private static final String VALID_UPDATE = """
			{"fullName": "Asha Rao", "email": "asha.rao@acme.com", "jobTitle": "Recruiter",
			 "department": "Human Resources", "countryCode": "IN", "salary": 2400000.00, "hireDate": "2021-04-12",
			 "version": 0}
			""";

	@Autowired
	private MockMvc mvc;

	@MockitoBean
	private EmployeeService service;

	/** The slice loads every controller; each feature's service is mocked so its controller can start. */
	@MockitoBean
	private InsightsService insightsService;

	@MockitoBean
	private SettingsService settingsService;

	@Test
	void malformedJsonIs400MalformedRequest() throws Exception {
		mvc.perform(post("/api/v1/employees").contentType(MediaType.APPLICATION_JSON).content("{\"fullName\":"))
			.andExpect(status().isBadRequest())
			.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
			.andExpect(jsonPath("$.type").value("/problems/malformed-request"))
			.andExpect(jsonPath("$.title").value("Request body could not be read"))
			.andExpect(jsonPath("$.code").value("MALFORMED_REQUEST"))
			.andExpect(jsonPath("$.detail").value("The request body is not valid JSON."))
			.andExpect(jsonPath("$.instance").value("/api/v1/employees"));
	}

	@Test
	void missingBodyIs400MalformedRequest() throws Exception {
		mvc.perform(post("/api/v1/employees").contentType(MediaType.APPLICATION_JSON))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("MALFORMED_REQUEST"))
			.andExpect(jsonPath("$.detail").value("The request body is missing."));
	}

	@Test
	void springServerErrorIs500WithErrorId(CapturedOutput output) throws Exception {
		mvc.perform(get("/test/unwritable"))
			.andExpect(status().isInternalServerError())
			.andExpect(jsonPath("$.code").value("INTERNAL_ERROR"))
			.andExpect(jsonPath("$.errorId").value(ERROR_ID));

		String log = output.getAll();
		assertThat(log).contains(ERROR_ID);
		assertThat(log.substring(log.indexOf(ERROR_ID))).contains("\tat ");
	}

	@ParameterizedTest
	@MethodSource("nonNumericIdRequests")
	void nonNumericIdIs400ValidationFailed(RequestBuilder request) throws Exception {
		mvc.perform(request)
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
			.andExpect(jsonPath("$.errors[0].field").value("id"))
			.andExpect(jsonPath("$.errors[0].message").value("must be a whole number from 1"));
	}

	@Test
	void outOfRangeIdIs400ValidationFailed() throws Exception {
		mvc.perform(get("/api/v1/employees/99999999999999999999"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
			.andExpect(jsonPath("$.errors[0].field").value("id"))
			.andExpect(jsonPath("$.errors[0].message").value("must be a whole number from 1"));
	}

	@Test
	void unknownRouteIs404NotFound() throws Exception {
		mvc.perform(get("/api/v1/nope"))
			.andExpect(status().isNotFound())
			.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
			.andExpect(jsonPath("$.code").value("NOT_FOUND"))
			.andExpect(jsonPath("$.type").value("/problems/not-found"));
	}

	@Test
	void wrongMethodIs405MethodNotAllowed() throws Exception {
		mvc.perform(patch("/api/v1/employees/1").contentType(MediaType.APPLICATION_JSON).content("{}"))
			.andExpect(status().isMethodNotAllowed())
			.andExpect(header().string("Allow", containsString("PUT")))
			.andExpect(jsonPath("$.code").value("METHOD_NOT_ALLOWED"));
	}

	@Test
	void wrongContentTypeIs415() throws Exception {
		mvc.perform(post("/api/v1/employees").contentType(MediaType.TEXT_PLAIN).content("hello"))
			.andExpect(status().isUnsupportedMediaType())
			.andExpect(jsonPath("$.code").value("UNSUPPORTED_MEDIA_TYPE"));
	}

	@Test
	void unacceptableAcceptIs406() throws Exception {
		when(service.get(anyLong())).thenReturn(EMPLOYEE);

		mvc.perform(get("/api/v1/employees/1").accept(MediaType.APPLICATION_XML))
			.andExpect(status().isNotAcceptable())
			.andExpect(jsonPath("$.code").value("NOT_ACCEPTABLE"));
	}

	@Test
	void unexpectedExceptionIs500WithErrorId() throws Exception {
		when(service.get(anyLong())).thenThrow(new IllegalStateException(SECRET));

		mvc.perform(get("/api/v1/employees/1"))
			.andExpect(status().isInternalServerError())
			.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
			.andExpect(jsonPath("$.type").value("/problems/internal-error"))
			.andExpect(jsonPath("$.code").value("INTERNAL_ERROR"))
			.andExpect(jsonPath("$.errorId").value(ERROR_ID))
			.andExpect(jsonPath("$.detail")
				.value("Something went wrong on our side. Quote error " + ERROR_ID + " if you report it."))
			.andExpect(jsonPath("$.instance").value("/api/v1/employees/1"));
	}

	@Test
	void unexpectedExceptionIsLoggedWithErrorId(CapturedOutput output) throws Exception {
		when(service.get(anyLong())).thenThrow(new IllegalStateException(SECRET));

		mvc.perform(get("/api/v1/employees/1")).andExpect(status().isInternalServerError());

		String log = output.getAll();
		assertThat(log).contains(ERROR_ID);
		assertThat(log.substring(log.indexOf(ERROR_ID))).as("the stack trace follows the errorId in the same entry")
			.contains("java.lang.IllegalStateException: " + SECRET)
			.contains("\tat ");
	}

	@Test
	void unmappedIntegrityViolationIs500() throws Exception {
		when(service.get(anyLong())).thenThrow(new DataIntegrityViolationException("employee_country_fk " + SECRET));

		mvc.perform(get("/api/v1/employees/1"))
			.andExpect(status().isInternalServerError())
			.andExpect(jsonPath("$.code").value("INTERNAL_ERROR"))
			.andExpect(jsonPath("$.errorId").value(ERROR_ID));
	}

	@Test
	void unmappedSpringErrorFallsBackByStatus() throws Exception {
		mvc.perform(get("/test/binding-error"))
			.andExpect(status().isBadRequest())
			.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
			.andExpect(jsonPath("$.code").value("MALFORMED_REQUEST"));
	}

	@ParameterizedTest
	@MethodSource("everyErrorPath")
	void noErrorResponseLeaksInternals(ErrorCase errorCase) throws Exception {
		errorCase.arrange().accept(service);

		String body = mvc.perform(errorCase.request())
			.andExpect(jsonPath("$.type").value(not(blankOrNullString())))
			.andExpect(jsonPath("$.title").value(not(blankOrNullString())))
			.andExpect(jsonPath("$.status").isNumber())
			.andExpect(jsonPath("$.code").value(not(blankOrNullString())))
			.andReturn()
			.getResponse()
			.getContentAsString();

		assertThat(body).doesNotContain(SECRET)
			.doesNotContain("Exception")
			.doesNotContain("\tat ")
			.doesNotContain("java.")
			.doesNotContain("com.acme")
			.doesNotContain("\"trace\"");
	}

	static Stream<Named<RequestBuilder>> nonNumericIdRequests() {
		return Stream.of(Named.of("GET", get("/api/v1/employees/abc")),
				Named.of("PUT", put("/api/v1/employees/abc").contentType(MediaType.APPLICATION_JSON).content(VALID_UPDATE)),
				Named.of("DELETE", delete("/api/v1/employees/abc")));
	}

	static Stream<Named<ErrorCase>> everyErrorPath() {
		Consumer<EmployeeService> nothing = s -> {
		};
		return Stream.of(
				Named.of("malformed JSON", new ErrorCase(nothing,
						post("/api/v1/employees").contentType(MediaType.APPLICATION_JSON).content("{\"fullName\":"))),
				Named.of("missing body", new ErrorCase(nothing,
						post("/api/v1/employees").contentType(MediaType.APPLICATION_JSON))),
				Named.of("non-numeric id", new ErrorCase(nothing, get("/api/v1/employees/abc"))),
				Named.of("out-of-range id", new ErrorCase(nothing, get("/api/v1/employees/99999999999999999999"))),
				Named.of("unknown route", new ErrorCase(nothing, get("/api/v1/nope"))),
				Named.of("wrong method", new ErrorCase(nothing,
						patch("/api/v1/employees/1").contentType(MediaType.APPLICATION_JSON).content("{}"))),
				Named.of("wrong content type", new ErrorCase(nothing,
						post("/api/v1/employees").contentType(MediaType.TEXT_PLAIN).content("hello"))),
				Named.of("unacceptable Accept", new ErrorCase(s -> when(s.get(anyLong())).thenReturn(EMPLOYEE),
						get("/api/v1/employees/1").accept(MediaType.APPLICATION_XML))),
				Named.of("unexpected exception", new ErrorCase(
						s -> when(s.get(anyLong())).thenThrow(new IllegalStateException(SECRET)),
						get("/api/v1/employees/1"))),
				Named.of("integrity violation", new ErrorCase(
						s -> when(s.get(anyLong())).thenThrow(new DataIntegrityViolationException(SECRET)),
						get("/api/v1/employees/1"))),
				Named.of("unmapped Spring error", new ErrorCase(nothing, get("/test/binding-error"))));
	}

	/** One error path: how to set the mocked service up, and the request that triggers it. */
	record ErrorCase(Consumer<EmployeeService> arrange, RequestBuilder request) {
	}

	/**
	 * Raises a Spring MVC exception that the handler has no specific mapping for. {@code @TestComponent}
	 * keeps it out of every other test's component scan; this test imports it.
	 */
	@TestComponent
	@RestController
	static class ThrowingController {

		@GetMapping("/test/binding-error")
		String bindingError() throws ServletRequestBindingException {
			throw new ServletRequestBindingException(SECRET);
		}

		/** Jackson cannot write this, so Spring itself raises a 500 (HttpMessageNotWritableException). */
		@GetMapping("/test/unwritable")
		Unwritable unwritable() {
			return new Unwritable();
		}

	}

	static final class Unwritable {

		public String getValue() {
			throw new IllegalStateException(SECRET);
		}

	}

	@TestConfiguration
	static class Fixtures {

		@Bean
		Clock clock() {
			return Clock.fixed(Instant.parse("2026-10-25T12:00:00Z"), ZoneOffset.UTC);
		}

		@Bean
		ReferenceService referenceService() {
			return TestReferenceData.v2();
		}

		@Bean
		ErrorIds errorIds() {
			return () -> ERROR_ID;
		}

	}

}
