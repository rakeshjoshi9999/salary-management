package com.acme.salary.employee.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import com.acme.salary.reference.ReferenceService;

public final class KnownJobTitleValidator implements ConstraintValidator<KnownJobTitle, String> {

	private final ReferenceService reference;

	public KnownJobTitleValidator(ReferenceService reference) {
		this.reference = reference;
	}

	@Override
	public boolean isValid(String jobTitle, ConstraintValidatorContext context) {
		return jobTitle == null || reference.departmentOf(jobTitle).isPresent();
	}

}
