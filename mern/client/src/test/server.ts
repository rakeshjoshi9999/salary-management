import { setupServer } from 'msw/node';

/**
 * One fake backend for every test. It starts with no handlers: each test declares the responses it
 * needs with `server.use(...)`, so what a test depends on is written in the test.
 */
export const server = setupServer();
