import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';

import { setAccessToken } from '../lib/token';
import { server } from './server';

/**
 * Requests no handler answered during the current test. MSW's own 'error' strategy only makes `fetch`
 * reject, which the wrapper turns into an ordinary NETWORK_ERROR: a test expecting "unreachable" would
 * then pass against the wrong URL. Recording them and failing in `afterEach` closes that hole.
 */
const unhandled: string[] = [];

beforeAll(() =>
  server.listen({
    onUnhandledFrame: ({ frame, defaults }) => {
      const data = frame.data as { request?: Request };
      unhandled.push(data.request ? `${data.request.method} ${data.request.url}` : frame.protocol);
      defaults.error();
    },
  }),
);

afterEach(() => {
  cleanup(); // unmount what the test rendered (Vitest globals are off, so RTL cannot do it itself)
  server.resetHandlers();
  setAccessToken(null); // the token holder is module state: no test inherits a session
  const missed = unhandled.splice(0);
  if (missed.length > 0) {
    throw new Error(`Requests with no MSW handler: ${missed.join(', ')}`);
  }
});

afterAll(() => server.close());
