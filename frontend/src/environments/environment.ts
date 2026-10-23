/**
 * Production values. Swapped for environment.development.ts in development
 * builds via the fileReplacements entry in angular.json.
 */
export const environment = {
  production: true,
  // TODO(task 1.7): replace once the Render service URL exists.
  // Deliberately an invalid host so a forgotten value fails loudly
  // instead of silently issuing same-origin requests.
  apiBaseUrl: 'https://REPLACE-ME-TASK-1-7.onrender.com',
};
