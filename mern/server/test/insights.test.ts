import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../src/app.js';
import { connectDb, disconnectDb } from '../src/db.js';
import { Employee, type EmployeeFields } from '../src/employees/employee.model.js';
import { bearerFor, fakeClock, testConfig } from './helpers/auth.js';
import { startMongo } from './helpers/mongo.js';
import { expectProblem } from './helpers/problem.js';

let next = 0;

/** An employee in `countryCode` earning `major` units of its currency; only what a test names varies. */
function employee(
  countryCode: string,
  major: number | string,
  overrides: Partial<EmployeeFields> = {},
): Partial<EmployeeFields> {
  next += 1;
  return {
    fullName: `Person ${next}`,
    email: `person.${next}@acme.example`,
    jobTitle: 'Software Engineer',
    department: 'Engineering',
    countryCode,
    salaryMinor: Math.round(Number(major) * 100),
    hireDate: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

/** `GET /insights/countries/:countryCode` against a real MongoDB (ADR-M6). */
describe('GET /insights/countries/:countryCode', () => {
  let mongo: Awaited<ReturnType<typeof startMongo>>;
  const clock = fakeClock();
  const config = testConfig();
  const app = () => createApp({ config, ping: async () => true, now: clock.now });
  const get = (path: string) =>
    request(app()).get(path).set('Authorization', bearerFor(config, clock.now));

  beforeAll(async () => {
    mongo = await startMongo();
    await connectDb(mongo.uri);
    await Employee.init();
  });

  afterAll(async () => {
    await disconnectDb();
    await mongo.stop();
  });

  beforeEach(async () => {
    await Employee.collection.deleteMany({});
  });

  it('insightsComputeMinMaxAverageMedian', async () => {
    await Employee.insertMany([employee('IN', 100), employee('IN', 600), employee('IN', 200)]);

    const res = await get('/insights/countries/IN');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      countryCode: 'IN',
      currency: 'INR',
      salary: { headcount: 3, min: '100.00', max: '600.00', average: '300.00', median: '200.00' },
    });
  });

  it('medianOfEvenCountIsMeanOfMiddleTwoRoundedHalfEven', async () => {
    // Sorted: 100.00, 100.05, 300.00, 900.05. Median (100.05 + 300.00) / 2 = 200.025 → 200.02 (even).
    // Average 1400.10 / 4 = 350.025 → 350.02 (even): exact division, not $avg with half-up rounding.
    await Employee.insertMany([
      employee('IN', '900.05'),
      employee('IN', '100.05'),
      employee('IN', 100),
      employee('IN', 300),
    ]);

    const res = await get('/insights/countries/IN');

    expect(res.body.salary).toEqual({
      headcount: 4,
      min: '100.00',
      max: '900.05',
      average: '350.02',
      median: '200.02',
    });
  });

  it('averageByJobTitleSortedByAverageThenTitle', async () => {
    // Software Engineer averages 100.025 → 100.02 (HALF_EVEN per title too). 1000.00 must sort above
    // 500.00 as a number (as text it would not). Accountant and QA Engineer tie on 500.00: title order.
    await Employee.insertMany([
      employee('IN', 100),
      employee('IN', '100.05'),
      employee('IN', 500, { jobTitle: 'QA Engineer' }),
      employee('IN', 1000, { jobTitle: 'Recruiter', department: 'Human Resources' }),
      employee('IN', 500, { jobTitle: 'Accountant', department: 'Finance' }),
    ]);

    const res = await get('/insights/countries/IN');

    expect(res.body.averageByJobTitle).toEqual([
      { jobTitle: 'Recruiter', department: 'Human Resources', headcount: 1, average: '1000.00' },
      { jobTitle: 'Accountant', department: 'Finance', headcount: 1, average: '500.00' },
      { jobTitle: 'QA Engineer', department: 'Engineering', headcount: 1, average: '500.00' },
      { jobTitle: 'Software Engineer', department: 'Engineering', headcount: 2, average: '100.02' },
    ]);
  });

  it('headcountByDepartmentSortedByCountThenName', async () => {
    await Employee.insertMany([
      employee('IN', 100),
      employee('IN', 100),
      employee('IN', 100, { jobTitle: 'QA Engineer' }),
      employee('IN', 100, { jobTitle: 'Sales Manager', department: 'Sales' }),
      employee('IN', 100, { jobTitle: 'Recruiter', department: 'Human Resources' }),
    ]);

    const res = await get('/insights/countries/IN');

    expect(res.body.headcountByDepartment).toEqual([
      { department: 'Engineering', headcount: 3 },
      { department: 'Human Resources', headcount: 1 },
      { department: 'Sales', headcount: 1 },
    ]);
  });

  it('emptyCountryReturnsZeroHeadcountAndNulls', async () => {
    await Employee.insertMany([employee('IN', 100)]);

    const res = await get('/insights/countries/DE');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      countryCode: 'DE',
      currency: 'EUR',
      salary: { headcount: 0, min: null, max: null, average: null, median: null },
      averageByJobTitle: [],
      headcountByDepartment: [],
    });
  });

  it('insightsIgnoreOtherCountriesAndSoftDeleted', async () => {
    const [, , gone] = await Employee.insertMany([
      employee('IN', 100),
      employee('IN', 300),
      employee('IN', 5_000),
      employee('US', 999),
    ]);
    await Employee.collection.updateOne(
      { _id: gone!._id },
      { $set: { deletedAt: new Date('2025-01-01T00:00:00.000Z') } },
    );

    const res = await get('/insights/countries/IN');

    // The whole body: the lists must honour the same filters as the stats.
    expect(res.body).toEqual({
      countryCode: 'IN',
      currency: 'INR',
      salary: { headcount: 2, min: '100.00', max: '300.00', average: '200.00', median: '200.00' },
      averageByJobTitle: [
        {
          jobTitle: 'Software Engineer',
          department: 'Engineering',
          headcount: 2,
          average: '200.00',
        },
      ],
      headcountByDepartment: [{ department: 'Engineering', headcount: 2 }],
    });
  });

  it.each(['XX', 'in'])('unknownOrLowercaseCountryIs404: %s', async (code) => {
    const res = await get(`/insights/countries/${code}`);

    expectProblem(res, 404, 'COUNTRY_NOT_FOUND');
  });

  // Sign-in is checked before the country: an anonymous caller must not learn which codes exist.
  it.each(['IN', 'XX'])('insightsRequireSignIn: %s', async (code) => {
    const res = await request(app()).get(`/insights/countries/${code}`);

    expectProblem(res, 401, 'UNAUTHENTICATED');
  });
});
