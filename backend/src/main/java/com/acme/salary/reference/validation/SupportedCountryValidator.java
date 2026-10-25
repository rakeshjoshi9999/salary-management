package com.acme.salary.reference.validation;

import java.util.regex.Pattern;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import com.acme.salary.reference.ReferenceService;

public final class SupportedCountryValidator implements ConstraintValidator<SupportedCountry, String> {

	private static final Pattern COUNTRY_CODE = Pattern.compile(SupportedCountry.FORMAT);

	private final ReferenceService reference;

	public SupportedCountryValidator(ReferenceService reference) {
		this.reference = reference;
	}

	@Override
	public boolean isValid(String code, ConstraintValidatorContext context) {
		if (code == null || !COUNTRY_CODE.matcher(code).matches()) {
			return true;
		}
		return reference.isSupportedCountry(code);
	}

}
