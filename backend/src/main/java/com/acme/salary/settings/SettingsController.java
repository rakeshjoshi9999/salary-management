package com.acme.salary.settings;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.acme.salary.settings.dto.SettingsResponse;
import com.acme.salary.settings.dto.SettingsUpdateRequest;

@RestController
@RequestMapping("/api/v1/settings")
class SettingsController {

	private final SettingsService service;

	SettingsController(SettingsService service) {
		this.service = service;
	}

	@GetMapping
	SettingsResponse get() {
		return service.get();
	}

	@PutMapping
	SettingsResponse update(@Valid @RequestBody SettingsUpdateRequest request) {
		return service.update(request);
	}

}
