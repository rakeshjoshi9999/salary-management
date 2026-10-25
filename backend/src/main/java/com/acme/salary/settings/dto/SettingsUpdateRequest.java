package com.acme.salary.settings.dto;

public record SettingsUpdateRequest(String defaultCountryCode, Long version) {
}
