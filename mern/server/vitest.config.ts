import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // The first run pulls the MongoDB image and starts a container.
    hookTimeout: 180_000,
    testTimeout: 30_000,
  },
});
