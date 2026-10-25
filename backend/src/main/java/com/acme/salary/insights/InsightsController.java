package com.acme.salary.insights;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.acme.salary.insights.dto.CountryInsights;

@RestController
@RequestMapping("/api/v1/insights")
class InsightsController {

	private final InsightsService service;

	InsightsController(InsightsService service) {
		this.service = service;
	}

	@GetMapping("/countries/{countryCode}")
	CountryInsights forCountry(@PathVariable String countryCode) {
		return service.forCountry(countryCode);
	}

}
