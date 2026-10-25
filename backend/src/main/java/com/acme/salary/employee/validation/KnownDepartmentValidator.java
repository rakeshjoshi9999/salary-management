package com.acme.salary.employee.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import com.acme.salary.reference.ReferenceService;

public final class KnownDepartmentValidator implements ConstraintValidator<KnownDepartment, String> {

	private final ReferenceService reference;

	public KnownDepartmentValidator(ReferenceService reference) {
		this.reference = reference;
	}

	@Override
	public boolean isValid(String department, ConstraintValidatorContext context) {
		return department == null || reference.isDepartment(department);
	}

}
