package com.acme.salary.reference;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.acme.salary.reference.dto.ReferenceData;

/**
 * Supported countries, departments and titles, read once at startup and held in memory (ADR-026).
 * Safe because reference data changes only by migration, which means a redeploy and a restart.
 */
@Service
public class ReferenceService {

	private final Map<String, Country> countries;

	private final Set<String> departments;

	private final Map<String, String> departmentByTitle;

	private final ReferenceData referenceData;

	ReferenceService(List<Country> countries, List<String> departments, List<JobTitle> jobTitles) {
		this.countries = countries.stream().collect(Collectors.toUnmodifiableMap(Country::code, Function.identity()));
		this.departments = Set.copyOf(departments);
		this.departmentByTitle = jobTitles.stream()
			.collect(Collectors.toUnmodifiableMap(JobTitle::name, JobTitle::department));
		this.referenceData = sorted(countries, departments, jobTitles);
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

	/** The dropdown data: countries by name, departments by name, titles by name within each (5.5). */
	public ReferenceData referenceData() {
		return referenceData;
	}

	private static ReferenceData sorted(List<Country> countries, List<String> departments, List<JobTitle> jobTitles) {
		List<ReferenceData.CountryItem> countryItems = countries.stream()
			.sorted(Comparator.comparing(Country::name))
			.map(c -> new ReferenceData.CountryItem(c.code(), c.name(), c.currency()))
			.toList();
		List<ReferenceData.DepartmentItem> departmentItems = departments.stream()
			.sorted()
			.map(department -> new ReferenceData.DepartmentItem(department,
					jobTitles.stream()
						.filter(title -> title.department().equals(department))
						.map(JobTitle::name)
						.sorted()
						.toList()))
			.toList();
		return new ReferenceData(countryItems, departmentItems);
	}

}
