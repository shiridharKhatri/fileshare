import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  hashPasscode,
  verifyPasscode,
  createRoomSession,
  verifyRoomSession,
} from "../lib/auth";

describe("Auth Utilities", () => {
  it("hashes and verifies 4-digit passcode correctly", async () => {
    const code = "4829";
    const hash = await hashPasscode(code);

    assert.ok(hash !== code);
    assert.ok(await verifyPasscode(code, hash));
    assert.ok(!(await verifyPasscode("0000", hash)));
  });

  it("creates and verifies JWT room session", async () => {
    const roomId = "507f1f77bcf86cd799439011";
    const slug = "AB-12-CD";

    const { token, sessionId } = await createRoomSession(roomId, slug);
    assert.ok(token);
    assert.ok(sessionId);

    const payload = await verifyRoomSession(token);
    assert.ok(payload);
    assert.equal(payload.roomId, roomId);
    assert.equal(payload.slug, slug);
    assert.equal(payload.sessionId, sessionId);
  });

  it("fails verification on tampered JWT token", async () => {
    const { token } = await createRoomSession("507f1f77bcf86cd799439011", "AB-12-CD");
    const tampered = token.slice(0, -5) + "abcde";

    const payload = await verifyRoomSession(tampered);
    assert.equal(payload, null);
  });
});
