package com.acme.salary.settings;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

interface SettingsRepository extends JpaRepository<AppSettings, Short> {

	/**
	 * The committed version, read in its own transaction after the caller's has lost a race; the
	 * caller's persistence context can no longer be trusted (as for employees, ADR-041).
	 */
	@Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
	@Query("select s.version from AppSettings s where s.id = 1")
	Optional<Long> findCommittedVersion();

}
