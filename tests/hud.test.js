import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

const store = Object.create(null);
globalThis.localStorage = {
  getItem(k) {
    return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null;
  },
  setItem(k, v) {
    store[k] = String(v);
  },
  removeItem(k) {
    delete store[k];
  },
};
globalThis.window = {
  matchMedia: () => ({ matches: false }),
  AudioContext: undefined,
  webkitAudioContext: undefined,
};
globalThis.document = {
  documentElement: { classList: { add() {}, remove() {} } },
  getElementById: () => null,
  addEventListener() {},
  removeEventListener() {},
};

const { AUDIO_KEY, isHudAudioOn, setHudAudioOn, prefersReducedMotion } = await import("../js/hud.js");

describe("hud audio preference", () => {
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
  });

  it("defaults to on", () => {
    assert.equal(isHudAudioOn(), true);
  });

  it("persists mute", () => {
    setHudAudioOn(false);
    assert.equal(store[AUDIO_KEY], "off");
    assert.equal(isHudAudioOn(), false);
    setHudAudioOn(true);
    assert.equal(isHudAudioOn(), true);
  });
});

describe("prefersReducedMotion", () => {
  it("is false when matchMedia says so", () => {
    assert.equal(prefersReducedMotion(), false);
  });
});
