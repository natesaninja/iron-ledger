import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

const mem = Object.create(null);
globalThis.localStorage = {
  getItem(k) {
    return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null;
  },
  setItem(k, v) {
    mem[k] = String(v);
  },
  removeItem(k) {
    delete mem[k];
  },
};

const { saveState, loadState, hasAutosave, restoreAutosave, SNAP_KEY } = await import("../js/store.js");

describe("autosave snapshot", () => {
  beforeEach(() => {
    for (const k of Object.keys(mem)) delete mem[k];
  });

  it("keeps the previous save when writing a new one", () => {
    saveState({ trainingDays: ["2026-08-18"], logs: {}, completedSessions: {} });
    saveState({ trainingDays: ["2026-08-18", "2026-08-20"], logs: {}, completedSessions: {} });
    assert.equal(hasAutosave(), true);
    const snap = JSON.parse(mem[SNAP_KEY]);
    assert.deepEqual(snap.trainingDays, ["2026-08-18"]);
    assert.deepEqual(loadState().trainingDays, ["2026-08-18", "2026-08-20"]);
  });

  it("restores the previous snapshot without eating it", () => {
    saveState({ trainingDays: ["a"], logs: {}, completedSessions: {} });
    saveState({ trainingDays: ["b"], logs: {}, completedSessions: {} });
    const restored = restoreAutosave();
    assert.deepEqual(restored.trainingDays, ["a"]);
    assert.equal(hasAutosave(), true);
  });
});
