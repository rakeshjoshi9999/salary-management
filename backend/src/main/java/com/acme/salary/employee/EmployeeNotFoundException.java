package com.acme.salary.employee;

import org.springframework.http.HttpStatus;
import org.springframework.web.ErrorResponseException;

class EmployeeNotFoundException extends ErrorResponseException {

	EmployeeNotFoundException(long id) {
		super(HttpStatus.INTERNAL_SERVER_ERROR);
	}

}
