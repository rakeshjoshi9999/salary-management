package com.acme.salary.employee;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
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
import com.acme.salary.common.error.ErrorIds;
import com.acme.salary.employee.dto.EmployeeCreateRequest;
import com.acme.salary.employee.dto.EmployeePage;
import com.acme.salary.employee.dto.EmployeeResponse;
import com.acme.salary.employee.dto.EmployeeUpdateRequest;
import com.acme.salary.reference.ReferenceService;
import com.acme.salary.reference.TestReferenceData;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.blankOrNullString;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * /api/v1/employees at the HTTP boundary: the real Jackson and validation configuration
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
	void getReturns200WithEmployee() throws Exception {
		when(service.get(101L)).thenReturn(createdWithSalary(new BigDecimal("2400000")));

		mvc.perform(get("/api/v1/employees/101"))
			.andExpect(status().isOk())
			.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
			.andExpect(jsonPath("$.id").value(101))
			.andExpect(jsonPath("$.fullName").value("Asha Rao"))
			.andExpect(jsonPath("$.email").value("asha.rao@acme.com"))
			.andExpect(jsonPath("$.jobTitle").value("Software Engineer"))
			.andExpect(jsonPath("$.department").value("Engineering"))
			.andExpect(jsonPath("$.countryCode").value("IN"))
			.andExpect(jsonPath("$.currency").value("INR"))
			.andExpect(jsonPath("$.hireDate").value("2021-04-12"))
			.andExpect(jsonPath("$.version").value(0))
			.andExpect(content().string(org.hamcrest.Matchers.containsString("\"salary\":2400000.00")));
	}

	@Test
	void missingEmployeeReturns404Problem() throws Exception {
		when(service.get(42L)).thenThrow(new EmployeeNotFoundException(42L));

		mvc.perform(get("/api/v1/employees/42"))
			.andExpect(status().isNotFound())
			.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
			.andExpect(jsonPath("$.type").value("/problems/employee-not-found"))
			.andExpect(jsonPath("$.title").value("Employee not found"))
			.andExpect(jsonPath("$.status").value(404))
			.andExpect(jsonPath("$.code").value("EMPLOYEE_NOT_FOUND"))
			.andExpect(jsonPath("$.detail").value("No employee with id 42."))
			.andExpect(jsonPath("$.instance").value("/api/v1/employees/42"))
			.andExpect(jsonPath("$.errors").doesNotExist());
	}

	@Test
	void updateReturns200WithEmployee() throws Exception {
		when(service.update(eq(101L), any())).thenReturn(createdWithSalary(new BigDecimal("2500000.00")));
		Map<String, Object> body = validBody();
		body.put("salary", new BigDecimal("2500000.00"));
		body.put("version", 3);

		sendPut(body).andExpect(status().isOk())
			.andExpect(jsonPath("$.id").value(101))
			.andExpect(content().string(org.hamcrest.Matchers.containsString("\"salary\":2500000.00")));

		ArgumentCaptor<EmployeeUpdateRequest> sent = ArgumentCaptor.forClass(EmployeeUpdateRequest.class);
		verify(service).update(eq(101L), sent.capture());
		assertThat(sent.getValue().version()).isEqualTo(3L);
		assertThat(sent.getValue().salary()).isEqualTo(new BigDecimal("2500000.00"));
	}

	@Test
	void updateRejectsMissingVersion() throws Exception {
		sendPut(validBody()).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
			.andExpect(jsonPath("$.errors[*].field").value(containsInAnyOrder("version")));
		verify(service, never()).update(any(Long.class), any());
	}

	@ParameterizedTest
	@ValueSource(strings = { "id", "currency" })
	void updateRejectsUnknownField(String field) throws Exception {
		Map<String, Object> body = validBody();
		body.put("version", 3);
		body.put(field, field.equals("id") ? 5 : "USD");

		sendPut(body).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
			.andExpect(jsonPath("$.errors[0].field").value(field));
		verify(service, never()).update(any(Long.class), any());
	}

	@Test
	void staleVersionReturns409Problem() throws Exception {
		when(service.update(eq(101L), any())).thenThrow(new StaleVersionException(3L, 4L));
		Map<String, Object> body = validBody();
		body.put("version", 3);

		sendPut(body).andExpect(status().isConflict())
			.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
			.andExpect(jsonPath("$.type").value("/problems/stale-version"))
			.andExpect(jsonPath("$.title").value("Employee was changed by someone else"))
			.andExpect(jsonPath("$.status").value(409))
			.andExpect(jsonPath("$.code").value("STALE_VERSION"))
			.andExpect(jsonPath("$.detail")
				.value("You sent version 3, but the current version is 4. Reload and try again."))
			.andExpect(jsonPath("$.instance").value("/api/v1/employees/101"))
			.andExpect(jsonPath("$.currentVersion").value(4))
			.andExpect(jsonPath("$.errors").doesNotExist());
	}

	@Test
	void updateOfMissingEmployeeReturns404() throws Exception {
		when(service.update(eq(101L), any())).thenThrow(new EmployeeNotFoundException(101L));
		Map<String, Object> body = validBody();
		body.put("version", 3);

		sendPut(body).andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("EMPLOYEE_NOT_FOUND"));
	}

	@Test
	void listReturnsPageEnvelope() throws Exception {
		when(service.list(any())).thenReturn(new EmployeePage(List.of(created()), 0, 20, 1, 1));

		mvc.perform(get("/api/v1/employees"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.page").value(0))
			.andExpect(jsonPath("$.size").value(20))
			.andExpect(jsonPath("$.totalItems").value(1))
			.andExpect(jsonPath("$.totalPages").value(1))
			.andExpect(jsonPath("$.items", hasSize(1)))
			.andExpect(jsonPath("$.items[0].id").value(101))
			.andExpect(jsonPath("$.items[0].currency").value("INR"))
			.andExpect(jsonPath("$.items[0].version").value(0));
	}

	@Test
	void invalidParameterIs400NamingIt() throws Exception {
		mvc.perform(get("/api/v1/employees").param("size", "101"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
			.andExpect(jsonPath("$.errors[*].field").value(containsInAnyOrder("size")));
		verify(service, never()).list(any());
	}

	@Test
	void rejectsUnknownQueryParameter() throws Exception {
		mvc.perform(get("/api/v1/employees").param("contry", "IN"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
			.andExpect(jsonPath("$.errors[*].field").value(containsInAnyOrder("contry")));
		verify(service, never()).list(any());
	}

	@Test
	void deleteReturns204WithNoBody() throws Exception {
		mvc.perform(delete("/api/v1/employees/101")).andExpect(status().isNoContent()).andExpect(content().string(""));

		verify(service).delete(101L);
	}

	@Test
	void deleteOfMissingEmployeeReturns404Problem() throws Exception {
		doThrow(new EmployeeNotFoundException(101L)).when(service).delete(101L);

		mvc.perform(delete("/api/v1/employees/101"))
			.andExpect(status().isNotFound())
			.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
			.andExpect(jsonPath("$.code").value("EMPLOYEE_NOT_FOUND"))
			.andExpect(jsonPath("$.instance").value("/api/v1/employees/101"));
	}

	private ResultActions sendPut(Map<String, Object> body) throws Exception {
		return mvc.perform(put("/api/v1/employees/101").contentType(MediaType.APPLICATION_JSON)
			.content(JSON.writeValueAsString(body)));
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

		@Bean
		ErrorIds errorIds() {
			return () -> "err-test";
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
