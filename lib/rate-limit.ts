/**
 * In-memory sliding window rate limiter.
 * Tracks attempts per key (typically IP + action) within configurable windows.
 */

interface RateLimitEntry {
  timestamps: number[];
  lockedUntil?: number;
}

const store = new Map<string, RateLimitEntry>();

// Periodic cleanup of expired entries (every 5 minutes)
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    // Remove entries with no recent timestamps and no active lock
    if (
      entry.timestamps.length === 0 &&
      (!entry.lockedUntil || entry.lockedUntil < now)
    ) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);
if (cleanupInterval.unref) {
  cleanupInterval.unref();
}

interface RateLimitOptions {
  /** Maximum number of attempts allowed in the window */
  max: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Lockout duration in milliseconds after exceeding max (default: same as window) */
  lockoutMs?: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
}

export function checkRateLimit(
  key: string,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key) || { timestamps: [] };

  // Check if currently locked out
  if (entry.lockedUntil && entry.lockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: entry.lockedUntil - now,
    };
  }

  // Clear expired lock
  if (entry.lockedUntil && entry.lockedUntil <= now) {
    entry.lockedUntil = undefined;
    entry.timestamps = [];
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter(
    (t) => now - t < options.windowMs
  );

  const remaining = Math.max(0, options.max - entry.timestamps.length);

  if (entry.timestamps.length >= options.max) {
    // Lock out
    entry.lockedUntil = now + (options.lockoutMs || options.windowMs);
    store.set(key, entry);
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: options.lockoutMs || options.windowMs,
    };
  }

  // Record this attempt
  entry.timestamps.push(now);
  store.set(key, entry);

  return {
    allowed: true,
    remaining: remaining - 1,
  };
}

/**
 * Pre-configured rate limit checkers for different actions.
 */
export const rateLimiters = {
  /** 5 auth attempts per 15 minutes per IP+slug */
  auth: (ip: string, slug: string) =>
    checkRateLimit(`auth:${ip}:${slug}`, {
      max: 5,
      windowMs: 15 * 60 * 1000,
      lockoutMs: 15 * 60 * 1000,
    }),

  /** 10 room creations per hour per IP */
  createRoom: (ip: string) =>
    checkRateLimit(`create:${ip}`, {
      max: 10,
      windowMs: 60 * 60 * 1000,
    }),

  /** 30 uploads per minute per session */
  upload: (sessionId: string) =>
    checkRateLimit(`upload:${sessionId}`, {
      max: 30,
      windowMs: 60 * 1000,
    }),

  /** 20 messages per minute per session */
  message: (sessionId: string) =>
    checkRateLimit(`msg:${sessionId}`, {
      max: 20,
      windowMs: 60 * 1000,
    }),

  /** 60 downloads per minute per session */
  download: (sessionId: string) =>
    checkRateLimit(`dl:${sessionId}`, {
      max: 60,
      windowMs: 60 * 1000,
    }),
};
