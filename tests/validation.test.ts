import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  slugSchema,
  passcodeSchema,
  expirationSchema,
  createRoomSchema,
  messageSchema,
  objectIdSchema,
} from "../lib/validation";

describe("Validation Schemas", () => {
  describe("slugSchema", () => {
    it("accepts valid alphanumeric slugs", () => {
      assert.ok(slugSchema.safeParse("AB-12-CD").success);
      assert.ok(slugSchema.safeParse("my-cool-room").success);
      assert.ok(slugSchema.safeParse("room123").success);
    });

    it("rejects invalid slugs", () => {
      assert.ok(!slugSchema.safeParse("a").success); // too short
      assert.ok(!slugSchema.safeParse("-leading-hyphen").success);
      assert.ok(!slugSchema.safeParse("trailing-hyphen-").success);
      assert.ok(!slugSchema.safeParse("has spaces").success);
      assert.ok(!slugSchema.safeParse("has$special!char").success);
    });
  });

  describe("passcodeSchema", () => {
    it("accepts exactly 4 digits", () => {
      assert.ok(passcodeSchema.safeParse("1234").success);
      assert.ok(passcodeSchema.safeParse("0000").success);
      assert.ok(passcodeSchema.safeParse("9876").success);
    });

    it("rejects non-4-digit strings", () => {
      assert.ok(!passcodeSchema.safeParse("123").success);
      assert.ok(!passcodeSchema.safeParse("12345").success);
      assert.ok(!passcodeSchema.safeParse("abcd").success);
      assert.ok(!passcodeSchema.safeParse("12a4").success);
    });
  });

  describe("expirationSchema", () => {
    it("accepts 10, 18, and 24 hours", () => {
      assert.ok(expirationSchema.safeParse(10).success);
      assert.ok(expirationSchema.safeParse(18).success);
      assert.ok(expirationSchema.safeParse(24).success);
    });

    it("rejects invalid hours", () => {
      assert.ok(!expirationSchema.safeParse(1).success);
      assert.ok(!expirationSchema.safeParse(12).success);
      assert.ok(!expirationSchema.safeParse(48).success);
      assert.ok(!expirationSchema.safeParse("18").success);
    });
  });

  describe("createRoomSchema", () => {
    it("validates full room creation payload", () => {
      const valid = createRoomSchema.safeParse({
        slug: "test-room",
        passcode: "1234",
        expirationHours: 18,
      });
      assert.ok(valid.success);
    });

    it("allows optional slug for auto-generation", () => {
      const valid = createRoomSchema.safeParse({
        passcode: "1234",
        expirationHours: 18,
      });
      assert.ok(valid.success);
    });
  });

  describe("messageSchema", () => {
    it("validates message content", () => {
      assert.ok(messageSchema.safeParse({ content: "Hello world" }).success);
      assert.ok(!messageSchema.safeParse({ content: "" }).success);
    });
  });

  describe("objectIdSchema", () => {
    it("validates 24-char hex strings", () => {
      assert.ok(objectIdSchema.safeParse("507f1f77bcf86cd799439011").success);
      assert.ok(!objectIdSchema.safeParse("not-a-valid-id").success);
      assert.ok(!objectIdSchema.safeParse("507f1f77bcf86cd79943901").success); // 23 chars
    });
  });
});
