package com.acme.salary.employee;

import org.springframework.data.jpa.repository.JpaRepository;

interface EmployeeRepository extends JpaRepository<Employee, Long> {

	default boolean existsActiveByEmail(String email) {
		return false;
	}

}
