package com.acme.salary.employee.validation;

import java.time.LocalDate;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public final class NotBeforeValidator implements ConstraintValidator<NotBefore, LocalDate> {

	private LocalDate earliest;

	@Override
	public void initialize(NotBefore annotation) {
		earliest = LocalDate.parse(annotation.value());
	}

	@Override
	public boolean isValid(LocalDate date, ConstraintValidatorContext context) {
		return date == null || !date.isBefore(earliest);
	}

}
