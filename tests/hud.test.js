import { describe, it } from "node:test";
import assert from "node:assert/strict";

globalThis.window = {
  matchMedia: () => ({ matches: false }),
};
globalThis.document = {
  documentElement: { classList: { add() {}, remove() {} } },
  getElementById: () => null,
};

const {
  prefersReducedMotion,
  shouldRunHudBoot,
  markHudBootSeen,
  HUD_BOOT_SEEN_KEY,
} = await import("../js/hud.js");

describe("prefersReducedMotion", () => {
  it("is false when matchMedia says so", () => {
    assert.equal(prefersReducedMotion(), false);
  });
});

describe("shouldRunHudBoot", () => {
  it("skips when reduced motion is on", () => {
    assert.equal(shouldRunHudBoot({ version: "24.8", reducedMotion: true, storage: null }), false);
  });

  it("plays on first session when nothing is stored", () => {
    const storage = { getItem() { return null; } };
    assert.equal(shouldRunHudBoot({ version: "24.8", reducedMotion: false, storage }), true);
  });

  it("skips once the same version has been seen", () => {
    const mem = {};
    const storage = {
      getItem(k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
      setItem(k, v) { mem[k] = String(v); },
    };
    markHudBootSeen("24.8", storage);
    assert.equal(mem[HUD_BOOT_SEEN_KEY], "24.8");
    assert.equal(shouldRunHudBoot({ version: "24.8", reducedMotion: false, storage }), false);
  });

  it("plays again after a version bump", () => {
    const storage = {
      getItem() { return "24.8"; },
    };
    assert.equal(shouldRunHudBoot({ version: "24.9", reducedMotion: false, storage }), true);
  });
});
