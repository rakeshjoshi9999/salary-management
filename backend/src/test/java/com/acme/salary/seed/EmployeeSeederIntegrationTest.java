package com.acme.salary.seed;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;

import com.acme.salary.AbstractIntegrationTest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The seeder against Postgres (tasks 6.2, 6.3, ADR-049). These tests commit 10,000 rows, so each one
 * removes every employee afterwards.
 */
class EmployeeSeederIntegrationTest extends AbstractIntegrationTest {

	private static final String CREATE = """
			{"fullName": "Asha Rao", "email": "%s", "jobTitle": "Recruiter", "department": "Human Resources",
			 "countryCode": "IN", "salary": 2400000.00, "hireDate": "2021-04-12"}
			""";

	private static final JsonMapper JSON = JsonMapper.builder().build();

	private static List<SeedEmployee> employees;

	@Autowired
	private EmployeeSeeder seeder;

	@Autowired
	private JdbcClient jdbc;

	@Autowired
	private MockMvc mvc;

	/** Generated once for the class; the seeder never changes the list it is given. */
	private static List<SeedEmployee> employees() {
		if (employees == null) {
			employees = new EmployeeGenerator().generate(EmployeeGenerator.DEFAULT_SEED);
		}
		return employees;
	}

	@AfterEach
	void removeEmployees() {
		jdbc.sql("delete from employee").update();
	}

	@Test
	void seedsExactly10000ActiveEmployees() {
		SeedResult result = seeder.seed(employees());

		assertThat(result.inserted()).isEqualTo(10_000);
		assertThat(result.skipped()).isZero();
		assertThat(activeSeedEmployees()).isEqualTo(10_000);
		assertThat(activeEmployees()).isEqualTo(10_000);
	}

	@Test
	void rerunInsertsNothing() {
		seeder.seed(employees());
		long sequenceBefore = sequenceLastValue();

		SeedResult again = seeder.seed(employees());

		assertThat(again.inserted()).isZero();
		assertThat(again.skipped()).isEqualTo(10_000);
		assertThat(activeEmployees()).isEqualTo(10_000);
		assertThat(sequenceLastValue()).as("no ids reserved on a rerun").isEqualTo(sequenceBefore);
	}

	@Test
	void keepsRowsAddedByHand() throws Exception {
		long id = create("hand.added@acme.com");

		seeder.seed(employees());

		assertThat(activeEmployees()).isEqualTo(10_001);
		Map<String, Object> row = jdbc.sql("select full_name, salary, version from employee where id = ?")
			.param(id)
			.query()
			.singleRow();
		assertThat(row).containsEntry("full_name", "Asha Rao").containsEntry("version", 0L);
		assertThat(row.get("salary").toString()).isEqualTo("2400000.00");
	}

	@Test
	void skipsSeedEmailAlreadyTakenIgnoringCase() throws Exception {
		String taken = employees().get(0).email().toUpperCase();
		create(taken);

		SeedResult result = seeder.seed(employees());

		assertThat(result.inserted()).isEqualTo(9_999);
		assertThat(result.skipped()).isEqualTo(1);
		assertThat(jdbc.sql("select count(*) from employee where lower(email) = lower(?) and deleted_at is null")
			.param(taken)
			.query(Long.class)
			.single()).isEqualTo(1L);
	}

	/** The catch ADR-049 accepts: emails are unique among active rows only (ADR-011). */
	@Test
	void softDeletedSeedEmployeeComesBackOnRerun() {
		seeder.seed(employees());
		String email = employees().get(0).email();
		jdbc.sql("update employee set deleted_at = now() where email = ?").param(email).update();

		SeedResult again = seeder.seed(employees());

		assertThat(again.inserted()).isEqualTo(1);
		assertThat(activeSeedEmployees()).isEqualTo(10_000);
		assertThat(jdbc.sql("select count(*) from employee where email = ?").param(email).query(Long.class).single())
			.isEqualTo(2L);
	}

	@Test
	void apiCreateAfterSeedGetsFreshId() throws Exception {
		long before = create("before.seed@acme.com");

		seeder.seed(employees());
		long after = create("after.seed@acme.com");

		List<Long> seeded = jdbc.sql("select id from employee where email like '%@acme.example'")
			.query(Long.class)
			.list();
		assertThat(seeded).hasSize(10_000).doesNotContain(before, after);
		assertThat(after).isNotEqualTo(before);
		// ADR-049: seeded ids are V-49..V for values the sequence handed out, so every one is at least 1 and
		// at most the sequence's last value. Hibernate's next block then starts above all of them.
		long lastValue = sequenceLastValue();
		assertThat(seeded).allSatisfy(id -> assertThat(id).isBetween(1L, lastValue));
		assertThat(jdbc.sql("select email from employee where id = ?").param(before).query(String.class).single())
			.isEqualTo("before.seed@acme.com");
	}

	@Test
	void seededEmployeeCanBeEditedThroughApi() throws Exception {
		seeder.seed(employees());
		long id = jdbc.sql("select min(id) from employee").query(Long.class).single();
		String body = mvc.perform(get("/api/v1/employees/{id}", id))
			.andExpect(status().isOk())
			.andReturn()
			.getResponse()
			.getContentAsString();
		ObjectNode update = (ObjectNode) JSON.readTree(body);
		update.remove(List.of("id", "currency"));

		mvc.perform(put("/api/v1/employees/{id}", id).contentType(MediaType.APPLICATION_JSON)
			.content(update.toString())).andExpect(status().isOk());
	}

	@Test
	void failedSeedLeavesNoRows() {
		List<SeedEmployee> broken = new ArrayList<>(employees());
		SeedEmployee good = broken.get(599);
		broken.set(599, new SeedEmployee(good.fullName(), good.email(), "Astronaut", good.department(),
				good.countryCode(), good.salary(), good.hireDate()));

		assertThatThrownBy(() -> seeder.seed(broken)).isInstanceOf(DataAccessException.class);

		assertThat(jdbc.sql("select count(*) from employee").query(Long.class).single()).isZero();
	}

	@Test
	void vacuumAnalyzeRunsAfterSeed() {
		Map<String, Object> before = tableStats();
		seeder.seed(employees());

		seeder.vacuumAnalyze();

		Map<String, Object> after = tableStats();
		assertThat((Long) after.get("vacuum_count")).isGreaterThan((Long) before.get("vacuum_count"));
		assertThat((Long) after.get("analyze_count")).isGreaterThan((Long) before.get("analyze_count"));
	}

	private long create(String email) throws Exception {
		String body = mvc
			.perform(post("/api/v1/employees").contentType(MediaType.APPLICATION_JSON).content(CREATE.formatted(email)))
			.andExpect(status().isCreated())
			.andReturn()
			.getResponse()
			.getContentAsString();
		return JSON.readTree(body).get("id").asLong();
	}

	private long activeEmployees() {
		return jdbc.sql("select count(*) from employee where deleted_at is null").query(Long.class).single();
	}

	private long activeSeedEmployees() {
		return jdbc.sql("select count(*) from employee where deleted_at is null and email like '%@acme.example'")
			.query(Long.class)
			.single();
	}

	private long sequenceLastValue() {
		return jdbc.sql("select last_value from employee_id_seq").query(Long.class).single();
	}

	private Map<String, Object> tableStats() {
		return jdbc.sql("select vacuum_count, analyze_count from pg_stat_user_tables where relname = 'employee'")
			.query()
			.singleRow();
	}

}
