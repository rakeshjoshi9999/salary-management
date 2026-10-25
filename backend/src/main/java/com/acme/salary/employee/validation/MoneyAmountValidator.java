package com.acme.salary.employee.validation;

import java.math.BigDecimal;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public final class MoneyAmountValidator implements ConstraintValidator<MoneyAmount, BigDecimal> {

	private static final int MAX_INTEGER_DIGITS = 12;

	private static final int MAX_DECIMALS = 2;

	@Override
	public boolean isValid(BigDecimal amount, ConstraintValidatorContext context) {
		if (amount == null) {
			return true;
		}
		BigDecimal value = amount.stripTrailingZeros();
		int decimals = Math.max(value.scale(), 0);
		int integerDigits = value.precision() - value.scale();
		return decimals <= MAX_DECIMALS && integerDigits <= MAX_INTEGER_DIGITS;
	}

}
