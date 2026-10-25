package com.acme.salary.settings;

import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.acme.salary.settings.dto.SettingsResponse;
import com.acme.salary.settings.dto.SettingsUpdateRequest;

/** The app-wide settings row, with the same optimistic locking as employees (ADR-023, ADR-028, ADR-047). */
@Service
public class SettingsService {

	private final SettingsRepository settings;

	SettingsService(SettingsRepository settings) {
		this.settings = settings;
	}

	/** Loads the entity through the repository, so a caller's open transaction holds the managed copy. */
	@Transactional(readOnly = true)
	public SettingsResponse get() {
		return toResponse(load());
	}

	/**
	 * The version is compared explicitly, because Hibernate would only compare against what it just
	 * loaded (ADR-023); the flush lets {@code @Version} catch a commit between this load and this write.
	 * Saving the same country writes nothing and keeps the version (ADR-047).
	 */
	@Transactional
	public SettingsResponse update(SettingsUpdateRequest request) {
		AppSettings current = load();
		if (current.getVersion().longValue() != request.version().longValue()) {
			throw new StaleSettingsException(request.version(), current.getVersion());
		}
		current.setDefaultCountryCode(request.defaultCountryCode());
		try {
			settings.flush();
		}
		catch (OptimisticLockingFailureException ex) {
			long committed = settings.findCommittedVersion()
				.orElseThrow(() -> new IllegalStateException("The settings row is missing"));
			throw new StaleSettingsException(request.version(), committed);
		}
		return toResponse(current);
	}

	private AppSettings load() {
		return settings.findById(AppSettings.ID)
			.orElseThrow(() -> new IllegalStateException("The settings row is missing; V3 seeds it"));
	}

	private static SettingsResponse toResponse(AppSettings appSettings) {
		return new SettingsResponse(appSettings.getDefaultCountryCode(), appSettings.getVersion());
	}

}
