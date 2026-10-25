package com.acme.salary.employee.validation;

import java.util.Optional;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import com.acme.salary.reference.ReferenceService;

/**
 * Blank and over-long values are left to {@code @NotBlank} and {@code @Size}. An unknown department is the only error reported, since
 * no title can be judged against it. Messages are fixed text: echoing the user's input into a message
 * template would let it be evaluated as an expression.
 */
public final class TitleInDepartmentValidator implements ConstraintValidator<TitleInDepartment, JobAssignment> {

	/** The {@code @Size(max)} on both fields and the column length (DATA_MODEL.md). */
	private static final int MAX_LENGTH = 100;

	private final ReferenceService reference;

	public TitleInDepartmentValidator(ReferenceService reference) {
		this.reference = reference;
	}

	@Override
	public boolean isValid(JobAssignment assignment, ConstraintValidatorContext context) {
		String department = assignment.department();
		if (leftToFieldRules(department)) {
			return true;
		}
		if (!reference.isDepartment(department)) {
			return reject(context, "department", "must be a supported department");
		}
		String title = assignment.jobTitle();
		if (leftToFieldRules(title)) {
			return true;
		}
		Optional<String> titleDepartment = reference.departmentOf(title);
		if (titleDepartment.isEmpty()) {
			return reject(context, "jobTitle", "must be a supported job title");
		}
		if (!titleDepartment.get().equals(department)) {
			return reject(context, "jobTitle", "must be a job title in the given department");
		}
		return true;
	}

	/** Blank or over-long values already fail {@code @NotBlank} or {@code @Size}: one error per field. */
	private static boolean leftToFieldRules(String value) {
		return value == null || value.isBlank() || value.length() > MAX_LENGTH;
	}

	private static boolean reject(ConstraintValidatorContext context, String field, String message) {
		context.disableDefaultConstraintViolation();
		context.buildConstraintViolationWithTemplate(message).addPropertyNode(field).addConstraintViolation();
		return false;
	}

}
