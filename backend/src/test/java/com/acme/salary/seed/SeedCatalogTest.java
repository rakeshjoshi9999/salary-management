package com.acme.salary.seed;

import java.util.Map;
import java.util.stream.Collectors;

import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.simple.JdbcClient;

import com.acme.salary.AbstractIntegrationTest;
import com.acme.salary.seed.SeedCatalog.CountryPlan;
import com.acme.salary.seed.SeedCatalog.Title;

import static org.assertj.core.api.Assertions.assertThat;

/** The seed's own catalog must match the reference rows from V2, or its inserts fail the foreign keys. */
class SeedCatalogTest extends AbstractIntegrationTest {

	@Autowired
	private JdbcClient jdbc;

	@Test
	void catalogMatchesReferenceData() {
		Map<String, String> dbTitles = jdbc.sql("select name, department from job_title")
			.query((rs, n) -> Map.entry(rs.getString("name"), rs.getString("department")))
			.list()
			.stream()
			.collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
		Map<String, String> seedTitles = SeedCatalog.titles()
			.stream()
			.collect(Collectors.toMap(Title::name, Title::department));

		assertThat(seedTitles).containsExactlyInAnyOrderEntriesOf(dbTitles);
		assertThat(SeedCatalog.countries().stream().map(CountryPlan::code))
			.containsExactlyInAnyOrderElementsOf(jdbc.sql("select code from country").query(String.class).list());
		assertThat(seedTitles.values().stream().distinct())
			.containsExactlyInAnyOrderElementsOf(jdbc.sql("select name from department").query(String.class).list());
	}

}
