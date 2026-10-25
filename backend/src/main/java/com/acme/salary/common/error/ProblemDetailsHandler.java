package com.acme.salary.common.error;

import java.net.URI;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.exc.MismatchedInputException;
import tools.jackson.databind.exc.UnrecognizedPropertyException;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * RFC 7807 responses with a stable {@code code} (ADR-018). Only VALIDATION_FAILED is mapped so far;
 * the other codes arrive with tasks 3.3 to 3.7 (ADR-037).
 */
@RestControllerAdvice
class ProblemDetailsHandler extends ResponseEntityExceptionHandler {

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
	 * An unknown field, or a value of the wrong JSON type, is reported as a field error rather than a
	 * malformed body, so the form can mark the field. Anything else keeps Spring's default until 3.7.
	 */
	@Override
	protected ResponseEntity<Object> handleHttpMessageNotReadable(HttpMessageNotReadableException ex,
			HttpHeaders headers, HttpStatusCode status, WebRequest request) {
		Optional<FieldProblem> problem = fieldProblem(ex);
		if (problem.isPresent()) {
			return validationFailed(List.of(problem.get()), request);
		}
		return super.handleHttpMessageNotReadable(ex, headers, status, request);
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

	private static ResponseEntity<Object> validationFailed(List<FieldProblem> errors, WebRequest request) {
		List<FieldProblem> sorted = errors.stream()
			.sorted(Comparator.comparing(FieldProblem::field).thenComparing(FieldProblem::message))
			.toList();
		long fields = sorted.stream().map(FieldProblem::field).distinct().count();
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST,
				fields == 1 ? "1 field is invalid" : fields + " fields are invalid");
		problem.setType(URI.create("/problems/validation-failed"));
		problem.setTitle("Invalid request");
		problem.setInstance(URI.create(((ServletWebRequest) request).getRequest().getRequestURI()));
		problem.setProperty("code", "VALIDATION_FAILED");
		problem.setProperty("errors", sorted);
		return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(problem);
	}

	/** One entry of {@code errors[]}: a JSON property name and what is wrong with it. */
	record FieldProblem(String field, String message) {
	}

}
