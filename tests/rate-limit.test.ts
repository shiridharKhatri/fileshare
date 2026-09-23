import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkRateLimit } from "../lib/rate-limit";

describe("Rate Limiter", () => {
  it("allows requests within the limit", () => {
    const key = `test-key-${Date.now()}`;
    const opts = { max: 3, windowMs: 1000 };

    const r1 = checkRateLimit(key, opts);
    assert.equal(r1.allowed, true);
    assert.equal(r1.remaining, 2);

    const r2 = checkRateLimit(key, opts);
    assert.equal(r2.allowed, true);
    assert.equal(r2.remaining, 1);

    const r3 = checkRateLimit(key, opts);
    assert.equal(r3.allowed, true);
    assert.equal(r3.remaining, 0);
  });

  it("locks out when exceeding the limit", () => {
    const key = `lockout-key-${Date.now()}`;
    const opts = { max: 2, windowMs: 2000, lockoutMs: 5000 };

    checkRateLimit(key, opts); // 1
    checkRateLimit(key, opts); // 2

    const blocked = checkRateLimit(key, opts); // 3 (exceeded)
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.remaining, 0);
    assert.ok(blocked.retryAfterMs! > 0);

    // Subsequent call during lockout should also be blocked
    const stillBlocked = checkRateLimit(key, opts);
    assert.equal(stillBlocked.allowed, false);
  });
});
