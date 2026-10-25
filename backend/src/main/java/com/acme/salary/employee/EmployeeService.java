package com.acme.salary.employee;

import org.springframework.stereotype.Service;

import com.acme.salary.employee.dto.EmployeeCreateRequest;
import com.acme.salary.employee.dto.EmployeeResponse;
import com.acme.salary.reference.ReferenceService;

@Service
public class EmployeeService {

	EmployeeService(EmployeeRepository employees, ReferenceService reference) {
	}

	public EmployeeResponse create(EmployeeCreateRequest request) {
		throw new UnsupportedOperationException("not implemented yet");
	}

}
