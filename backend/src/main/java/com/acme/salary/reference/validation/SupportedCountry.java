package com.acme.salary.reference.validation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

/** The code names a supported country. A value that is not two uppercase letters is left to {@code @Pattern}. */
@Target({ ElementType.FIELD, ElementType.RECORD_COMPONENT })
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = SupportedCountryValidator.class)
public @interface SupportedCountry {

	/** The format a country code must have before it is looked up; the request's {@code @Pattern} uses it too. */
	String FORMAT = "[A-Z]{2}";

	String message() default "must be a supported country";

	Class<?>[] groups() default {};

	Class<? extends Payload>[] payload() default {};

}
