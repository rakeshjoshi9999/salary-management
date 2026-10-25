package com.acme.salary.employee;

import java.time.Instant;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

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

	/** The duplicate-email pre-check for an update: the employee's own row does not count (ADR-041). */
	@Query("select count(e) > 0 from Employee e where lower(e.email) = lower(:email) and e.deletedAt is null"
			+ " and e.id <> :id")
	boolean existsActiveByEmailExcludingId(@Param("email") String email, @Param("id") long id);

	/**
	 * The committed version, read in its own transaction: the caller's transaction has just lost a race
	 * and its persistence context can no longer be trusted (ADR-041). Empty if the row is gone or deleted.
	 */
	@Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
	@Query("select e.version from Employee e where e.id = :id and e.deletedAt is null")
	Optional<Long> findActiveVersionById(@Param("id") long id);

	/**
	 * Soft delete in one statement (ADR-042): 1 if an active row was deleted, 0 if there was none. The
	 * version moves too, so an in-flight edit's write matches no row: the edit gets 404 and can never
	 * bring the row back (ADR-011, ADR-023).
	 */
	@Modifying(flushAutomatically = true, clearAutomatically = true)
	@Query("update Employee e set e.deletedAt = :now, e.version = e.version + 1"
			+ " where e.id = :id and e.deletedAt is null")
	int softDeleteActive(@Param("id") long id, @Param("now") Instant now);

}
