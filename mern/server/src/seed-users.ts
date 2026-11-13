import { seedHrManager } from './auth/seed.js';
import { connectDb, disconnectDb } from './db.js';

/**
 * `npm run seed:users`: creates the first HR manager from SEED_HR_EMAIL and SEED_HR_PASSWORD. Like
 * `server.ts` it is an entry point, so it is the one place that reads `process.env` for this job.
 */
async function main(): Promise<void> {
  const { MONGODB_URI, SEED_HR_EMAIL, SEED_HR_PASSWORD } = process.env;
  if (!MONGODB_URI || !SEED_HR_EMAIL || !SEED_HR_PASSWORD) {
    throw new Error('Set MONGODB_URI, SEED_HR_EMAIL and SEED_HR_PASSWORD.');
  }
  await connectDb(MONGODB_URI);
  try {
    await seedHrManager({ email: SEED_HR_EMAIL, password: SEED_HR_PASSWORD });
    console.log(`HR manager ${SEED_HR_EMAIL.toLowerCase()} is ready.`);
  } finally {
    await disconnectDb();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
