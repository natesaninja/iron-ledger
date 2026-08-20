import { describe, it } from "node:test";
import assert from "node:assert/strict";

globalThis.window = {
  matchMedia: () => ({ matches: false }),
};
globalThis.document = {
  documentElement: { classList: { add() {}, remove() {} } },
  getElementById: () => null,
};

const { prefersReducedMotion } = await import("../js/hud.js");

describe("prefersReducedMotion", () => {
  it("is false when matchMedia says so", () => {
    assert.equal(prefersReducedMotion(), false);
  });
});
