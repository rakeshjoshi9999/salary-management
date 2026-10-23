package com.acme.salary;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * CORS for the MVC endpoints.
 *
 * Actuator keeps its own, separate CORS configuration - set in
 * application.properties - so both surfaces read the same cors.allowed-origins
 * value. Configuring one does nothing for the other, which is a quiet way to
 * ship an API the browser refuses to talk to.
 *
 * There are no MVC endpoints yet; this exists so the first controller in phase 3
 * is reachable from the deployed frontend without anyone having to remember why
 * it is not.
 */
@Configuration
class CorsConfig implements WebMvcConfigurer {

	private final List<String> allowedOrigins;

	CorsConfig(@Value("${cors.allowed-origins}") List<String> allowedOrigins) {
		this.allowedOrigins = allowedOrigins;
	}

	@Override
	public void addCorsMappings(CorsRegistry registry) {
		registry.addMapping("/**")
				.allowedOrigins(allowedOrigins.toArray(String[]::new))
				.allowedMethods("GET", "POST", "PUT", "DELETE")
				.allowedHeaders("Content-Type", "If-Match");
	}

}
