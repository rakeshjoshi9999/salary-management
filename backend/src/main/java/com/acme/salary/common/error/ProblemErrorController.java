package com.acme.salary.common.error;

import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.boot.webmvc.error.ErrorController;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Replaces Spring Boot's /error page, which errors outside Spring MVC (a failing servlet filter, say)
 * are forwarded to, so those also leave as a Problem with a code (ADR-043). Boot's own JSON there has
 * none.
 */
@RestController
class ProblemErrorController implements ErrorController {

	private static final Logger LOG = LoggerFactory.getLogger(ProblemErrorController.class);

	private final ErrorIds errorIds;

	ProblemErrorController(ErrorIds errorIds) {
		this.errorIds = errorIds;
	}

	@RequestMapping("${server.error.path:/error}")
	ResponseEntity<ProblemDetail> error(HttpServletRequest request) {
		HttpStatusCode status = statusOf(request);
		String path = pathOf(request);
		ProblemDetail problem;
		if (status.is5xxServerError()) {
			String errorId = errorIds.next();
			Throwable cause = (Throwable) request.getAttribute(RequestDispatcher.ERROR_EXCEPTION);
			LOG.error("Unhandled error {} on {}", errorId, path, cause);
			problem = Problems.internalError(errorId, path);
		}
		else {
			HttpStatus known = HttpStatus.resolve(status.value());
			String title = known == null ? "Error" : known.getReasonPhrase();
			problem = Problems.problem(status, Problems.codeFor(status), title, null, path);
		}
		return ResponseEntity.status(status).contentType(MediaType.APPLICATION_PROBLEM_JSON).body(problem);
	}

	/** Boot records the status as a request attribute; without one (a direct call) it is a 500. */
	private static HttpStatusCode statusOf(HttpServletRequest request) {
		Object status = request.getAttribute(RequestDispatcher.ERROR_STATUS_CODE);
		if (status instanceof Integer code && code >= 400 && code <= 599) {
			return HttpStatusCode.valueOf(code);
		}
		return HttpStatus.INTERNAL_SERVER_ERROR;
	}

	private static String pathOf(HttpServletRequest request) {
		Object path = request.getAttribute(RequestDispatcher.ERROR_REQUEST_URI);
		return path instanceof String uri ? uri : request.getRequestURI();
	}

}
