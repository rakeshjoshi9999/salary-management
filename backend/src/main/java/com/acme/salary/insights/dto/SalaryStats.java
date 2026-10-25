package com.acme.salary.insights.dto;

import java.math.BigDecimal;

/** The {@code SalaryStats} schema: every statistic is null when the headcount is 0 (ADR-017). */
public record SalaryStats(long headcount, BigDecimal min, BigDecimal max, BigDecimal average, BigDecimal median) {
}
