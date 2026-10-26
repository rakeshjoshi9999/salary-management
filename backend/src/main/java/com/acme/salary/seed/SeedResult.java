package com.acme.salary.seed;

import java.time.Duration;

/** What one seed run did: rows inserted, seed employees already present, and the time the inserts took. */
record SeedResult(int inserted, int skipped, Duration insertTime) {
}
