package com.acme.salary.common.error;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;

import jakarta.servlet.http.HttpServletResponse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.exc.MismatchedInputException;
import tools.jackson.databind.exc.UnrecognizedPropertyException;

import org.springframework.beans.TypeMismatchException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * Every error leaves as RFC 7807 Problem Details with a stable {@code code}, and none carries an
 * exception class, message or stack trace (ADR-018, ADR-043).
 *
 * Feature errors are {@code ErrorResponseException}s that bring their own Problem (ADR-038). Spring's
 * own errors keep Spring's status and get a code here; anything unexpected is a 500 whose
 * {@code errorId} also appears in the log entry with the stack trace.
 */
@RestControllerAdvice
class ProblemDetailsHandler extends ResponseEntityExceptionHandler {

	private static final Logger LOG = LoggerFactory.getLogger(ProblemDetailsHandler.class);

	private final ErrorIds errorIds;

	ProblemDetailsHandler(ErrorIds errorIds) {
		this.errorIds = errorIds;
	}

	@Override
	protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
			HttpHeaders headers, HttpStatusCode status, WebRequest request) {
		List<FieldProblem> errors = ex.getBindingResult()
			.getFieldErrors()
			.stream()
			.map(error -> new FieldProblem(error.getField(), error.getDefaultMessage()))
			.toList();
		return validationFailed(errors, request);
	}

	/**
	 * An unknown field, or a value of the wrong JSON type, is a field error the form can mark. Anything
	 * else unreadable (broken JSON, no body) is MALFORMED_REQUEST.
	 */
	@Override
	protected ResponseEntity<Object> handleHttpMessageNotReadable(HttpMessageNotReadableException ex,
			HttpHeaders headers, HttpStatusCode status, WebRequest request) {
		Optional<FieldProblem> problem = fieldProblem(ex);
		if (problem.isPresent()) {
			return validationFailed(List.of(problem.get()), request);
		}
		String detail = isMissingBody(ex) ? "The request body is missing." : "The request body is not valid JSON.";
		ProblemDetail malformed = problem(HttpStatus.BAD_REQUEST, "MALFORMED_REQUEST", "Request body could not be read",
				detail, request);
		return ResponseEntity.badRequest().body(malformed);
	}

	/** A path or query value of the wrong type, such as {@code /employees/abc} (ADR-039, ADR-043). */
	@Override
	protected ResponseEntity<Object> handleTypeMismatch(TypeMismatchException ex, HttpHeaders headers,
			HttpStatusCode status, WebRequest request) {
		String field = ex instanceof MethodArgumentTypeMismatchException argument ? argument.getName()
				: ex.getPropertyName();
		return validationFailed(List.of(new FieldProblem(field, typeMessage(ex.getRequiredType()))), request);
	}

	/**
	 * Gives Spring's own Problems a code and a type, keeping Spring's status (ADR-043). A 5xx from Spring
	 * (a response that cannot be written, say) is treated like any unexpected error: logged with an id.
	 */
	@Override
	protected ResponseEntity<Object> handleExceptionInternal(Exception ex, Object body, HttpHeaders headers,
			HttpStatusCode statusCode, WebRequest request) {
		if (statusCode.is5xxServerError()) {
			return handleUnexpected(ex, request);
		}
		ResponseEntity<Object> response = super.handleExceptionInternal(ex, body, headers, statusCode, request);
		if (response != null && response.getBody() instanceof ProblemDetail problem && !hasCode(problem)) {
			String code = Problems.codeFor(statusCode);
			problem.setProperty("code", code);
			if (problem.getType() == null || "about:blank".equals(problem.getType().toString())) {
				problem.setType(Problems.typeFor(code));
			}
		}
		return response;
	}

	/**
	 * Anything nobody mapped, including a database rule that validation should have caught first: a
	 * bug, so a 500. The client gets only an id; the log gets the id and the whole exception.
	 */
	@ExceptionHandler(Exception.class)
	ResponseEntity<Object> handleUnexpected(Exception ex, WebRequest request) {
		String errorId = errorIds.next();
		LOG.error("Unhandled error {} on {}", errorId, path(request), ex);
		if (isCommitted(request)) {
			return null; // part of a body already went out; a second one would only corrupt it
		}
		return ResponseEntity.internalServerError().body(Problems.internalError(errorId, path(request)));
	}

	private static Optional<FieldProblem> fieldProblem(HttpMessageNotReadableException ex) {
		for (Throwable cause = ex.getCause(); cause != null; cause = cause.getCause()) {
			if (cause instanceof UnrecognizedPropertyException unknown) {
				return Optional.of(new FieldProblem(unknown.getPropertyName(), "is not a recognised field"));
			}
			if (cause instanceof MismatchedInputException mismatch) {
				return fieldName(mismatch).map(field -> new FieldProblem(field, "has the wrong type or format"));
			}
		}
		return Optional.empty();
	}

	private static Optional<String> fieldName(JacksonException ex) {
		List<JacksonException.Reference> path = ex.getPath();
		return path.isEmpty() ? Optional.empty() : Optional.ofNullable(path.getLast().getPropertyName());
	}

	/** Spring's wording for an absent body; there is no dedicated exception type for it. */
	private static boolean isMissingBody(HttpMessageNotReadableException ex) {
		return ex.getMessage() != null && ex.getMessage().startsWith("Required request body is missing");
	}

	private static String typeMessage(Class<?> requiredType) {
		if (requiredType == long.class || requiredType == Long.class) {
			return "must be a whole number from 1";
		}
		return "has the wrong type or format";
	}

	private static boolean hasCode(ProblemDetail problem) {
		return problem.getProperties() != null && problem.getProperties().containsKey("code");
	}

	private static ResponseEntity<Object> validationFailed(List<FieldProblem> errors, WebRequest request) {
		List<FieldProblem> sorted = errors.stream()
			.sorted(Comparator.comparing(FieldProblem::field).thenComparing(FieldProblem::message))
			.toList();
		long fields = sorted.stream().map(FieldProblem::field).distinct().count();
		ProblemDetail problem = problem(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "Invalid request",
				fields == 1 ? "1 field is invalid" : fields + " fields are invalid", request);
		problem.setProperty("errors", sorted);
		return ResponseEntity.badRequest().body(problem);
	}

	private static ProblemDetail problem(HttpStatus status, String code, String title, String detail,
			WebRequest request) {
		return Problems.problem(status, code, title, detail, path(request));
	}

	private static boolean isCommitted(WebRequest request) {
		HttpServletResponse response = ((ServletWebRequest) request).getResponse();
		return response != null && response.isCommitted();
	}

	private static String path(WebRequest request) {
		return ((ServletWebRequest) request).getRequest().getRequestURI();
	}

	/** One entry of {@code errors[]}: a JSON property or parameter name and what is wrong with it. */
	record FieldProblem(String field, String message) {
	}

}
