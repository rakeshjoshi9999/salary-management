package com.acme.salary.settings.dto;

/** The {@code Settings} schema in openapi.yaml (ADR-028). */
public record SettingsResponse(String defaultCountryCode, long version) {
}
