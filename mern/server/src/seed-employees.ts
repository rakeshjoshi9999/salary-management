import { connectDb, disconnectDb } from './db.js';
import { Employee } from './employees/employee.model.js';
import { generateEmployees, seedEmployees } from './employees/seed.js';

/**
 * `npm run seed:employees`: 10,000 deterministic employees (ADR-M6). Safe to run again: only missing
 * employees are added. An entry point, so it is the one place that reads `process.env` for this job.
 */
async function main(): Promise<void> {
  const { MONGODB_URI } = process.env;
  if (!MONGODB_URI) {
    throw new Error('Set MONGODB_URI.');
  }
  const started = performance.now();
  await connectDb(MONGODB_URI);
  try {
    await Employee.init(); // the indexes, before inserting into them
    const added = await seedEmployees(generateEmployees());
    const seconds = ((performance.now() - started) / 1000).toFixed(1);
    console.log(`Seeded ${added} new employees in ${seconds} s.`);
  } finally {
    await disconnectDb();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
