package com.acme.salary.employee.validation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

/**
 * The department is supported and the job title belongs to it. Each failure is reported on the field
 * at fault, never on the whole object, so the form can mark it.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = TitleInDepartmentValidator.class)
public @interface TitleInDepartment {

	String message() default "must be a job title in the given department";

	Class<?>[] groups() default {};

	Class<? extends Payload>[] payload() default {};

}
