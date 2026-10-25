package com.acme.salary.insights;

import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.acme.salary.common.money.MoneyRounding;
import com.acme.salary.insights.dto.CountryInsights;
import com.acme.salary.insights.dto.SalaryStats;
import com.acme.salary.insights.dto.TitleAverage;
import com.acme.salary.reference.ReferenceService;

@Service
public class InsightsService {

	/**
	 * The contract's order is by the average the client sees, so the (at most 18) titles are sorted after
	 * rounding: two averages shown as 200.00 then fall back to the title.
	 */
	private static final Comparator<TitleAverage> BY_SHOWN_AVERAGE = Comparator
		.comparing(TitleAverage::average, Comparator.reverseOrder())
		.thenComparing(TitleAverage::jobTitle);

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
		List<TitleAverage> byTitle = insights.averageByTitle(countryCode)
			.stream()
			.map(t -> new TitleAverage(t.jobTitle(), t.department(), t.headcount(), MoneyRounding.toMoney(t.average())))
			.sorted(BY_SHOWN_AVERAGE)
			.toList();
		return new CountryInsights(countryCode, currency, salary, byTitle, insights.headcountByDepartment(countryCode));
	}

}
