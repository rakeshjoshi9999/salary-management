package com.acme.salary.employee.validation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

/** Names a supported department; null (no filter) passes. For a single filter value (ADR-044). */
@Target({ ElementType.FIELD, ElementType.RECORD_COMPONENT })
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = KnownDepartmentValidator.class)
public @interface KnownDepartment {

	String message() default "must be a supported department";

	Class<?>[] groups() default {};

	Class<? extends Payload>[] payload() default {};

}
