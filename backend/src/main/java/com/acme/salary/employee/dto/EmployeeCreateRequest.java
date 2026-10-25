package com.acme.salary.employee.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import com.acme.salary.employee.validation.JobAssignment;
import com.acme.salary.employee.validation.MoneyAmount;
import com.acme.salary.employee.validation.NotBefore;
import com.acme.salary.employee.validation.SupportedCountry;
import com.acme.salary.employee.validation.TitleInDepartment;

/**
 * Body of POST /api/v1/employees ({@code EmployeeCreateRequest} in openapi.yaml). By the time it is
 * validated, strings are trimmed and unknown fields are already rejected (JacksonConfig, ADR-037).
 * The email pattern adds "a dot in the domain" to what {@code @Email} checks; it accepts the empty
 * string so that a blank email gets one error, from {@code @NotBlank}.
 */
@TitleInDepartment
public record EmployeeCreateRequest(
		@NotBlank @Size(max = 200) String fullName,
		@NotBlank @Size(max = 254)
		@Email(regexp = "([^@]+@[^@]+\\.[^@]+)?", message = "must be a valid email address") String email,
		@NotBlank @Size(max = 100) String jobTitle,
		@NotBlank @Size(max = 100) String department,
		@NotBlank @Pattern(regexp = SupportedCountry.FORMAT, message = "must be two uppercase letters")
		@SupportedCountry String countryCode,
		@NotNull @Positive @MoneyAmount BigDecimal salary,
		@NotNull @PastOrPresent @NotBefore("1950-01-01") LocalDate hireDate) implements JobAssignment {
}
