package com.acme.salary.employee.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import com.acme.salary.employee.validation.JobAssignment;
import com.acme.salary.employee.validation.MoneyAmount;
import com.acme.salary.employee.validation.NotBefore;
import com.acme.salary.employee.validation.TitleInDepartment;
import com.acme.salary.reference.validation.SupportedCountry;

/**
 * Body of PUT /api/v1/employees/{id} ({@code EmployeeUpdateRequest} in openapi.yaml): every field of
 * {@link EmployeeCreateRequest}, with the same rules repeated (ADR-041), plus the version the client
 * last saw. EmployeeUpdateRequestValidationTest fails if the two drift apart.
 */
@TitleInDepartment
public record EmployeeUpdateRequest(
		@NotBlank @Size(max = 200) String fullName,
		@NotBlank @Size(max = 254)
		@Email(regexp = "([^@]+@[^@]+\\.[^@]+)?", message = "must be a valid email address") String email,
		@NotBlank @Size(max = 100) String jobTitle,
		@NotBlank @Size(max = 100) String department,
		@NotBlank @Pattern(regexp = SupportedCountry.FORMAT, message = "must be two uppercase letters")
		@SupportedCountry String countryCode,
		@NotNull @Positive @MoneyAmount BigDecimal salary,
		@NotNull @PastOrPresent @NotBefore("1950-01-01") LocalDate hireDate,
		@NotNull @PositiveOrZero Long version) implements JobAssignment {
}
