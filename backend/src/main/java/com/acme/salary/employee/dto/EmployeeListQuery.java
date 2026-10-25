package com.acme.salary.employee.dto;

public record EmployeeListQuery(Integer page, Integer size, String sort, String q, String country,
		String department, String jobTitle) {
}
