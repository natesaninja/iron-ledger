# Equipment, Programs & Custom Training Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let home-gym friends set equipment once, run named programs (BBB + bodybuilding templates), or set custom weekly muscle targets — while keeping MED Auto for existing users.

**Architecture:** Shared equipment filter on the exercise library. Three training modes: `med` and `custom` use `buildPlan` (custom multiplies weekly muscle targets); `program` uses a new template runner that maps weekly train days to fixed session slots. Store schema v4; local-only PWA unchanged.

**Tech Stack:** Vanilla ES modules, localStorage (`store.js`), Node test runner (`node --test`), static GitHub Pages deploy.

**Spec:** `docs/superpowers/specs/2026-08-09-equipment-programs-custom-design.md`

## Global Constraints

- Equipment: boolean checklist only (no weight inventory v1)
- `settings.equipment === null` → full library (backward compatible)
- Programs are educational templates with attribution — no copyrighted book text
- Program slot mapping: **per calendar week restart** at slot 0 (Mon-start weekKey)
- Exclude / swap / split already unlocked at all coach stages — do not re-lock
- Bump `sw.js` CACHE string on each user-facing deploy
- Tests: `cd strengthledger && npm test`
- Commits: small, imperative subjects; do not force-push

---

## File map

| File | Responsibility |
|------|----------------|
| `js/equipment.js` | **Create.** Keys, presets, `isExerciseAvailable`, `filterExercises`, `applyEquipmentPreset` |
| `js/programs.js` | **Create.** Program defs, schemes, slot assignment, `buildProgramPlan` |
| `js/data.js` | Add `requires: string[]` on each exercise; export equipment key labels if needed |
| `js/planner.js` | Equipment gate in `scoreEx`/`pickEx`/`listSubstitutes`; `weeklyTarget` honors `customTargets` when mode is custom |
| `js/logging.js` | Substitutes respect equipment |
| `js/store.js` | `STORE_VERSION` 4 + migration defaults |
| `js/data.js` `DEFAULT_SETTINGS` | `trainingMode`, `activeProgramId`, `equipment`, `customTargets`, `trainingMaxes`, etc. |
| `js/app.js` | Mode UI, equipment UI, custom targets UI, plan rebuild router, onboarding steps |
| `js/coach.js` | Mission copy per mode |
| `index.html` | Settings cards for mode / equipment / programs / custom |
| `css/app.css` | Minimal layout for new cards/chips |
| `tests/equipment.test.js` | **Create** |
| `tests/programs.test.js` | **Create** |
| `tests/logging.test.js` | Extend store migrate assertion for v4 |
| `sw.js` | Cache bump |
| `README.md` | Feature bullets |

---

### Task 1: Equipment module + unit tests

**Files:**
- Create: `js/equipment.js`
- Create: `tests/equipment.test.js`

**Interfaces:**
- Produces:
  - `EQUIPMENT_KEYS: string[]`
  - `EQUIPMENT_LABELS: Record<string, string>`
  - `emptyEquipment(): Record<string, boolean>` — all false
  - `fullEquipment(): Record<string, boolean>` — all true
  - `applyEquipmentPreset(id: "gym"|"home_barbell"|"db_only"|"minimal"): Record<string, boolean> | null` — `"gym"` returns conceptually full; callers may set `equipment` null for gym
  - `isExerciseAvailable(ex: {requires?: string[]}, equipment: object|null|undefined): boolean`
  - `filterExercises(exercises: array, equipment): array`
  - `missingEquipment(ex, equipment): string[]`

- [ ] **Step 1: Write failing tests**

Create `tests/equipment.test.js`:

```js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isExerciseAvailable,
  filterExercises,
  applyEquipmentPreset,
  fullEquipment,
} from "../js/equipment.js";

describe("isExerciseAvailable", () => {
  it("allows all when equipment is null", () => {
    assert.equal(isExerciseAvailable({ requires: ["cables"] }, null), true);
  });
  it("requires every flag", () => {
    const eq = { ...fullEquipment(), cables: false, machines: false };
    assert.equal(isExerciseAvailable({ requires: ["cables"] }, eq), false);
    assert.equal(isExerciseAvailable({ requires: ["dumbbells"] }, eq), true);
    assert.equal(isExerciseAvailable({ requires: [] }, eq), true);
    assert.equal(isExerciseAvailable({}, eq), true);
  });
});

describe("filterExercises", () => {
  it("drops cable-only when no cables", () => {
    const list = [
      { id: "a", requires: ["cables"] },
      { id: "b", requires: ["dumbbells"] },
    ];
    const eq = applyEquipmentPreset("db_only");
    const ids = filterExercises(list, eq).map((e) => e.id);
    assert.deepEqual(ids, ["b"]);
  });
});

describe("presets", () => {
  it("home_barbell has barbell and rack", () => {
    const eq = applyEquipmentPreset("home_barbell");
    assert.equal(eq.barbell, true);
    assert.equal(eq.rack, true);
    assert.equal(eq.machines, false);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```powershell
cd $env:USERPROFILE\strengthledger
node --test tests/equipment.test.js
```

Expected: cannot find module `../js/equipment.js`

- [ ] **Step 3: Implement `js/equipment.js`**

```js
/** Home / gym equipment checklist helpers */

export const EQUIPMENT_KEYS = [
  "barbell",
  "plates",
  "rack",
  "flatBench",
  "dumbbells",
  "pullUpBar",
  "bands",
  "cables",
  "kettlebells",
  "machines",
  "landmine",
];

export const EQUIPMENT_LABELS = {
  barbell: "Barbell",
  plates: "Plates",
  rack: "Squat/bench rack or stands",
  flatBench: "Flat bench",
  dumbbells: "Dumbbells",
  pullUpBar: "Pull-up bar",
  bands: "Resistance bands",
  cables: "Cables / functional trainer",
  kettlebells: "Kettlebells",
  machines: "Machines (selectorized or plate)",
  landmine: "Landmine",
};

export function emptyEquipment() {
  return Object.fromEntries(EQUIPMENT_KEYS.map((k) => [k, false]));
}

export function fullEquipment() {
  return Object.fromEntries(EQUIPMENT_KEYS.map((k) => [k, true]));
}

/**
 * @param {"gym"|"home_barbell"|"db_only"|"minimal"} id
 * @returns {Record<string, boolean>}
 */
export function applyEquipmentPreset(id) {
  if (id === "gym") return fullEquipment();
  if (id === "home_barbell") {
    return {
      ...emptyEquipment(),
      barbell: true,
      plates: true,
      rack: true,
      flatBench: true,
      pullUpBar: true,
      dumbbells: true,
    };
  }
  if (id === "db_only") {
    return {
      ...emptyEquipment(),
      dumbbells: true,
      flatBench: true,
      bands: true,
      pullUpBar: true,
    };
  }
  if (id === "minimal") {
    return {
      ...emptyEquipment(),
      pullUpBar: true,
      bands: true,
    };
  }
  return fullEquipment();
}

/** null/undefined equipment = unrestricted (legacy commercial gym). */
export function isExerciseAvailable(ex, equipment) {
  if (equipment == null) return true;
  const req = ex?.requires;
  if (!req || !req.length) return true;
  return req.every((k) => equipment[k] === true);
}

export function filterExercises(exercises, equipment) {
  return (exercises || []).filter((ex) => isExerciseAvailable(ex, equipment));
}

export function missingEquipment(ex, equipment) {
  if (equipment == null) return [];
  const req = ex?.requires || [];
  return req.filter((k) => equipment[k] !== true);
}
```

- [ ] **Step 4: Run tests — expect PASS**

```powershell
node --test tests/equipment.test.js
```

- [ ] **Step 5: Commit**

```powershell
git add js/equipment.js tests/equipment.test.js
git commit -m "Add equipment checklist helpers and tests"
```

---

### Task 2: Tag exercises with `requires` + store v4 + DEFAULT_SETTINGS

**Files:**
- Modify: `js/data.js` (every exercise in `EXERCISES` + `DEFAULT_SETTINGS`)
- Modify: `js/store.js` (`STORE_VERSION = 4`, migration)
- Modify: `tests/logging.test.js` (migrate asserts version 4)

**Interfaces:**
- Consumes: equipment key names from Task 1
- Produces: exercises with `requires: string[]`; settings defaults for new fields

**Exercise `requires` map (apply exactly):**

| id | requires |
|----|----------|
| bb_back_squat | barbell, plates, rack |
| leg_press | machines |
| hack_squat | machines |
| leg_extension | machines |
| rdl | barbell, plates |
| conventional_dl | barbell, plates |
| seated_leg_curl | machines |
| hip_thrust | barbell, plates, flatBench |
| cable_pull_through | cables |
| bb_bench | barbell, plates, flatBench, rack |
| db_bench | dumbbells, flatBench |
| incline_db_press | dumbbells, flatBench |
| chest_press_machine | machines |
| cable_fly | cables |
| ohp | barbell, plates |
| db_shoulder_press | dumbbells |
| machine_shoulder_press | machines |
| lateral_raise | dumbbells |
| cable_lateral | cables |
| face_pull | cables |
| reverse_pec_deck | machines |
| pullup | pullUpBar |
| lat_pulldown | machines |
| bb_row | barbell, plates |
| chest_supported_row | machines |
| seated_cable_row | cables |
| straight_arm_pulldown | cables |
| bb_curl | barbell, plates |
| db_curl | dumbbells |
| triceps_pushdown | cables |
| oh_triceps_ext | dumbbells |
| standing_calf | machines |
| seated_calf | machines |
| cable_crunch | cables |
| plank | [] |
| shrug | dumbbells |
| back_extension | machines |
| walking_lunge | dumbbells |

Add as property on each object, e.g. `requires: ["barbell", "plates", "rack"],` before or after `why`.

**DEFAULT_SETTINGS additions:**

```js
trainingMode: "med", // "med" | "program" | "custom"
activeProgramId: null,
equipment: null,
equipmentPreset: null,
customTargets: null,
trainingMaxes: { squat: null, bench: null, deadlift: null, press: null },
bbbSupplementalPct: 0.5,
programWeekOffset: 0, // 0–3 for 5/3/1 wave
```

**store.js:**

```js
export const STORE_VERSION = 4;
// in migrateState after v3 block:
if (ver < 4) {
  if (data.settings && typeof data.settings === "object") {
    if (data.settings.trainingMode == null) data.settings.trainingMode = "med";
    if (data.settings.activeProgramId === undefined) data.settings.activeProgramId = null;
    if (data.settings.equipment === undefined) data.settings.equipment = null;
    if (data.settings.equipmentPreset === undefined) data.settings.equipmentPreset = null;
    if (data.settings.customTargets === undefined) data.settings.customTargets = null;
    if (!data.settings.trainingMaxes) {
      data.settings.trainingMaxes = { squat: null, bench: null, deadlift: null, press: null };
    }
    if (data.settings.bbbSupplementalPct == null) data.settings.bbbSupplementalPct = 0.5;
    if (data.settings.programWeekOffset == null) data.settings.programWeekOffset = 0;
  }
}
```

Update test that checks `STORE_VERSION` to expect `4`.

- [ ] **Step 1: Apply tags + settings + migration**
- [ ] **Step 2: Run full suite**

```powershell
npm test
```

Expected: all pass (equipment tests + existing)

- [ ] **Step 3: Commit**

```powershell
git add js/data.js js/store.js tests/logging.test.js
git commit -m "Tag exercises with equipment requires; store v4 settings"
```

---

### Task 3: Wire equipment into planner + substitutes

**Files:**
- Modify: `js/planner.js` — `scoreEx` reject unavailable; `listSubstitutes` filter
- Modify: `js/logging.js` — substitute ranking filter by equipment

**Interfaces:**
- Consumes: `isExerciseAvailable(ex, settings.equipment)`
- Produces: plan never picks unequipped lifts when equipment configured

- [ ] **Step 1: Write failing planner integration test**

Create `tests/planner-equipment.test.js`:

```js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildPlan } from "../js/planner.js";
import { DEFAULT_SETTINGS } from "../js/data.js";
import { applyEquipmentPreset } from "../js/equipment.js";

describe("buildPlan equipment", () => {
  it("never schedules cable lifts for db_only gym", () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      equipment: applyEquipmentPreset("db_only"),
      excludedExercises: [],
      preferredExercises: [],
      splitPreference: "full_body",
      sessionMinutes: 55,
    };
    const plan = buildPlan(["2026-08-04", "2026-08-06", "2026-08-08"], settings);
    const ids = plan.sessions.flatMap((s) => s.exercises.map((e) => e.exerciseId || e.id));
    // cable_fly etc. must not appear
    const banned = new Set(["cable_fly", "face_pull", "seated_cable_row", "lat_pulldown", "leg_press"]);
    for (const id of ids) assert.equal(banned.has(id), false, id);
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (cable/machine lifts still picked)

- [ ] **Step 3: Implement gate in `scoreEx`**

At top of `scoreEx` after excluded check:

```js
import { isExerciseAvailable } from "./equipment.js";
// ...
if (!isExerciseAvailable(ex, settings.equipment)) return -1e9;
```

In `listSubstitutes` / logging substitute loop, skip if `!isExerciseAvailable(e, settings.equipment)`.

- [ ] **Step 4: Run tests — PASS**

```powershell
npm test
```

- [ ] **Step 5: Commit**

```powershell
git add js/planner.js js/logging.js tests/planner-equipment.test.js
git commit -m "Filter planner and swaps by equipment profile"
```

---

### Task 4: Settings UI — equipment card

**Files:**
- Modify: `index.html` — card `#equipment-card` before exclude card
- Modify: `js/app.js` — render checkboxes, presets, save into `state.settings.equipment`
- Modify: `css/app.css` — only if checklist layout needs grid (use existing `check-list`)

**HTML sketch (insert in Settings):**

```html
<div class="card" id="equipment-card">
  <h2>My equipment</h2>
  <p class="hint">Home gym? Uncheck what you don’t have. Leave on Commercial gym for full library.</p>
  <div class="btn-row" id="equipment-presets">
    <button type="button" class="ghost-btn" data-eq-preset="gym">Commercial gym</button>
    <button type="button" class="ghost-btn" data-eq-preset="home_barbell">Home barbell</button>
    <button type="button" class="ghost-btn" data-eq-preset="db_only">Dumbbells</button>
    <button type="button" class="ghost-btn" data-eq-preset="minimal">Minimal</button>
  </div>
  <div class="check-list" id="equipment-list"></div>
</div>
```

**Save behavior:**
- Preset `gym` → `settings.equipment = null` (unrestricted) and `equipmentPreset = "gym"`
- Other presets → `settings.equipment = applyEquipmentPreset(id)`, `equipmentPreset = id`
- Manual checkbox edits → object with booleans, `equipmentPreset = "custom"`
- Save & rebuild already rebuilds plan

**Render:** populate `#equipment-list` from `EQUIPMENT_KEYS` + labels; if `equipment == null`, show all checked (visual gym).

- [ ] **Step 1: HTML + app.js wire + preset handlers**
- [ ] **Step 2: Manual smoke** — `.\run.bat`, Settings → Dumbbells → Save → Today has no lat pulldown
- [ ] **Step 3: Commit**

```powershell
git add index.html js/app.js css/app.css
git commit -m "Add My equipment settings card and presets"
```

---

### Task 5: Training mode shell + Custom targets

**Files:**
- Modify: `index.html` — mode select; `#custom-targets-card` (hidden unless custom)
- Modify: `js/planner.js` — `weeklyTarget` uses `customTargets` when `settings.trainingMode === "custom"`
- Modify: `js/app.js` — mode UI, custom multiplier chips, rebuild

**Interfaces:**
- `weeklyTarget(m, settings)`:

```js
function weeklyTarget(m, settings) {
  let t = m.weeklyMed * (settings.medMultiplier || 1);
  if (settings.trainingMode === "custom" && settings.customTargets && settings.customTargets[m.id] != null) {
    t *= settings.customTargets[m.id];
  }
  return t;
}
```

**Custom presets:**

```js
export const CUSTOM_TARGET_PRESETS = {
  balanced: {}, // treat as all 1.0 → store null
  push_focus: { chest: 1.25, front_delts: 1.2, side_delts: 1.15, triceps: 1.15 },
  pull_focus: { lats: 1.25, upper_back: 1.2, rear_delts: 1.15, biceps: 1.15 },
  legs_focus: { quads: 1.25, hamstrings: 1.2, glutes: 1.2, calves: 1.1 },
  arms_shoulders: { side_delts: 1.25, rear_delts: 1.15, biceps: 1.25, triceps: 1.25 },
};
```

(Can live in `data.js` or `equipment.js`; prefer `data.js` next to MUSCLES.)

**UI:** mode `<select id="set-training-mode">` with med / program / custom. Custom card: preset buttons + primary muscle row with values 0.5–1.5 step 0.1.

**Plan chip:** show mode label in Plan header via existing status bar if present.

- [ ] **Step 1: Test custom targets increase coverage**

```js
// tests/custom-targets.test.js
import { buildPlan } from "../js/planner.js";
import { DEFAULT_SETTINGS } from "../js/data.js";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("custom targets", () => {
  it("boosts chest volume when emphasized", () => {
    const days = ["2026-08-03","2026-08-05","2026-08-07","2026-08-10","2026-08-12","2026-08-14"];
    const base = buildPlan(days, { ...DEFAULT_SETTINGS, trainingMode: "med", equipment: null });
    const custom = buildPlan(days, {
      ...DEFAULT_SETTINGS,
      trainingMode: "custom",
      customTargets: { chest: 1.5 },
      equipment: null,
    });
    assert.ok((custom.targets.chest || 0) > (base.targets.chest || 0));
  });
});
```

- [ ] **Step 2: Implement weeklyTarget + UI**
- [ ] **Step 3: npm test PASS**
- [ ] **Step 4: Commit**

```powershell
git add js/planner.js js/data.js js/app.js index.html tests/custom-targets.test.js
git commit -m "Add training modes and custom weekly muscle targets"
```

---

### Task 6: Programs engine + BBB template

**Files:**
- Create: `js/programs.js`
- Create: `tests/programs.test.js`
- Modify: `js/app.js` — `rebuildPlan` router

**Interfaces:**
- `listPrograms(): ProgramMeta[]`
- `getProgram(id): ProgramDef | null`
- `assignSlotsForMonth(trainingDays: string[], program: ProgramDef): { day: string, slotId: string }[]`
- `buildProgramPlan(trainingDays, settings, horizon): same shape as buildPlan return`  
  Sessions include `source: "program"`, `programId`, `slotId`, `schemeNotes`

**BBB slots (4):** `squat_day`, `bench_day`, `deadlift_day`, `press_day`  
Main exercises: `bb_back_squat`, `bb_bench`, `conventional_dl`, `ohp`  
Supplemental: same lift, scheme `bbb_5x10`  
Accessories: pattern picks (horizontal_pull on squat day, etc.) via available exercises

**531 wave** (`programWeekOffset` + week index in horizon):

```js
// waveIndex = (weekIndexInPlan + settings.programWeekOffset) % 4
// 0: 5s → sets/reps text "3×5 @ 65/75/85% TM" simplified display
// 1: 3s
// 2: 5/3/1
// 3: deload light
```

Display working weights when TM present: `round(tm * pct)` using `settings.unitLabel`.

**assignSlotsForMonth:** group days by `weekKey` (copy weekKey helper or import from planner — **export `weekKey` from planner.js** or duplicate Mon-start logic in programs.js to avoid circular imports). Prefer **export `weekKey` from planner.js**.

Per week: sort days, assign `slots[i % slots.length]` for i in 0..n-1 (week restarts at 0).

**buildProgramPlan** meta: `{ trainingDays, source: "program", programId, underCoveredPrimaries: [] }`

- [ ] **Step 1: Failing tests for slot assign + no unequipped mains without sub**

```js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assignSlotsForMonth, buildProgramPlan, getProgram } from "../js/programs.js";
import { DEFAULT_SETTINGS } from "../js/data.js";
import { applyEquipmentPreset } from "../js/equipment.js";

describe("assignSlotsForMonth", () => {
  it("restarts each week at slot 0", () => {
    const prog = getProgram("bbb_531");
    // Mon 2026-08-03, Wed 08-05, Fri 08-07, then next week Mon 08-10
    const map = assignSlotsForMonth(
      ["2026-08-03", "2026-08-05", "2026-08-07", "2026-08-10"],
      prog
    );
    const byDay = Object.fromEntries(map.map((x) => [x.day, x.slotId]));
    assert.equal(byDay["2026-08-03"], "squat_day");
    assert.equal(byDay["2026-08-05"], "bench_day");
    assert.equal(byDay["2026-08-07"], "deadlift_day");
    assert.equal(byDay["2026-08-10"], "squat_day"); // new week
  });
});

describe("buildProgramPlan", () => {
  it("labels sessions from BBB", () => {
    const plan = buildProgramPlan(
      ["2026-08-03", "2026-08-05", "2026-08-07", "2026-08-08"],
      {
        ...DEFAULT_SETTINGS,
        trainingMode: "program",
        activeProgramId: "bbb_531",
        equipment: applyEquipmentPreset("home_barbell"),
        trainingMaxes: { squat: 315, bench: 225, deadlift: 405, press: 135 },
      }
    );
    assert.equal(plan.sessions.length, 4);
    assert.equal(plan.sessions[0].source, "program");
    assert.match(plan.sessions[0].label, /squat/i);
  });
});
```

- [ ] **Step 2: Implement `programs.js` with `bbb_531` only first**
- [ ] **Step 3: Router in app.js**

```js
function rebuildPlanFromState() {
  const s = effectiveSettings();
  const horizon = { dayDose: state.dayDose, doseProfiles: DOSE_PROFILES };
  if (s.trainingMode === "program" && s.activeProgramId) {
    plan = buildProgramPlan(state.trainingDays, s, horizon);
  } else {
    plan = buildPlan(state.trainingDays, s, horizon);
  }
}
```

(Hook wherever plan is currently rebuilt — search `buildPlan(` in app.js.)

- [ ] **Step 4: npm test PASS**
- [ ] **Step 5: Commit**

```powershell
git add js/programs.js js/planner.js js/app.js tests/programs.test.js
git commit -m "Add program runner and BBB template"
```

---

### Task 7: Programs UI + training maxes + three bodybuilding templates

**Files:**
- Modify: `js/programs.js` — add `ppl_hyper`, `ul_hyper`, `bro_classic`
- Modify: `index.html` — `#programs-card`, TM fields
- Modify: `js/app.js` — catalog select, TM save, attribution text
- Modify: `js/coach.js` — program mission line uses `session.schemeNotes`

**Bodybuilding templates (fixed schemes):**

Each slot is a list of `{ exerciseId?, pick:"pattern", pattern, primary?, sets, reps }` resolved through equipment.

- **ppl_hyper:** push, pull, legs (3 slots; week rotation)
- **ul_hyper:** upper_a, lower_a, upper_b, lower_b
- **bro_classic:** chest, back, shoulders, legs, arms

Attribution strings on each program card per spec.

**TM fields** (shown when `bbb_531` selected):

```html
<input id="tm-squat" type="number" /> <!-- etc -->
```

- [ ] **Step 1: Implement three program defs + tests that each builds ≥1 session**
- [ ] **Step 2: Settings UI for program pick + TMs**
- [ ] **Step 3: Manual smoke all 4 programs**
- [ ] **Step 4: Commit**

```powershell
git commit -m "Add bodybuilding program templates and program settings UI"
```

---

### Task 8: Onboarding + Plan/Today polish + docs + deploy cache

**Files:**
- Modify: `js/app.js` onboarding steps — train location → equipment → mode
- Modify: Plan view mode chip
- Modify: Today scheme line under exercises when `ex.schemeNotes` or session.schemeNotes
- Modify: `README.md`, `sw.js` CACHE → `ironledger-v20`
- Modify: app version label if present

**Onboarding flow:**
1. Existing welcome
2. Where train? Gym (equipment null) / Home (show preset buttons)
3. How train? MED / Program (pick one) / Custom
4. Mark days on Plan (existing)

- [ ] **Step 1: Onboarding + chips + scheme notes**
- [ ] **Step 2: README features list**
- [ ] **Step 3: Full `npm test`**
- [ ] **Step 4: Commit + push**

```powershell
git add -A
git commit -m "Onboarding for equipment and modes; ship v20 cache"
git push origin main
```

---

## Spec coverage checklist

| Spec section | Task(s) |
|--------------|---------|
| Equipment checklist + presets | 1, 2, 4 |
| Exercise requires tags | 2 |
| Filter planner/swaps | 3 |
| MED Auto unchanged default | 2, 5 |
| Custom weekly targets | 5 |
| Programs follow-the-book | 6, 7 |
| BBB + TMs + wave | 6 |
| PPL / UL / bro | 7 |
| Calendar per-week slot restart | 6 |
| Store v4 | 2 |
| Onboarding | 8 |
| Attribution / educational | 7 |
| Time-box / deload on programs | 6 (accessories first; deload scales supplemental) |
| Success criteria | 3, 5, 6, 8 smoke |

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-09-equipment-programs-custom.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — implement tasks in this session with checkpoints  

Which approach?
