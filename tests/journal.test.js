import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  patchExerciseJournal,
  patchSessionJournal,
  buildJournalInsights,
} from "../js/journal.js";
import { migrateState, STORE_VERSION } from "../js/store.js";

describe("journal patches", () => {
  it("patches exercise journal with timestamp", () => {
    const row = patchExerciseJournal(null, { pain: 2, energyHit: 1, jointOk: false });
    assert.equal(row.pain, 2);
    assert.equal(row.energyHit, 1);
    assert.equal(row.jointOk, false);
    assert.ok(row.at);
  });

  it("patches session journal painAreas", () => {
    const row = patchSessionJournal(null, {
      energy: 3,
      mood: 4,
      fuel: "under",
      painAreas: ["knee", "low_back"],
      alcohol: true,
    });
    assert.equal(row.energy, 3);
    assert.equal(row.fuel, "under");
    assert.deepEqual(row.painAreas, ["knee", "low_back"]);
  });
});

describe("buildJournalInsights", () => {
  it("returns empty hint with no data", () => {
    const { items } = buildJournalInsights({});
    assert.ok(items.some((i) => i.id === "journal-empty"));
  });

  it("flags sleep → low energy when enough samples", () => {
    const sessionJournal = {};
    for (let i = 1; i <= 8; i++) {
      const d = `2026-08-${String(i).padStart(2, "0")}`;
      sessionJournal[d] = {
        at: `${d}T12:00:00.000Z`,
        sleepQuality: i <= 4 ? 1 : 4,
        energy: i <= 4 ? 1 : 4,
        mood: 3,
      };
    }
    const { items } = buildJournalInsights({
      sessionJournal,
      today: "2026-08-10",
      completedSessions: Object.fromEntries(
        Object.keys(sessionJournal).map((d) => [d, { completed: true }])
      ),
    });
    assert.ok(items.some((i) => i.id === "journal-sleep-energy" || i.id === "journal-recent-avg"));
  });
});

describe("store v6", () => {
  it("migrates journal maps", () => {
    assert.equal(STORE_VERSION, 6);
    const m = migrateState({ version: 5, settings: {} });
    assert.ok(m.exerciseJournal);
    assert.ok(m.sessionJournal);
    assert.equal(m.version, 6);
  });
});
