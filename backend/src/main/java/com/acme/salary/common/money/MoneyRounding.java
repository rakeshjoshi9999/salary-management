package com.acme.salary.common.money;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** The one place money gets its scale (ADR-021): 2 decimals, HALF_EVEN. */
public final class MoneyRounding {

	private MoneyRounding() {
	}

	/**
	 * Returns the amount with exactly 2 decimals. A value already validated to at most 2 decimals keeps
	 * its value and gains only scale; computed values (averages, the median) are the ones rounded.
	 */
	public static BigDecimal toMoney(BigDecimal amount) {
		return amount == null ? null : amount.setScale(2, RoundingMode.HALF_EVEN);
	}

}
