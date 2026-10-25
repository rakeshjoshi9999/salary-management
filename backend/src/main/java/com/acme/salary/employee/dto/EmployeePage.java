package com.acme.salary.employee.dto;

import java.util.List;

/** The {@code EmployeePage} schema in openapi.yaml: our own envelope, not Spring's Page JSON (ADR-016). */
public record EmployeePage(List<EmployeeResponse> items, int page, int size, long totalItems, int totalPages) {
}
