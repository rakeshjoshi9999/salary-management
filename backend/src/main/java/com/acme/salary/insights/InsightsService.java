package com.acme.salary.insights;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.acme.salary.common.money.MoneyRounding;
import com.acme.salary.insights.dto.CountryInsights;
import com.acme.salary.insights.dto.SalaryStats;
import com.acme.salary.reference.ReferenceService;

@Service
public class InsightsService {

	private final InsightsRepository insights;

	private final ReferenceService reference;

	InsightsService(InsightsRepository insights, ReferenceService reference) {
		this.insights = insights;
		this.reference = reference;
	}

	/**
	 * Everything the dashboard shows for one country, read in one read-only transaction (ADR-017). The
	 * code must be exactly a supported one, so lowercase is a 404 too. Money is rounded here, once, to
	 * 2 decimals HALF_EVEN (ADR-021).
	 */
	@Transactional(readOnly = true)
	public CountryInsights forCountry(String countryCode) {
		String currency = reference.currencyOf(countryCode).orElseThrow(() -> new CountryNotFoundException(countryCode));
		InsightsRepository.RawStats raw = insights.salaryStats(countryCode);
		SalaryStats salary = new SalaryStats(raw.headcount(), MoneyRounding.toMoney(raw.min()),
				MoneyRounding.toMoney(raw.max()), MoneyRounding.toMoney(raw.average()),
				MoneyRounding.toMoney(raw.median()));
		return new CountryInsights(countryCode, currency, salary, List.of(), List.of());
	}

}
