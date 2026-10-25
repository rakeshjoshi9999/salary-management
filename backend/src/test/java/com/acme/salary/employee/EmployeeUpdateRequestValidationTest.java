package com.acme.salary.employee;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Set;
import java.util.function.UnaryOperator;
import java.util.stream.Stream;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;

import org.junit.jupiter.api.Named;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

import com.acme.salary.reference.TestReferenceData;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The update request repeats the create request's field rules (ADR-041), so these tests fail if the
 * two records drift apart, and cover the one field only update has.
 */
class EmployeeUpdateRequestValidationTest {

	private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-25T12:00:00Z"), ZoneOffset.UTC);

	private final Validator validator = TestValidators.validator(TestReferenceData.v2(), CLOCK);

	@Test
	void acceptsValidUpdate() {
		assertThat(validator.validate(Requests.valid().buildUpdate(3L))).isEmpty();
	}

	@ParameterizedTest
	@MethodSource("createFailures")
	void updateFollowsCreateFieldRules(UnaryOperator<Requests> breakIt) {
		List<String> createFields = fieldsOf(validator.validate(breakIt.apply(Requests.valid()).build()));
		List<String> updateFields = fieldsOf(validator.validate(breakIt.apply(Requests.valid()).buildUpdate(3L)));

		assertThat(createFields).as("the case must fail on create").isNotEmpty();
		assertThat(updateFields).containsExactlyInAnyOrderElementsOf(createFields);
	}

	@Test
	void rejectsMissingVersion() {
		assertThat(fieldsOf(validator.validate(Requests.valid().buildUpdate(null)))).containsExactly("version");
	}

	@Test
	void rejectsNegativeVersion() {
		assertThat(fieldsOf(validator.validate(Requests.valid().buildUpdate(-1L)))).containsExactly("version");
	}

	static Stream<Named<UnaryOperator<Requests>>> createFailures() {
		Stream<Named<UnaryOperator<Requests>>> missing = Stream
			.of("fullName", "email", "jobTitle", "department", "countryCode", "salary", "hireDate")
			.map(field -> Named.of("missing " + field, r -> r.with(field, null)));
		Stream<Named<UnaryOperator<Requests>>> invalid = Stream.of(
				Named.of("salary 0", r -> r.with("salary", new BigDecimal("0.00"))),
				Named.of("salary 100.001", r -> r.with("salary", new BigDecimal("100.001"))),
				Named.of("future hire date", r -> r.with("hireDate", LocalDate.of(2026, 10, 26))),
				Named.of("country JP", r -> r.with("countryCode", "JP")),
				Named.of("Recruiter in Engineering", r -> r.with("jobTitle", "Recruiter")),
				Named.of("email without a dot", r -> r.with("email", "asha@acmecom")),
				Named.of("salary -1", r -> r.with("salary", new BigDecimal("-1.00"))),
				Named.of("salary of 13 digits", r -> r.with("salary", new BigDecimal("1000000000000.00"))),
				Named.of("hire date before 1950", r -> r.with("hireDate", LocalDate.of(1949, 12, 31))),
				Named.of("lowercase country", r -> r.with("countryCode", "in")),
				Named.of("unknown department", r -> r.with("department", "Legal")),
				Named.of("unknown job title", r -> r.with("jobTitle", "Astronaut")),
				Named.of("name of 201", r -> r.with("fullName", "a".repeat(201))),
				Named.of("email of 255", r -> r.with("email", emailOfLength(255))),
				Named.of("job title of 101", r -> r.with("jobTitle", "a".repeat(101))),
				Named.of("department of 101", r -> r.with("department", "a".repeat(101))));
		Stream<Named<UnaryOperator<Requests>>> blank = Stream.of("fullName", "email", "jobTitle", "department")
			.map(field -> Named.of("blank " + field, r -> r.with(field, "")));
		return Stream.of(missing, invalid, blank).flatMap(cases -> cases);
	}

	/** A well-formed email of the given length: local part 64, domain labels of 63 or less. */
	private static String emailOfLength(int length) {
		String fixed = "a".repeat(64) + "@" + "b".repeat(63) + "." + "c".repeat(63) + ".";
		return fixed + "d".repeat(length - fixed.length() - ".com".length()) + ".com";
	}

	private static <T> List<String> fieldsOf(Set<ConstraintViolation<T>> violations) {
		return violations.stream().map(v -> v.getPropertyPath().toString()).toList();
	}

}
