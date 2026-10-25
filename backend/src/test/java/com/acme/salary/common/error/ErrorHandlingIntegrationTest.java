package com.acme.salary.common.error;

import jakarta.servlet.RequestDispatcher;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.acme.salary.AbstractIntegrationTest;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** The error handling is live in the real application context, not only in the MVC slice (ADR-043). */
class ErrorHandlingIntegrationTest extends AbstractIntegrationTest {

	@Autowired
	private MockMvc mvc;

	@Test
	void malformedJsonIs400InTheRealApp() throws Exception {
		mvc.perform(post("/api/v1/employees").contentType(MediaType.APPLICATION_JSON).content("{\"fullName\":"))
			.andExpect(status().isBadRequest())
			.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
			.andExpect(jsonPath("$.code").value("MALFORMED_REQUEST"));
	}

	/**
	 * Errors that never reach Spring MVC (a failing servlet filter, say) are forwarded to /error with
	 * the status as a request attribute; they become a Problem with a code as well (ADR-043).
	 */
	@ParameterizedTest
	@CsvSource({ "400, MALFORMED_REQUEST", "500, INTERNAL_ERROR" })
	void errorPageIsProblemDetails(int statusCode, String code) throws Exception {
		mvc.perform(get("/error").requestAttr(RequestDispatcher.ERROR_STATUS_CODE, statusCode)
			.requestAttr(RequestDispatcher.ERROR_REQUEST_URI, "/api/v1/employees"))
			.andExpect(status().is(statusCode))
			.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
			.andExpect(jsonPath("$.status").value(statusCode))
			.andExpect(jsonPath("$.code").value(code))
			.andExpect(jsonPath("$.instance").value("/api/v1/employees"));
	}

	@Test
	void unknownRouteIs404InTheRealApp() throws Exception {
		mvc.perform(get("/api/v1/nope"))
			.andExpect(status().isNotFound())
			.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
			.andExpect(jsonPath("$.code").value("NOT_FOUND"));
	}

}
