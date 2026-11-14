import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { connectDb, disconnectDb } from '../src/db.js';
import { Employee } from '../src/employees/employee.model.js';
import { generateEmployees, seedEmployees } from '../src/employees/seed.js';
import { COUNTRY_CODES, isTitleInDepartment } from '../src/reference/data.js';
import { startMongo } from './helpers/mongo.js';

const ANCHOR = new Date('2026-01-01T00:00:00.000Z');

/** The generator alone: deterministic, realistic within the reference data. No database. */
describe('generateEmployees', () => {
  it('seedGeneratesTheSameEmployeesEveryRun', () => {
    const first = generateEmployees({ seed: 42, anchor: ANCHOR });
    const second = generateEmployees({ seed: 42, anchor: ANCHOR });

    expect(second).toEqual(first);
    expect(first).toHaveLength(10_000);
    expect(new Set(first.map((employee) => employee.countryCode))).toEqual(new Set(COUNTRY_CODES));
    expect(new Set(first.map((employee) => employee.email)).size).toBe(10_000);
    const thirtyYearsBefore = new Date(ANCHOR);
    thirtyYearsBefore.setUTCFullYear(ANCHOR.getUTCFullYear() - 30);
    for (const employee of first) {
      expect(employee.hireDate.getTime()).toBeLessThan(ANCHOR.getTime());
      expect(employee.hireDate.getTime()).toBeGreaterThanOrEqual(thirtyYearsBefore.getTime());
      expect(Number.isInteger(employee.salaryMinor) && employee.salaryMinor > 0).toBe(true);
      expect(isTitleInDepartment(employee.jobTitle, employee.department)).toBe(true);
    }
  });

  it('seedGeneratesTheSameEmployeesEveryRun: the defaults the real run uses are fixed too', () => {
    // No seed and no anchor given, as `npm run seed:employees` calls it: still no clock, no Math.random.
    expect(generateEmployees()).toEqual(generateEmployees());
    expect(generateEmployees()).toHaveLength(10_000);
    expect(generateEmployees({ seed: 1, anchor: ANCHOR })).not.toEqual(
      generateEmployees({ seed: 42, anchor: ANCHOR }),
    );
  });
});

/** The seed against a real MongoDB: idempotent, and it never overwrites what the app changed. */
describe('seedEmployees', () => {
  let mongo: Awaited<ReturnType<typeof startMongo>>;

  beforeAll(async () => {
    mongo = await startMongo();
    await connectDb(mongo.uri);
    await Employee.init();
  });

  afterAll(async () => {
    await disconnectDb();
    await mongo.stop();
  });

  it('seedIsIdempotentAndKeepsEdits', async () => {
    const employees = generateEmployees({ seed: 42, anchor: ANCHOR });
    await seedEmployees(employees);
    const edited = employees[0]!;
    const deleted = employees[1]!;
    await Employee.updateOne({ email: edited.email }, { $set: { salaryMinor: 1 } });
    await Employee.updateOne({ email: deleted.email }, { $set: { deletedAt: new Date() } });

    await seedEmployees(employees);

    // Nothing duplicated, the edit kept, and someone HR deleted is not brought back (engineer's call).
    expect(await Employee.collection.countDocuments({})).toBe(10_000);
    expect(await Employee.countDocuments({})).toBe(9_999);
    expect((await Employee.findOne({ email: edited.email }))?.salaryMinor).toBe(1);
    expect(await Employee.findOne({ email: deleted.email })).toBeNull();
  }, 60_000);
});
