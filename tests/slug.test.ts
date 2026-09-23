import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateSlug } from "../lib/slug";

describe("Slug Generator", () => {
  it("generates a slug in XX-XX-XX format", () => {
    const slug = generateSlug();
    assert.match(slug, /^[A-HJ-NP-Z0-9]{2}-[A-HJ-NP-Z0-9]{2}-[A-HJ-NP-Z0-9]{2}$/);
  });

  it("generates 8 characters total including hyphens", () => {
    const slug = generateSlug();
    assert.equal(slug.length, 8);
  });

  it("does not contain confusing characters I or O", () => {
    for (let i = 0; i < 50; i++) {
      const slug = generateSlug();
      assert.ok(!slug.includes("I"), "Slug should not contain I");
      assert.ok(!slug.includes("O"), "Slug should not contain O");
    }
  });

  it("generates unique slugs", () => {
    const set = new Set<string>();
    for (let i = 0; i < 100; i++) {
      set.add(generateSlug());
    }
    assert.equal(set.size, 100);
  });
});
