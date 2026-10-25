package com.acme.salary.employee;

import java.net.URI;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.acme.salary.employee.dto.EmployeeCreateRequest;
import com.acme.salary.employee.dto.EmployeeResponse;

@RestController
@RequestMapping("/api/v1/employees")
class EmployeeController {

	private final EmployeeService service;

	EmployeeController(EmployeeService service) {
		this.service = service;
	}

	@PostMapping
	ResponseEntity<EmployeeResponse> create(@Valid @RequestBody EmployeeCreateRequest request) {
		EmployeeResponse created = service.create(request);
		return ResponseEntity.created(URI.create("/api/v1/employees/" + created.id())).body(created);
	}

}
