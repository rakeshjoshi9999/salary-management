/**
 * Production values. Swapped for environment.development.ts in development
 * builds via the fileReplacements entry in angular.json.
 */
export const environment = {
  production: true,
  // Render appends a random suffix when a service name is already taken
  // globally, so this is not derivable from the service name alone.
  apiBaseUrl: 'https://salary-management-api-tzf8.onrender.com',
};
