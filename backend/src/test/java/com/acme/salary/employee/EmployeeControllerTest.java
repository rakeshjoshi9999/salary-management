package com.acme.salary.employee;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import tools.jackson.databind.json.JsonMapper;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.acme.salary.common.config.JacksonConfig;
import com.acme.salary.common.config.ValidationConfig;
import com.acme.salary.employee.dto.EmployeeCreateRequest;
import com.acme.salary.employee.dto.EmployeeResponse;
import com.acme.salary.reference.ReferenceService;
import com.acme.salary.reference.TestReferenceData;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.blankOrNullString;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * POST /api/v1/employees at the HTTP boundary: the real Jackson and validation configuration
 * (ADR-037), the V2 reference rows in memory, a settable clock, and the service mocked.
 */
@WebMvcTest(EmployeeController.class)
@Import({ JacksonConfig.class, ValidationConfig.class, EmployeeControllerTest.Fixtures.class })
class EmployeeControllerTest {

	private static final Instant TODAY = Instant.parse("2026-10-25T12:00:00Z");

	/** Builds request bodies only; deliberately not the application's mapper. */
	private static final JsonMapper JSON = JsonMapper.builder().build();

	@Autowired
	private MockMvc mvc;

	@Autowired
	private SettableClock clock;

	@MockitoBean
	private EmployeeService service;

	@BeforeEach
	void resetClock() {
		clock.set(TODAY);
	}

	@Test
	void createReturns201WithLocationAndBody() throws Exception {
		when(service.create(any())).thenReturn(created());

		send(validBody()).andExpect(status().isCreated())
			.andExpect(header().string("Location", "/api/v1/employees/101"))
			.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
			.andExpect(jsonPath("$.id").value(101))
			.andExpect(jsonPath("$.fullName").value("Asha Rao"))
			.andExpect(jsonPath("$.email").value("asha.rao@acme.com"))
			.andExpect(jsonPath("$.jobTitle").value("Software Engineer"))
			.andExpect(jsonPath("$.department").value("Engineering"))
			.andExpect(jsonPath("$.countryCode").value("IN"))
			.andExpect(jsonPath("$.currency").value("INR"))
			.andExpect(jsonPath("$.hireDate").value("2021-04-12"))
			.andExpect(jsonPath("$.version").value(0));
	}

	@Test
	void writesSalaryAsJsonNumberWithTwoDecimals() throws Exception {
		when(service.create(any())).thenReturn(createdWithSalary(new BigDecimal("2400000")));

		String body = send(validBody()).andReturn().getResponse().getContentAsString();

		assertThat(body).contains("\"salary\":2400000.00");
	}

	@Test
	void readsSalaryExactly() throws Exception {
		when(service.create(any())).thenReturn(created());
		Map<String, Object> body = validBody();
		body.put("salary", new BigDecimal("1234567890.12"));

		send(body).andExpect(status().isCreated());

		assertThat(sentToService().salary()).isEqualTo(new BigDecimal("1234567890.12"));
	}

	@Test
	void trimsTextFieldsBeforeValidation() throws Exception {
		when(service.create(any())).thenReturn(created());
		Map<String, Object> body = validBody();
		body.put("fullName", "  Asha Rao  ");
		body.put("email", " asha.rao@acme.com\t");

		send(body).andExpect(status().isCreated());

		EmployeeCreateRequest sent = sentToService();
		assertThat(sent.fullName()).isEqualTo("Asha Rao");
		assertThat(sent.email()).isEqualTo("asha.rao@acme.com");
	}

	@Test
	void rejectsWhitespaceOnlyName() throws Exception {
		Map<String, Object> body = validBody();
		body.put("fullName", "   ");

		send(body).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
			.andExpect(jsonPath("$.errors[*].field").value(containsInAnyOrder("fullName")));
	}

	@Test
	void invalidRequestReturnsValidationProblem() throws Exception {
		Map<String, Object> body = validBody();
		body.remove("salary");

		send(body).andExpect(status().isBadRequest())
			.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
			.andExpect(jsonPath("$.type").value("/problems/validation-failed"))
			.andExpect(jsonPath("$.title").value("Invalid request"))
			.andExpect(jsonPath("$.status").value(400))
			.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
			.andExpect(jsonPath("$.detail").value("1 field is invalid"))
			.andExpect(jsonPath("$.instance").value("/api/v1/employees"))
			.andExpect(jsonPath("$.errors", hasSize(1)))
			.andExpect(jsonPath("$.errors[0].field").value("salary"))
			.andExpect(jsonPath("$.errors[0].message").value(not(blankOrNullString())));
		verify(service, never()).create(any());
	}

	@Test
	void listsEveryInvalidFieldInErrors() throws Exception {
		Map<String, Object> body = validBody();
		body.put("salary", BigDecimal.ZERO);
		body.put("email", "asha");

		send(body).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.detail").value("2 fields are invalid"))
			.andExpect(jsonPath("$.errors", hasSize(2)))
			.andExpect(jsonPath("$.errors[?(@.field == 'salary')].message").value("must be greater than 0"))
			.andExpect(jsonPath("$.errors[?(@.field == 'email')].message").value("must be a valid email address"));
	}

	@ParameterizedTest
	@ValueSource(strings = { "nickname", "currency", "id" })
	void rejectsUnknownField(String field) throws Exception {
		Map<String, Object> body = validBody();
		body.put(field, field.equals("id") ? 5 : "x");

		send(body).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
			.andExpect(jsonPath("$.errors", hasSize(1)))
			.andExpect(jsonPath("$.errors[0].field").value(field));
		verify(service, never()).create(any());
	}

	@Test
	void rejectsSalaryAsString() throws Exception {
		Map<String, Object> body = validBody();
		body.put("salary", "100.00");

		send(body).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
			.andExpect(jsonPath("$.errors[0].field").value("salary"));
	}

	@Test
	void rejectsUnparseableHireDate() throws Exception {
		Map<String, Object> body = validBody();
		body.put("hireDate", "2021-13-45");

		send(body).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
			.andExpect(jsonPath("$.errors[0].field").value("hireDate"));
	}

	@Test
	void duplicateEmailReturns409Problem() throws Exception {
		when(service.create(any())).thenThrow(new DuplicateEmailException("asha.rao@acme.com"));

		send(validBody()).andExpect(status().isConflict())
			.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
			.andExpect(jsonPath("$.type").value("/problems/duplicate-email"))
			.andExpect(jsonPath("$.title").value("Email already in use"))
			.andExpect(jsonPath("$.status").value(409))
			.andExpect(jsonPath("$.code").value("DUPLICATE_EMAIL"))
			.andExpect(jsonPath("$.detail").value("Another employee already uses asha.rao@acme.com."))
			.andExpect(jsonPath("$.instance").value("/api/v1/employees"))
			.andExpect(jsonPath("$.errors").doesNotExist());
	}

	@Test
	void judgesTodayByInjectedClock() throws Exception {
		when(service.create(any())).thenReturn(created());
		clock.set(Instant.parse("2030-01-01T12:00:00Z"));
		Map<String, Object> body = validBody();
		body.put("hireDate", "2029-06-01");

		send(body).andExpect(status().isCreated());
	}

	private ResultActions send(Map<String, Object> body) throws Exception {
		return mvc.perform(post("/api/v1/employees").contentType(MediaType.APPLICATION_JSON)
			.content(JSON.writeValueAsString(body)));
	}

	private EmployeeCreateRequest sentToService() {
		ArgumentCaptor<EmployeeCreateRequest> sent = ArgumentCaptor.forClass(EmployeeCreateRequest.class);
		verify(service).create(sent.capture());
		return sent.getValue();
	}

	private static Map<String, Object> validBody() {
		Map<String, Object> body = new LinkedHashMap<>();
		body.put("fullName", "Asha Rao");
		body.put("email", "asha.rao@acme.com");
		body.put("jobTitle", "Software Engineer");
		body.put("department", "Engineering");
		body.put("countryCode", "IN");
		body.put("salary", new BigDecimal("2400000.00"));
		body.put("hireDate", "2021-04-12");
		return body;
	}

	private static EmployeeResponse created() {
		return createdWithSalary(new BigDecimal("2400000.00"));
	}

	private static EmployeeResponse createdWithSalary(BigDecimal salary) {
		return new EmployeeResponse(101L, "Asha Rao", "asha.rao@acme.com", "Software Engineer", "Engineering", "IN",
				"INR", salary, LocalDate.of(2021, 4, 12), 0L);
	}

	@TestConfiguration
	static class Fixtures {

		@Bean
		SettableClock clock() {
			return new SettableClock(TODAY);
		}

		@Bean
		ReferenceService referenceService() {
			return TestReferenceData.v2();
		}

	}

	/** A UTC clock a test can move, so one context serves every "today". */
	static final class SettableClock extends Clock {

		private volatile Instant now;

		SettableClock(Instant now) {
			this.now = now;
		}

		void set(Instant now) {
			this.now = now;
		}

		@Override
		public ZoneId getZone() {
			return ZoneOffset.UTC;
		}

		@Override
		public Clock withZone(ZoneId zone) {
			throw new UnsupportedOperationException();
		}

		@Override
		public Instant instant() {
			return now;
		}

	}

}
