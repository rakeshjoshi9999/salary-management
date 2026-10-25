package com.acme.salary.settings.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;

import com.acme.salary.reference.validation.SupportedCountry;

/**
 * Body of PUT /api/v1/settings ({@code SettingsUpdateRequest} in openapi.yaml). Unknown fields are
 * rejected by the Jackson configuration (ADR-037).
 */
public record SettingsUpdateRequest(
		@NotBlank @Pattern(regexp = SupportedCountry.FORMAT, message = "must be two uppercase letters")
		@SupportedCountry String defaultCountryCode,
		@NotNull @PositiveOrZero Long version) {
}
