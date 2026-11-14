import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../src/app.js';
import { bearerFor, fakeClock, testConfig } from './helpers/auth.js';
import { expectProblem } from './helpers/problem.js';

/** `GET /reference`: the dropdown data, from the code module (ADR-M6). No database needed. */
describe('GET /reference', () => {
  const clock = fakeClock();
  const config = testConfig();
  const app = () => createApp({ config, ping: async () => true, now: clock.now });

  it('referenceListsCountriesDepartmentsAndTitles', async () => {
    const res = await request(app())
      .get('/reference')
      .set('Authorization', bearerFor(config, clock.now));

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('public, max-age=3600');
    expect(res.body).toEqual({
      countries: [
        { code: 'FR', name: 'France', currency: 'EUR' },
        { code: 'DE', name: 'Germany', currency: 'EUR' },
        { code: 'IN', name: 'India', currency: 'INR' },
        { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
        { code: 'US', name: 'United States', currency: 'USD' },
      ],
      departments: [
        {
          name: 'Engineering',
          jobTitles: [
            'Engineering Manager',
            'QA Engineer',
            'Senior Software Engineer',
            'Software Engineer',
          ],
        },
        { name: 'Finance', jobTitles: ['Accountant', 'Finance Manager', 'Financial Analyst'] },
        { name: 'Human Resources', jobTitles: ['HR Generalist', 'HR Manager', 'Recruiter'] },
        {
          name: 'Marketing',
          jobTitles: ['Content Strategist', 'Marketing Manager', 'Marketing Specialist'],
        },
        { name: 'Operations', jobTitles: ['Operations Analyst', 'Operations Manager'] },
        {
          name: 'Sales',
          jobTitles: ['Account Executive', 'Sales Manager', 'Sales Representative'],
        },
      ],
    });
  });

  it('referenceRequiresSignIn', async () => {
    const res = await request(app()).get('/reference');

    expectProblem(res, 401, 'UNAUTHENTICATED');
  });
});
