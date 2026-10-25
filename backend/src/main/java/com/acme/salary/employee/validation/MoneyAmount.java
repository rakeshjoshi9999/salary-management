package com.acme.salary.employee.validation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

/**
 * At most 12 integer digits and 2 decimals, judged by value: {@code 100.000} passes because it equals
 * {@code 100.00} (ADR-037). {@code @Digits} counts trailing zeros, so it cannot express this.
 * Null is left to {@code @NotNull}.
 */
@Target({ ElementType.FIELD, ElementType.RECORD_COMPONENT })
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = MoneyAmountValidator.class)
public @interface MoneyAmount {

	String message() default "must have at most 12 digits before the decimal point and 2 after it";

	Class<?>[] groups() default {};

	Class<? extends Payload>[] payload() default {};

}
