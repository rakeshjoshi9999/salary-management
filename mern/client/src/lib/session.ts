/**
 * "The session is over": raised by the fetch wrapper when a refresh fails during use, heard by
 * `AuthProvider`. The observer pattern, React-free: the twin of an RxJS `Subject` in an Angular service.
 */
const listeners = new Set<() => void>();

/** Subscribes; returns the unsubscribe, ready to be a `useEffect` cleanup. */
export function onSessionExpired(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitSessionExpired(): void {
  listeners.forEach((listener) => listener());
}
