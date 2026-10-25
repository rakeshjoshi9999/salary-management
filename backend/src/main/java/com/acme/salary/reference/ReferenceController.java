package com.acme.salary.reference;

import java.time.Duration;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.acme.salary.reference.dto.ReferenceData;

@RestController
@RequestMapping("/api/v1/reference")
class ReferenceController {

	/** Reference data changes only by migration, which means a redeploy (ADR-017). */
	private static final CacheControl ONE_HOUR = CacheControl.maxAge(Duration.ofHours(1)).cachePublic();

	private final ReferenceService reference;

	ReferenceController(ReferenceService reference) {
		this.reference = reference;
	}

	@GetMapping
	ResponseEntity<ReferenceData> referenceData() {
		return ResponseEntity.ok().cacheControl(ONE_HOUR).body(reference.referenceData());
	}

}
