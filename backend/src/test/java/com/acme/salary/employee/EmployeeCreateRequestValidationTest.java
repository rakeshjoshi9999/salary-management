package com.acme.salary.employee;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Set;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import jakarta.validation.constraints.Size;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import com.acme.salary.employee.dto.EmployeeCreateRequest;
import com.acme.salary.reference.TestReferenceData;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Every field rule on the create request (ADR-010, ADR-014, ADR-037), through plain Hibernate Validator:
 * no Spring, the V2 reference rows in memory, and "today" fixed at 2026-10-25 UTC.
 */
class EmployeeCreateRequestValidationTest {

	private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-25T12:00:00Z"), ZoneOffset.UTC);

	private final Validator validator = TestValidators.validator(TestReferenceData.v2(), CLOCK);

	@Test
	void acceptsValidRequest() {
		assertThat(validate(Requests.valid())).isEmpty();
	}

	@ParameterizedTest
	@ValueSource(strings = { "fullName", "email", "jobTitle", "department", "countryCode", "salary", "hireDate" })
	void rejectsMissingRequiredField(String field) {
		assertThat(fieldsOf(validate(Requests.valid().with(field, null)))).containsExactly(field);
	}

	@ParameterizedTest
	@ValueSource(strings = { "fullName", "email", "jobTitle", "department" })
	void rejectsBlankText(String field) {
		assertThat(fieldsOf(validate(Requests.valid().with(field, "")))).containsExactly(field);
	}

	@ParameterizedTest
	@CsvSource({ "fullName, 200", "email, 254", "jobTitle, 100", "department, 100" })
	void rejectsTextOverMaxLength(String field, int max) {
		Set<ConstraintViolation<EmployeeCreateRequest>> violations = validate(
				Requests.valid().with(field, textOfLength(field, max + 1)));

		assertThat(violations).filteredOn(v -> v.getConstraintDescriptor().getAnnotation() instanceof Size)
			.extracting(v -> v.getPropertyPath().toString())
			.containsExactly(field);
	}

	/**
	 * A title or department of full length cannot also be a supported value, so for those two the test
	 * proves only that the length limit itself does not fire.
	 */
	@ParameterizedTest
	@CsvSource({ "fullName, 200, true", "email, 254, true", "jobTitle, 100, false", "department, 100, false" })
	void acceptsTextAtMaxLength(String field, int max, boolean otherwiseValid) {
		Set<ConstraintViolation<EmployeeCreateRequest>> violations = validate(
				Requests.valid().with(field, textOfLength(field, max)));

		assertThat(violations).filteredOn(v -> v.getConstraintDescriptor().getAnnotation() instanceof Size)
			.isEmpty();
		if (otherwiseValid) {
			assertThat(violations).isEmpty();
		}
	}

	@ParameterizedTest
	@ValueSource(strings = { "asha", "asha@", "@acme.com", "asha@acmecom" })
	void rejectsMalformedEmail(String email) {
		assertThat(fieldsOf(validate(Requests.valid().with("email", email)))).containsExactly("email");
	}

	@Test
	void rejectsSalaryOfZero() {
		assertThat(fieldsOf(validate(Requests.valid().with("salary", new BigDecimal("0.00")))))
			.containsExactly("salary");
	}

	@Test
	void rejectsNegativeSalary() {
		assertThat(fieldsOf(validate(Requests.valid().with("salary", new BigDecimal("-1.00")))))
			.containsExactly("salary");
	}

	@Test
	void rejectsSalaryWithMoreThanTwoDecimals() {
		assertThat(fieldsOf(validate(Requests.valid().with("salary", new BigDecimal("100.001")))))
			.containsExactly("salary");
	}

	@Test
	void acceptsSalaryWithTrailingZerosBeyondTwoDecimals() {
		assertThat(validate(Requests.valid().with("salary", new BigDecimal("100.000")))).isEmpty();
	}

	@Test
	void rejectsSalaryOverTwelveIntegerDigits() {
		assertThat(fieldsOf(validate(Requests.valid().with("salary", new BigDecimal("1000000000000.00")))))
			.containsExactly("salary");
	}

	@Test
	void acceptsMaximumSalary() {
		assertThat(validate(Requests.valid().with("salary", new BigDecimal("999999999999.99")))).isEmpty();
	}

	@Test
	void rejectsHireDateAfterToday() {
		assertThat(fieldsOf(validate(Requests.valid().with("hireDate", LocalDate.of(2026, 10, 26)))))
			.containsExactly("hireDate");
	}

	@Test
	void acceptsHireDateOfToday() {
		assertThat(validate(Requests.valid().with("hireDate", LocalDate.of(2026, 10, 25)))).isEmpty();
	}

	@Test
	void rejectsHireDateBefore1950() {
		assertThat(fieldsOf(validate(Requests.valid().with("hireDate", LocalDate.of(1949, 12, 31)))))
			.containsExactly("hireDate");
	}

	@Test
	void acceptsHireDateOnFirstOf1950() {
		assertThat(validate(Requests.valid().with("hireDate", LocalDate.of(1950, 1, 1)))).isEmpty();
	}

	@Test
	void rejectsUnsupportedCountry() {
		assertThat(fieldsOf(validate(Requests.valid().with("countryCode", "JP")))).containsExactly("countryCode");
	}

	@Test
	void rejectsLowercaseCountryCode() {
		assertThat(fieldsOf(validate(Requests.valid().with("countryCode", "in")))).containsExactly("countryCode");
	}

	@Test
	void rejectsUnknownDepartment() {
		assertThat(fieldsOf(validate(Requests.valid().with("department", "Legal")))).containsExactly("department");
	}

	@Test
	void rejectsUnknownJobTitle() {
		assertThat(fieldsOf(validate(Requests.valid().with("jobTitle", "Astronaut")))).containsExactly("jobTitle");
	}

	@Test
	void rejectsTitleFromAnotherDepartment() {
		Requests request = Requests.valid().with("department", "Engineering").with("jobTitle", "Recruiter");

		assertThat(fieldsOf(validate(request))).containsExactly("jobTitle");
	}

	@Test
	void reportsEveryInvalidFieldAtOnce() {
		Requests request = Requests.valid()
			.with("salary", new BigDecimal("0.00"))
			.with("countryCode", "JP")
			.with("hireDate", LocalDate.of(2026, 10, 26));

		Set<ConstraintViolation<EmployeeCreateRequest>> violations = validate(request);

		assertThat(violations).hasSize(3);
		assertThat(fieldsOf(violations)).containsExactlyInAnyOrder("salary", "countryCode", "hireDate");
	}

	@Test
	void flagsOnlyDepartmentWhenDepartmentIsUnknown() {
		Requests request = Requests.valid().with("department", "Legal").with("jobTitle", "Recruiter");

		Set<ConstraintViolation<EmployeeCreateRequest>> violations = validate(request);

		assertThat(violations).singleElement()
			.extracting(v -> v.getPropertyPath().toString())
			.isEqualTo("department");
	}

	@Test
	void reportsOneErrorPerField() {
		Set<ConstraintViolation<EmployeeCreateRequest>> violations = validate(
				Requests.valid().with("countryCode", "in"));

		assertThat(violations).singleElement()
			.extracting(v -> v.getPropertyPath().toString())
			.isEqualTo("countryCode");
	}

	private Set<ConstraintViolation<EmployeeCreateRequest>> validate(Requests request) {
		return validator.validate(request.build());
	}

	/** One entry per violation, so {@code containsExactly(field)} also proves a field fails only once. */
	private static List<String> fieldsOf(Set<ConstraintViolation<EmployeeCreateRequest>> violations) {
		return violations.stream().map(v -> v.getPropertyPath().toString()).toList();
	}

	/**
	 * Text of exactly {@code length} characters that breaks no rule but its length. An email keeps
	 * its local part at 64 and every domain label at 63 or less, the RFC limits @Email checks.
	 */
	private static String textOfLength(String field, int length) {
		if (!field.equals("email")) {
			return "a".repeat(length);
		}
		String fixed = "a".repeat(64) + "@" + "b".repeat(63) + "." + "c".repeat(63) + ".";
		return fixed + "d".repeat(length - fixed.length() - ".com".length()) + ".com";
	}

}
