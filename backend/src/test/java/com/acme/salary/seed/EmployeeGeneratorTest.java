package com.acme.salary.seed;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.junit.jupiter.api.Test;

import com.acme.salary.seed.SeedCatalog.CountryPlan;
import com.acme.salary.seed.SeedCatalog.Level;
import com.acme.salary.seed.SeedCatalog.Title;

import static org.assertj.core.api.Assertions.assertThat;

/** The seed generator alone, no database (task 6.1, ADR-049). */
class EmployeeGeneratorTest {

	private static List<SeedEmployee> employees;

	/** Generated once for the class: every test reads the same 10,000 rows. */
	private static List<SeedEmployee> employees() {
		if (employees == null) {
			employees = new EmployeeGenerator().generate(EmployeeGenerator.DEFAULT_SEED);
		}
		return employees;
	}

	private static Map<String, Title> titlesByName() {
		return SeedCatalog.titles().stream().collect(Collectors.toMap(Title::name, Function.identity()));
	}

	@Test
	void generatesExactly10000Employees() {
		assertThat(employees()).hasSize(10_000);
	}

	@Test
	void sameSeedGivesSameEmployees() {
		List<SeedEmployee> again = new EmployeeGenerator().generate(EmployeeGenerator.DEFAULT_SEED);

		assertThat(again).isEqualTo(employees());
	}

	@Test
	void differentSeedGivesDifferentEmployees() {
		List<SeedEmployee> other = new EmployeeGenerator().generate(EmployeeGenerator.DEFAULT_SEED + 1);

		assertThat(other).isNotEqualTo(employees());
	}

	/**
	 * Pins the output of this Datafaker version (ADR-049). An upgrade that changes the names fails here, so
	 * the change to the seed is a decision, not an accident. Values captured from the first green run.
	 */
	@Test
	void matchesGoldenSample() throws Exception {
		MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
		employees().forEach(e -> sha256.update((e + "\n").getBytes(StandardCharsets.UTF_8)));

		assertThat(employees().subList(0, 3)).containsExactly(GOLDEN_FIRST_THREE.toArray(SeedEmployee[]::new));
		assertThat(HexFormat.of().formatHex(sha256.digest())).isEqualTo(GOLDEN_SHA256);
	}

	private static final List<SeedEmployee> GOLDEN_FIRST_THREE = List.of();

	private static final String GOLDEN_SHA256 = "not captured yet";

	@Test
	void splitsCountriesByFixedCounts() {
		Map<String, Long> byCountry = employees().stream()
			.collect(Collectors.groupingBy(SeedEmployee::countryCode, Collectors.counting()));

		assertThat(byCountry).containsExactlyInAnyOrderEntriesOf(
				Map.of("IN", 3_500L, "US", 2_500L, "GB", 1_500L, "DE", 1_500L, "FR", 1_000L));
	}

	@Test
	void everyTitleAppearsInEveryCountry() {
		Map<String, Set<String>> titlesByCountry = employees().stream()
			.collect(Collectors.groupingBy(SeedEmployee::countryCode,
					Collectors.mapping(SeedEmployee::jobTitle, Collectors.toSet())));

		assertThat(titlesByCountry).hasSize(5);
		titlesByCountry.forEach((country, titles) -> assertThat(titles).as(country).hasSize(18));
	}

	@Test
	void titleBelongsToItsDepartment() {
		Map<String, Title> titles = titlesByName();

		assertThat(employees()).allSatisfy(e -> {
			assertThat(titles).containsKey(e.jobTitle());
			assertThat(e.department()).isEqualTo(titles.get(e.jobTitle()).department());
		});
	}

	@Test
	void salaryInsideCountryBandForTitleLevel() {
		Map<String, Title> titles = titlesByName();
		Map<String, CountryPlan> countries = SeedCatalog.countries()
			.stream()
			.collect(Collectors.toMap(CountryPlan::code, Function.identity()));

		assertThat(employees()).allSatisfy(e -> {
			SeedCatalog.Band band = countries.get(e.countryCode()).bands().get(titles.get(e.jobTitle()).level());
			BigDecimal step = BigDecimal.valueOf(e.countryCode().equals("IN") ? 1_000 : 100);

			assertThat(e.salary().scale()).isEqualTo(2);
			assertThat(e.salary()).isPositive()
				.isBetween(BigDecimal.valueOf(band.min()), BigDecimal.valueOf(band.max()));
			assertThat(e.salary().remainder(step)).isEqualByComparingTo("0");
		});
	}

	@Test
	void hireDatesInsideFixedWindow() {
		assertThat(employees()).allSatisfy(e -> assertThat(e.hireDate()).isBetween(LocalDate.of(2010, 1, 1),
				LocalDate.of(2026, 9, 30)));
	}

	@Test
	void emailsAreUniqueLowercaseAsciiOnSeedDomain() {
		assertThat(employees()).allSatisfy(
				e -> assertThat(e.email()).matches("[a-z]+\\.[a-z]+\\.\\d{5}@acme\\.example"));
		assertThat(employees().stream().map(e -> e.email().toLowerCase()).distinct()).hasSize(10_000);
		assertThat(employees().get(41).email()).endsWith(".00042@acme.example");
	}

	@Test
	void namesAreNotBlankAndFitColumn() {
		assertThat(employees()).allSatisfy(e -> {
			assertThat(e.fullName()).isNotBlank().hasSizeLessThanOrEqualTo(200).contains(" ");
			assertThat(e.fullName()).isEqualTo(e.fullName().strip());
		});
	}

	@Test
	void juniorsOutnumberManagersInEveryCountry() {
		Map<String, Title> titles = titlesByName();
		Map<String, Map<Level, Long>> levels = employees().stream()
			.collect(Collectors.groupingBy(SeedEmployee::countryCode,
					Collectors.groupingBy(e -> titles.get(e.jobTitle()).level(), Collectors.counting())));

		assertThat(levels).hasSize(5);
		levels.forEach((country, counts) -> assertThat(counts.get(Level.JUNIOR)).as(country)
			.isGreaterThan(counts.get(Level.MANAGER)));
	}

}
