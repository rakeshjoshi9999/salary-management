type LockCallback = (lock: { name: string; mode: 'exclusive' }) => Promise<unknown>;

/**
 * jsdom has no Web Locks API. This fake runs callbacks one at a time per lock name, like a browser, and
 * records what happened so a test can see what ran while the lock was held. It accepts both call forms:
 * `request(name, callback)` and `request(name, options, callback)`.
 */
export function installFakeLocks() {
  const events: string[] = [];
  const tails = new Map<string, Promise<unknown>>();
  const locks = {
    request: (name: string, second: unknown, third?: unknown) => {
      const callback = (typeof second === 'function' ? second : third) as LockCallback;
      const previous = tails.get(name) ?? Promise.resolve();
      const run = previous.then(async () => {
        events.push(`acquire ${name}`);
        try {
          return await callback({ name, mode: 'exclusive' });
        } finally {
          events.push(`release ${name}`);
        }
      });
      tails.set(
        name,
        run.catch(() => undefined),
      );
      return run;
    },
  };
  Object.defineProperty(navigator, 'locks', { value: locks, configurable: true });
  return {
    events,
    uninstall: () => {
      delete (navigator as unknown as { locks?: unknown }).locks;
    },
  };
}
