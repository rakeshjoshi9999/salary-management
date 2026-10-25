package com.acme.salary.employee;

import org.springframework.http.HttpStatus;
import org.springframework.web.ErrorResponseException;

class StaleVersionException extends ErrorResponseException {

	StaleVersionException(long sentVersion, long currentVersion) {
		super(HttpStatus.INTERNAL_SERVER_ERROR);
	}

	long currentVersion() {
		return -1;
	}

}
