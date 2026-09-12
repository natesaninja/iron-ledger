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

describe("saveState quota", () => {
  beforeEach(() => {
    for (const k of Object.keys(mem)) delete mem[k];
  });

  it("clears the snapshot and retries the live write", () => {
    saveState({ trainingDays: ["a"], logs: {}, completedSessions: {} });
    assert.equal(hasAutosave(), false);

    saveState({ trainingDays: ["b"], logs: {}, completedSessions: {} });
    assert.equal(hasAutosave(), true);

    let liveWrites = 0;
    const origSet = globalThis.localStorage.setItem;
    globalThis.localStorage.setItem = function (k, v) {
      if (k === "strengthledger_v1") {
        liveWrites += 1;
        if (liveWrites === 1) {
          const err = new Error("quota");
          err.name = "QuotaExceededError";
          throw err;
        }
      }
      return origSet.call(this, k, v);
    };
    try {
      const out = saveState({ trainingDays: ["c"], logs: {}, completedSessions: {} });
      assert.deepEqual(out.trainingDays, ["c"]);
      assert.equal(liveWrites, 2);
      assert.equal(hasAutosave(), false);
      assert.deepEqual(loadState().trainingDays, ["c"]);
    } finally {
      globalThis.localStorage.setItem = origSet;
    }
  });

  it("throws when the retry still cannot write", () => {
    const origSet = globalThis.localStorage.setItem;
    globalThis.localStorage.setItem = function (k, v) {
      if (k === "strengthledger_v1") {
        const err = new Error("quota");
        err.name = "QuotaExceededError";
        throw err;
      }
      return origSet.call(this, k, v);
    };
    try {
      assert.throws(
        () => saveState({ trainingDays: ["x"], logs: {}, completedSessions: {} }),
        { name: "QuotaExceededError" }
      );
    } finally {
      globalThis.localStorage.setItem = origSet;
    }
  });
});
