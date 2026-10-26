package com.acme.salary.seed;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * What the seed generates (ADR-049): the 18 titles with a level and a weight, and per country a headcount,
 * a name locale and a salary band per level in local currency. {@code SeedCatalogTest} keeps the titles and
 * countries equal to the reference rows from V2.
 */
final class SeedCatalog {

	/** Reserved for examples (RFC 6761), so no seeded address can reach a real person. */
	static final String EMAIL_DOMAIN = "acme.example";

	static final LocalDate FIRST_HIRE = LocalDate.of(2010, 1, 1);

	static final LocalDate LAST_HIRE = LocalDate.of(2026, 9, 30);

	enum Level {

		JUNIOR, MID, SENIOR, MANAGER

	}

	/** A title; {@code weight} sets how often it is picked relative to the others. */
	record Title(String name, String department, Level level, int weight) {
	}

	/** An inclusive salary range in the country's currency. */
	record Band(long min, long max) {
	}

	record CountryPlan(String code, Locale locale, int headcount, long roundingStep, Map<Level, Band> bands) {
	}

	private static final List<Title> TITLES = List.of(
			new Title("Software Engineer", "Engineering", Level.MID, 20),
			new Title("Senior Software Engineer", "Engineering", Level.SENIOR, 10),
			new Title("QA Engineer", "Engineering", Level.JUNIOR, 6),
			new Title("Engineering Manager", "Engineering", Level.MANAGER, 3),
			new Title("Sales Representative", "Sales", Level.JUNIOR, 10),
			new Title("Account Executive", "Sales", Level.MID, 6),
			new Title("Sales Manager", "Sales", Level.MANAGER, 2),
			new Title("Marketing Specialist", "Marketing", Level.JUNIOR, 5),
			new Title("Content Strategist", "Marketing", Level.JUNIOR, 3),
			new Title("Marketing Manager", "Marketing", Level.MANAGER, 2),
			new Title("Accountant", "Finance", Level.JUNIOR, 5),
			new Title("Financial Analyst", "Finance", Level.MID, 4),
			new Title("Finance Manager", "Finance", Level.MANAGER, 2),
			new Title("HR Generalist", "Human Resources", Level.JUNIOR, 3),
			new Title("Recruiter", "Human Resources", Level.JUNIOR, 3),
			new Title("HR Manager", "Human Resources", Level.MANAGER, 1),
			new Title("Operations Analyst", "Operations", Level.JUNIOR, 5),
			new Title("Operations Manager", "Operations", Level.MANAGER, 2));

	/** In generation order: the order fixes which email number each employee gets. */
	private static final List<CountryPlan> COUNTRIES = List.of(
			new CountryPlan("IN", Locale.of("en", "IN"), 3_500, 1_000,
					bands(400_000, 900_000, 900_000, 2_000_000, 2_000_000, 3_500_000, 2_500_000, 5_000_000)),
			new CountryPlan("US", Locale.of("en", "US"), 2_500, 100,
					bands(50_000, 75_000, 75_000, 120_000, 120_000, 170_000, 130_000, 200_000)),
			new CountryPlan("GB", Locale.of("en", "GB"), 1_500, 100,
					bands(28_000, 40_000, 40_000, 65_000, 65_000, 95_000, 70_000, 110_000)),
			new CountryPlan("DE", Locale.of("de", "DE"), 1_500, 100,
					bands(42_000, 55_000, 55_000, 75_000, 75_000, 100_000, 85_000, 130_000)),
			new CountryPlan("FR", Locale.of("fr", "FR"), 1_000, 100,
					bands(35_000, 45_000, 45_000, 62_000, 62_000, 85_000, 70_000, 110_000)));

	private SeedCatalog() {
	}

	static List<Title> titles() {
		return TITLES;
	}

	static List<CountryPlan> countries() {
		return COUNTRIES;
	}

	private static Map<Level, Band> bands(long juniorMin, long juniorMax, long midMin, long midMax, long seniorMin,
			long seniorMax, long managerMin, long managerMax) {
		return Map.of(Level.JUNIOR, new Band(juniorMin, juniorMax), Level.MID, new Band(midMin, midMax), Level.SENIOR,
				new Band(seniorMin, seniorMax), Level.MANAGER, new Band(managerMin, managerMax));
	}

}
