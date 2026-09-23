import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeFilename,
  getRoomDir,
  safeFilePath,
} from "../lib/storage";

describe("Storage Sandboxing & Sanitization", () => {
  describe("sanitizeFilename", () => {
    it("strips path traversal patterns", () => {
      assert.equal(sanitizeFilename("../../etc/passwd"), "passwd");
      assert.equal(sanitizeFilename("..\\windows\\system32"), "_windows_system32");
    });

    it("strips null bytes and control chars", () => {
      assert.equal(sanitizeFilename("bad\0file.txt"), "badfile.txt");
    });

    it("handles filenames without extension", () => {
      assert.equal(sanitizeFilename("readme"), "readme");
    });

    it("defaults empty or invalid names to unnamed_file", () => {
      assert.equal(sanitizeFilename(""), "unnamed_file");
      assert.equal(sanitizeFilename(".."), "unnamed_file");
      assert.equal(sanitizeFilename("."), "unnamed_file");
    });

    it("truncates excessively long filenames", () => {
      const long = "a".repeat(300) + ".pdf";
      const sanitized = sanitizeFilename(long);
      assert.ok(sanitized.length <= 200);
      assert.ok(sanitized.endsWith(".pdf"));
    });
  });

  describe("safeFilePath and path traversal protection", () => {
    const validRoomId = "507f1f77bcf86cd799439011";

    it("resolves valid filenames within the room directory", () => {
      const safe = safeFilePath(validRoomId, "test.pdf");
      const roomDir = getRoomDir(validRoomId);
      assert.ok(safe.startsWith(roomDir));
    });

    it("throws on path traversal attempt", () => {
      assert.throws(() => {
        safeFilePath(validRoomId, "../other-room/secret.txt");
      }, /Path traversal detected/);

      assert.throws(() => {
        safeFilePath(validRoomId, "/etc/passwd");
      }, /Path traversal detected/);
    });

    it("validates roomId format strictly", () => {
      assert.throws(() => {
        getRoomDir("../invalid");
      }, /Invalid room ID format/);
    });
  });
});
