/**
 * Local development values, and the file every other environment replaces.
 * Deployed builds swap in environment.production.ts or environment.stage.ts via
 * fileReplacements in angular.json; development and unit tests use this file
 * as is, so a test can import every environment directly (ADR-031).
 *
 * The backend reads PORT from the environment and .env.example sets 8081,
 * because 8080 is already taken on this machine.
 */
export const environment = {
  name: 'local',
  production: false,
  apiBaseUrl: 'http://localhost:8081',
};
