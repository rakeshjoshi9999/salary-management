package com.acme.salary.employee.validation;

/** A request naming a department and a job title, which {@link TitleInDepartment} checks together. */
public interface JobAssignment {

	String jobTitle();

	String department();

}
