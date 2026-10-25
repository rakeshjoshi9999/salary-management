package com.acme.salary.settings;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** The single row of {@code app_settings} (ADR-028). Never leaves the service layer. */
@Entity
@Table(name = "app_settings")
class AppSettings {

	/** The check constraint allows only this id. */
	static final short ID = 1;

	@Id
	private Short id;

	@JdbcTypeCode(SqlTypes.CHAR)
	@Column(name = "default_country_code", nullable = false, length = 2)
	private String defaultCountryCode;

	@Version
	@Column(nullable = false)
	private Long version;

	protected AppSettings() {
	}

	String getDefaultCountryCode() {
		return defaultCountryCode;
	}

	Long getVersion() {
		return version;
	}

	/** Hibernate writes, and bumps the version, only if the country actually changed (ADR-047). */
	void setDefaultCountryCode(String defaultCountryCode) {
		this.defaultCountryCode = defaultCountryCode;
	}

}
