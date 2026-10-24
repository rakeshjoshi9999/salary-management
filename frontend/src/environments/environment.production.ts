/**
 * Production values, swapped in for environment.ts by the production build
 * configuration in angular.json.
 */
export const environment = {
  name: 'production',
  production: true,
  // Render appends a random suffix when a service name is already taken
  // globally, so this is not derivable from the service name alone.
  apiBaseUrl: 'https://salary-management-api-tzf8.onrender.com',
};
