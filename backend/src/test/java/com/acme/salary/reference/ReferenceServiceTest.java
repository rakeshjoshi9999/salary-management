package com.acme.salary.reference;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import org.springframework.beans.factory.annotation.Autowired;

import com.acme.salary.AbstractIntegrationTest;

import static org.assertj.core.api.Assertions.assertThat;

/** The real service, loaded at startup from the rows V2 seeds. */
class ReferenceServiceTest extends AbstractIntegrationTest {

	@Autowired
	private ReferenceService reference;

	@ParameterizedTest
	@CsvSource({ "IN, INR", "DE, EUR", "FR, EUR" })
	void derivesCurrencyOfSupportedCountry(String country, String currency) {
		assertThat(reference.isSupportedCountry(country)).isTrue();
		assertThat(reference.currencyOf(country)).contains(currency);
	}

	@Test
	void doesNotSupportUnknownCountry() {
		assertThat(reference.isSupportedCountry("JP")).isFalse();
		assertThat(reference.currencyOf("JP")).isEmpty();
	}

	@Test
	void knowsEachTitlesDepartment() {
		assertThat(reference.departmentOf("Recruiter")).contains("Human Resources");
		assertThat(reference.isDepartment("Human Resources")).isTrue();
	}

}
