package com.acme.salary.employee;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Set;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;

import org.junit.jupiter.api.Test;

import com.acme.salary.employee.dto.EmployeeListQuery;
import com.acme.salary.reference.TestReferenceData;

import static org.assertj.core.api.Assertions.assertThat;

/** The list's query parameters (ADR-016, ADR-044), through plain Hibernate Validator. */
class EmployeeListQueryValidationTest {

	private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-25T12:00:00Z"), ZoneOffset.UTC);

	private final Validator validator = TestValidators.validator(TestReferenceData.v2(), CLOCK);

	@Test
	void appliesDefaults() {
		EmployeeListQuery query = new EmployeeListQuery(null, null, null, null, null, null, null);

		assertThat(query.page()).isZero();
		assertThat(query.size()).isEqualTo(20);
		assertThat(query.sort()).isEqualTo("fullName,asc");
		assertThat(validator.validate(query)).isEmpty();
	}

	@Test
	void rejectsNegativePage() {
		assertThat(fieldsOf(validator.validate(page(-1, 20)))).containsExactly("page");
	}

	@Test
	void rejectsSizeZero() {
		assertThat(fieldsOf(validator.validate(page(0, 0)))).containsExactly("size");
	}

	@Test
	void rejectsSizeAbove100() {
		assertThat(fieldsOf(validator.validate(page(0, 101)))).containsExactly("size");
	}

	@Test
	void acceptsSize100() {
		assertThat(validator.validate(page(0, 100))).isEmpty();
	}

	@Test
	void reportsEveryInvalidParameterAtOnce() {
		assertThat(fieldsOf(validator.validate(page(-1, 0)))).containsExactlyInAnyOrder("page", "size");
	}

	private static EmployeeListQuery page(int page, int size) {
		return new EmployeeListQuery(page, size, null, null, null, null, null);
	}

	private static List<String> fieldsOf(Set<ConstraintViolation<EmployeeListQuery>> violations) {
		return violations.stream().map(v -> v.getPropertyPath().toString()).toList();
	}

}
