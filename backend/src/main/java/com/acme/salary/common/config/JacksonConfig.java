package com.acme.salary.common.config;

import tools.jackson.core.JsonParser;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.cfg.CoercionAction;
import tools.jackson.databind.cfg.CoercionInputShape;
import tools.jackson.databind.deser.jdk.StringDeserializer;
import tools.jackson.databind.deser.std.StdScalarDeserializer;
import tools.jackson.databind.module.SimpleModule;
import tools.jackson.databind.type.LogicalType;

import org.springframework.boot.jackson.autoconfigure.JsonMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Strict request bodies on every endpoint (ADR-014, ADR-037): an unknown field is an error, a JSON
 * string is never read as a number, and every string is trimmed before validation sees it.
 */
@Configuration
public class JacksonConfig {

	@Bean
	JsonMapperBuilderCustomizer strictInput() {
		return builder -> builder.enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
			.withCoercionConfig(LogicalType.Float,
					config -> config.setCoercion(CoercionInputShape.String, CoercionAction.Fail))
			.withCoercionConfig(LogicalType.Integer,
					config -> config.setCoercion(CoercionInputShape.String, CoercionAction.Fail))
			.addModule(new SimpleModule("trim-strings").addDeserializer(String.class,
					new TrimmingStringDeserializer()));
	}

	/** Jackson's own string handling, then {@link String#strip()}. */
	static final class TrimmingStringDeserializer extends StdScalarDeserializer<String> {

		TrimmingStringDeserializer() {
			super(String.class);
		}

		@Override
		public String deserialize(JsonParser parser, DeserializationContext context) {
			String value = StringDeserializer.instance.deserialize(parser, context);
			return value == null ? null : value.strip();
		}

	}

}
