import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { connectDb, disconnectDb } from '../src/db.js';
import { Employee, type EmployeeFields } from '../src/employees/employee.model.js';
import { startMongo } from './helpers/mongo.js';

/** A valid employee; each test changes one thing. */
const valid = (overrides: Partial<EmployeeFields> = {}): Partial<EmployeeFields> => ({
  fullName: 'Ana Silva',
  email: 'ana.silva@acme.example',
  jobTitle: 'Software Engineer',
  department: 'Engineering',
  countryCode: 'IN',
  salaryMinor: 1_850_000_00,
  hireDate: new Date('2024-03-01T00:00:00.000Z'),
  ...overrides,
});

/** Validation messages Mongoose collected for each path, or {} when the document is valid. */
async function validationErrors(fields: Partial<EmployeeFields>): Promise<Record<string, unknown>> {
  try {
    await new Employee(fields).validate();
    return {};
  } catch (error) {
    return (error as { errors?: Record<string, unknown> }).errors ?? {};
  }
}

/** The Employee model: validators, the partial unique index and the soft-delete hooks (ADR-M6). */
describe('Employee model', () => {
  let mongo: Awaited<ReturnType<typeof startMongo>>;

  beforeAll(async () => {
    mongo = await startMongo();
    await connectDb(mongo.uri);
    await Employee.init(); // builds the indexes before the uniqueness test relies on them
  });

  afterAll(async () => {
    await disconnectDb();
    await mongo.stop();
  });

  beforeEach(async () => {
    await Employee.collection.deleteMany({}); // the raw driver: no hooks, so deleted documents go too
  });

  it('employeeRejectsUnsupportedCountry', async () => {
    expect(await validationErrors(valid())).toEqual({});

    expect(await validationErrors(valid({ countryCode: 'XX' }))).toHaveProperty('countryCode');
  });

  it('employeeRejectsJobTitleOutsideItsDepartment', async () => {
    const errors = await validationErrors(
      valid({ jobTitle: 'Recruiter', department: 'Engineering' }),
    );

    expect(errors).toHaveProperty('jobTitle');
  });

  it.each([0, -100, 12.5, undefined])(
    'employeeRequiresPositiveIntegerSalaryMinor: rejects %s',
    async (salary) => {
      expect(await validationErrors(valid({ salaryMinor: salary }))).toHaveProperty('salaryMinor');
    },
  );

  it('emailIsUniqueAmongActiveEmployeesOnly', async () => {
    const first = await Employee.create(valid());

    await expect(Employee.create(valid({ fullName: 'Another Ana' }))).rejects.toMatchObject({
      code: 11000,
    });

    // Once the first is soft-deleted, the email can be used again: a re-hire.
    await Employee.collection.updateOne({ _id: first._id }, { $set: { deletedAt: new Date() } });
    await expect(Employee.create(valid({ fullName: 'Re-hired Ana' }))).resolves.toBeDefined();
  });

  it('findHidesSoftDeletedEmployees', async () => {
    const kept = await Employee.create(valid({ email: 'kept@acme.example' }));
    const gone = await Employee.create(valid({ email: 'gone@acme.example' }));
    await Employee.collection.updateOne({ _id: gone._id }, { $set: { deletedAt: new Date() } });

    const all = await Employee.find({});

    expect(all.map((employee) => employee.email)).toEqual([kept.email]);
    expect(await Employee.findById(gone._id)).toBeNull();
    expect(await Employee.countDocuments({})).toBe(1);
  });

  it('aggregateHidesSoftDeletedEmployees', async () => {
    await Employee.create(valid({ email: 'kept@acme.example' }));
    const gone = await Employee.create(valid({ email: 'gone@acme.example' }));
    await Employee.collection.updateOne({ _id: gone._id }, { $set: { deletedAt: new Date() } });

    const [result] = await Employee.aggregate<{ n: number }>([{ $count: 'n' }]);

    expect(result?.n).toBe(1);
  });
});
