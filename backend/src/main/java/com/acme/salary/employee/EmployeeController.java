package com.acme.salary.employee;

import java.net.URI;
import java.util.List;
import java.util.Set;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.acme.salary.common.error.UnknownQueryParametersException;
import com.acme.salary.employee.dto.EmployeeCreateRequest;
import com.acme.salary.employee.dto.EmployeeListQuery;
import com.acme.salary.employee.dto.EmployeePage;
import com.acme.salary.employee.dto.EmployeeResponse;
import com.acme.salary.employee.dto.EmployeeUpdateRequest;

@RestController
@RequestMapping("/api/v1/employees")
class EmployeeController {

	/**
	 * The query parameters the list takes; any other is a 400 (ADR-044). Search, filters and an explicit
	 * sort join this set with tasks 4.2 to 4.4.
	 */
	private static final Set<String> LIST_PARAMETERS = Set.of("page", "size");

	private final EmployeeService service;

	EmployeeController(EmployeeService service) {
		this.service = service;
	}

	@PostMapping
	ResponseEntity<EmployeeResponse> create(@Valid @RequestBody EmployeeCreateRequest request) {
		EmployeeResponse created = service.create(request);
		return ResponseEntity.created(URI.create("/api/v1/employees/" + created.id())).body(created);
	}

	@GetMapping
	EmployeePage list(@Valid @ModelAttribute EmployeeListQuery query, HttpServletRequest request) {
		List<String> unknown = request.getParameterMap()
			.keySet()
			.stream()
			.filter(name -> !LIST_PARAMETERS.contains(name))
			.sorted()
			.toList();
		if (!unknown.isEmpty()) {
			throw new UnknownQueryParametersException(unknown);
		}
		return service.list(query);
	}

	@GetMapping("/{id}")
	EmployeeResponse get(@PathVariable long id) {
		return service.get(id);
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void delete(@PathVariable long id) {
		service.delete(id);
	}

	@PutMapping("/{id}")
	EmployeeResponse update(@PathVariable long id, @Valid @RequestBody EmployeeUpdateRequest request) {
		return service.update(id, request);
	}

}
