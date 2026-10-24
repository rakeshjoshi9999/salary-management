/**
 * Stage values (ADR-030), swapped in for environment.ts by the stage build
 * configuration, which Vercel selects for the stage branch. It must never point
 * at production's API: stage writes would land in production data.
 */
export const environment = {
  name: 'stage',
  production: true,
  apiBaseUrl: 'https://salary-management-api-stage.onrender.com',
};
