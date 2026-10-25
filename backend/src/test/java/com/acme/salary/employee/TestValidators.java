package com.acme.salary.employee;

import java.lang.reflect.Constructor;
import java.time.Clock;

import jakarta.validation.Configuration;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorFactory;
import jakarta.validation.Validation;
import jakarta.validation.Validator;

import com.acme.salary.reference.ReferenceService;

/**
 * The validator as Spring builds it, minus Spring: the given clock, and any constraint validator with a
 * ReferenceService constructor gets the given one. EmployeeCreateRequestValidationTest keeps its own
 * copy from 3.2, left untouched.
 */
final class TestValidators {

	private TestValidators() {
	}

	static Validator validator(ReferenceService reference, Clock clock) {
		Configuration<?> config = Validation.byDefaultProvider().configure();
		ConstraintValidatorFactory defaults = config.getDefaultConstraintValidatorFactory();
		ConstraintValidatorFactory factory = new ConstraintValidatorFactory() {

			@Override
			public <T extends ConstraintValidator<?, ?>> T getInstance(Class<T> key) {
				try {
					Constructor<T> constructor = key.getDeclaredConstructor(ReferenceService.class);
					constructor.setAccessible(true);
					return constructor.newInstance(reference);
				}
				catch (NoSuchMethodException ex) {
					return defaults.getInstance(key);
				}
				catch (ReflectiveOperationException ex) {
					throw new IllegalStateException(ex);
				}
			}

			@Override
			public void releaseInstance(ConstraintValidator<?, ?> instance) {
			}

		};
		return config.clockProvider(() -> clock)
			.constraintValidatorFactory(factory)
			.buildValidatorFactory()
			.getValidator();
	}

}
