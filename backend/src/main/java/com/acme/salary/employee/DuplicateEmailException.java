package com.acme.salary.employee;

import org.springframework.http.HttpStatus;
import org.springframework.web.ErrorResponseException;

class DuplicateEmailException extends ErrorResponseException {

	DuplicateEmailException(String email) {
		super(HttpStatus.INTERNAL_SERVER_ERROR);
	}

}
