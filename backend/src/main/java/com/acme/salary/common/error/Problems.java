package com.acme.salary.common.error;

import java.net.URI;
import java.util.Locale;

import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;

/** Builds the Problems shared by the MVC handler and the /error controller (ADR-018, ADR-043). */
final class Problems {

	private Problems() {
	}

	static ProblemDetail problem(HttpStatusCode status, String code, String title, String detail, String path) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
		problem.setType(typeFor(code));
		problem.setTitle(title);
		problem.setInstance(URI.create(path));
		problem.setProperty("code", code);
		return problem;
	}

	/** The 500 a client sees: only an id to quote; the caller logs the same id with the exception. */
	static ProblemDetail internalError(String errorId, String path) {
		ProblemDetail problem = problem(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "Internal error",
				"Something went wrong on our side. Quote error " + errorId + " if you report it.", path);
		problem.setProperty("errorId", errorId);
		return problem;
	}

	/** The contract's codes by status; anything else falls back by status class (ADR-043). */
	static String codeFor(HttpStatusCode status) {
		return switch (status.value()) {
			case 404 -> "NOT_FOUND";
			case 405 -> "METHOD_NOT_ALLOWED";
			case 406 -> "NOT_ACCEPTABLE";
			case 415 -> "UNSUPPORTED_MEDIA_TYPE";
			default -> status.is5xxServerError() ? "INTERNAL_ERROR" : "MALFORMED_REQUEST";
		};
	}

	static URI typeFor(String code) {
		return URI.create("/problems/" + code.toLowerCase(Locale.ROOT).replace('_', '-'));
	}

}
