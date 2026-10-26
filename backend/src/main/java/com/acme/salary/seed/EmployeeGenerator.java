package com.acme.salary.seed;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Random;

import net.datafaker.Faker;

import org.springframework.stereotype.Component;

import com.acme.salary.seed.SeedCatalog.Band;
import com.acme.salary.seed.SeedCatalog.CountryPlan;
import com.acme.salary.seed.SeedCatalog.Title;

/**
 * Generates the seed employees from a fixed random seed (ADR-049). Everything comes from one
 * {@link Random}, and only through {@code nextInt(bound)} and {@code nextLong()}, whose algorithms the JDK
 * specifies, so the same seed gives the same people on every JDK. Names depend on the pinned Datafaker
 * version as well.
 */
@Component
class EmployeeGenerator {

	static final long DEFAULT_SEED = 20261026L;

	List<SeedEmployee> generate(long seed) {
		Random random = new Random(seed);
		List<Title> titles = SeedCatalog.titles();
		int totalWeight = titles.stream().mapToInt(Title::weight).sum();
		int hireDays = (int) (SeedCatalog.LAST_HIRE.toEpochDay() - SeedCatalog.FIRST_HIRE.toEpochDay()) + 1;
		List<SeedEmployee> employees = new ArrayList<>();
		for (CountryPlan country : SeedCatalog.countries()) {
			Faker faker = new Faker(country.locale(), new Random(random.nextLong()));
			for (int i = 0; i < country.headcount(); i++) {
				String first = faker.name().firstName().strip();
				String last = faker.name().lastName().strip();
				Title title = pick(titles, totalWeight, random);
				employees.add(new SeedEmployee(first + " " + last, email(first, last, employees.size() + 1),
						title.name(), title.department(), country.code(),
						salary(country.bands().get(title.level()), country.roundingStep(), random),
						SeedCatalog.FIRST_HIRE.plusDays(random.nextInt(hireDays))));
			}
		}
		return List.copyOf(employees);
	}

	private static Title pick(List<Title> titles, int totalWeight, Random random) {
		int ticket = random.nextInt(totalWeight);
		for (Title title : titles) {
			ticket -= title.weight();
			if (ticket < 0) {
				return title;
			}
		}
		throw new IllegalStateException("weights do not add up");
	}

	/** A whole number of rounding steps inside the band, so the salary is a round figure. */
	private static BigDecimal salary(Band band, long step, Random random) {
		long lowest = Math.ceilDiv(band.min(), step);
		long highest = Math.floorDiv(band.max(), step);
		long steps = lowest + random.nextInt((int) (highest - lowest + 1));
		return BigDecimal.valueOf(steps * step).setScale(2);
	}

	/** {@code first.last.00042@acme.example}: the number is the position in the seed, so emails never clash. */
	private static String email(String first, String last, int number) {
		return "%s.%s.%05d@%s".formatted(ascii(first), ascii(last), number, SeedCatalog.EMAIL_DOMAIN);
	}

	/** Müller → muller, O'Brien → obrien. */
	private static String ascii(String name) {
		String letters = Normalizer.normalize(name, Normalizer.Form.NFD)
			.replace("ß", "ss")
			.toLowerCase(Locale.ROOT)
			.replaceAll("[^a-z]", "");
		return letters.isEmpty() ? "x" : letters;
	}

}
