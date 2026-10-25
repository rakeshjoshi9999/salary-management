package com.acme.salary.employee;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface EmployeeRepository extends JpaRepository<Employee, Long> {

	/**
	 * Written out rather than derived: {@code IgnoreCase} would generate {@code upper(...)}, and only
	 * {@code lower(email)} with {@code deleted_at IS NULL} matches the partial unique index (ADR-012, ADR-038).
	 */
	@Query("select count(e) > 0 from Employee e where lower(e.email) = lower(:email) and e.deletedAt is null")
	boolean existsActiveByEmail(@Param("email") String email);

	/** Use this, never the inherited {@code findById}, which also returns soft-deleted rows (ADR-039). */
	@Query("select e from Employee e where e.id = :id and e.deletedAt is null")
	Optional<Employee> findActiveById(@Param("id") long id);

}
