package com.acme.salary.seed;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** What the seed generates (ADR-049). Stub: filled in by the implementation step. */
final class SeedCatalog {

	static final String EMAIL_DOMAIN = "acme.example";

	static final LocalDate FIRST_HIRE = LocalDate.of(2010, 1, 1);

	static final LocalDate LAST_HIRE = LocalDate.of(2026, 9, 30);

	enum Level {

		JUNIOR, MID, SENIOR, MANAGER

	}

	record Title(String name, String department, Level level, int weight) {
	}

	record Band(long min, long max) {
	}

	record CountryPlan(String code, Locale locale, int headcount, long roundingStep, Map<Level, Band> bands) {
	}

	private SeedCatalog() {
	}

	static List<Title> titles() {
		return List.of();
	}

	static List<CountryPlan> countries() {
		return List.of();
	}

}
