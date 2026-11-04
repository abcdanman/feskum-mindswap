'use client';

/**
 * Tiny in-memory cache for client components. Module state survives
 * Next.js client-side route navigation (it's the same JS session) even
 * though each page remounts and re-runs its data-fetching useEffect — so
 * this is what makes flipping between tabs (Home/Booths/Talks) feel
 * instant on the 2nd+ visit instead of re-hitting the API every time.
 *
 * Only use this for data that's shared across visitors and rarely
 * changes (checkpoints, speakers, reward/voting settings) — never for
 * visitor-specific or frequently-mutated data like the leaderboard or a
 * visitor's own visits/rank.
 */
const cache = new Map<string, { data: unknown; expiresAt: number }>();
const inFlight = new Map<string, Promise<unknown>>();

export async function cachedFetch<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const entry = cache.get(key);
  if (entry && entry.expiresAt > now) return entry.data as T;

  const pending = inFlight.get(key);
  if (pending) return pending as Promise<T>;

  const promise = fetcher()
    .then(data => {
      cache.set(key, { data, expiresAt: Date.now() + ttlMs });
      return data;
    })
    .finally(() => {
      inFlight.delete(key);
    });
  inFlight.set(key, promise);
  return promise;
}

export function invalidateCached(prefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}
