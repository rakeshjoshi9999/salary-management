package com.acme.salary.reference;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * Supported countries, departments and titles, read once at startup and held in memory (ADR-026).
 * Safe because reference data changes only by migration, which means a redeploy and a restart.
 */
@Service
public class ReferenceService {

	private final Map<String, Country> countries;

	private final Set<String> departments;

	private final Map<String, String> departmentByTitle;

	ReferenceService(List<Country> countries, List<String> departments, List<JobTitle> jobTitles) {
		this.countries = countries.stream().collect(Collectors.toUnmodifiableMap(Country::code, Function.identity()));
		this.departments = Set.copyOf(departments);
		this.departmentByTitle = jobTitles.stream()
			.collect(Collectors.toUnmodifiableMap(JobTitle::name, JobTitle::department));
	}

	@Autowired
	ReferenceService(ReferenceRepository repository) {
		this(repository.countries(), repository.departments(), repository.jobTitles());
	}

	public Optional<String> currencyOf(String countryCode) {
		return Optional.ofNullable(countries.get(countryCode)).map(Country::currency);
	}

	public boolean isSupportedCountry(String countryCode) {
		return countries.containsKey(countryCode);
	}

	public boolean isDepartment(String name) {
		return departments.contains(name);
	}

	public Optional<String> departmentOf(String jobTitle) {
		return Optional.ofNullable(departmentByTitle.get(jobTitle));
	}

}
