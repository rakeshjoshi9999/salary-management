package com.acme.salary.reference;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

@Service
public class ReferenceService {

	ReferenceService(List<Country> countries, List<String> departments, List<JobTitle> jobTitles) {
	}

	@Autowired
	ReferenceService(JdbcClient jdbc) {
		this(List.of(), List.of(), List.of());
	}

	public Optional<String> currencyOf(String countryCode) {
		return Optional.empty();
	}

	public boolean isSupportedCountry(String countryCode) {
		return false;
	}

	public boolean isDepartment(String name) {
		return false;
	}

	public Optional<String> departmentOf(String jobTitle) {
		return Optional.empty();
	}

}
