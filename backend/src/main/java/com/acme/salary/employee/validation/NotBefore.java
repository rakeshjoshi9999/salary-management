package com.acme.salary.employee.validation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

/** The date is on or after {@link #value()}, an ISO date. Null is left to {@code @NotNull}. */
@Target({ ElementType.FIELD, ElementType.RECORD_COMPONENT })
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = NotBeforeValidator.class)
public @interface NotBefore {

	String value();

	String message() default "must be on or after {value}";

	Class<?>[] groups() default {};

	Class<? extends Payload>[] payload() default {};

}
