package com.acme.salary.reference;

import java.util.List;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Plain reads of the three reference tables (ADR-037). Only migrations ever write them. */
@Repository
class ReferenceRepository {

	private final JdbcClient jdbc;

	ReferenceRepository(JdbcClient jdbc) {
		this.jdbc = jdbc;
	}

	List<Country> countries() {
		return jdbc.sql("select code, name, currency_code as currency from country order by name")
			.query(Country.class)
			.list();
	}

	List<String> departments() {
		return jdbc.sql("select name from department order by name").query(String.class).list();
	}

	List<JobTitle> jobTitles() {
		return jdbc.sql("select name, department from job_title order by department, name")
			.query(JobTitle.class)
			.list();
	}

}
