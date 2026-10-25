package com.acme.salary.common.error;

import org.junit.jupiter.api.Test;

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

	@Test
	void unknownRouteIs404InTheRealApp() throws Exception {
		mvc.perform(get("/api/v1/nope"))
			.andExpect(status().isNotFound())
			.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
			.andExpect(jsonPath("$.code").value("NOT_FOUND"));
	}

}
