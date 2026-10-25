package com.acme.salary.insights.dto;

import java.math.BigDecimal;

/** One entry of {@code averageByJobTitle}. */
public record TitleAverage(String jobTitle, String department, long headcount, BigDecimal average) {
}
