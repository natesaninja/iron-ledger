# Iron Ledger — Equipment, Programs & Custom Training

**Date:** 2026-08-09  
**Status:** Draft for user review  
**Repo:** `natesaninja/iron-ledger` (local: `strengthledger`)  
**Scope:** Home-gym pilot friends + structured programs + custom muscle targets  

---

## 1. Goals

### Problems

1. Friends train **at home** with limited gear. The library is commercial-gym biased; excluding every machine is tedious and error-prone.
2. Friends have **different monthly schedules** than the pilot owner (already partially solved by the Plan calendar).
3. Some want to **run a named program** (e.g. Boring But Big), not pure MED auto-planning.
4. Others want to **hit muscle groups their way** without following a full public program.

### Outcomes

| User | Success |
|------|---------|
| Home-gym friend | Marks equipment once; only feasible lifts appear in sessions |
| Program runner | Picks BBB (or a bodybuilding template); sessions follow that structure on their train days |
| Custom user | Sets weekly muscle priorities + train days; planner builds sessions from equipment + targets |
| Existing pilot (you) | Can stay on **MED Auto** with no forced migration |

### Non-goals (v1)

- Cloud sync / multi-device account for the same person  
- Selling or reproducing full copyrighted program books  
- Per-plate / full weight inventory (checklist only; extend later)  
- Social leaderboards, coach-client remote programming  
- Automatic “buy this equipment” recommendations  

---

## 2. Product shape

### Training mode (exactly one active)

| Mode id | Label | Session source |
|---------|--------|----------------|
| `med` | **MED Auto** | Existing `buildPlan` debt/recovery engine (current behavior) |
| `program` | **Programs** | Fixed program templates (“follow the program”) |
| `custom` | **Custom** | `buildPlan` with **user muscle targets** instead of default MED multipliers only |

Shared across all modes:

- **Plan calendar** — which ISO dates are train days (and rest/light flags as today)  
- **Equipment profile** — what they have → filters exercises  
- **Dose** (rough / MED / OED), time-box, deload, logging, Cover insights  
- Local-only store + export/import  

### Mental model

```
Equipment (what you have)
    +  Calendar (when you train)
    +  Mode (how sessions are chosen)
    →  Session list for the month
    →  Today / log / Cover (unchanged UX shell)
```

---

## 3. Equipment

### Model

Simple **boolean checklist** (user chose flexible “other”; v1 stays simple and extendable).

```js
// settings.equipment
{
  // null | undefined = "not configured" → treat as full commercial gym (backward compatible)
  // object = configured; missing keys default false except bodyweight always true
  barbell: true,
  plates: true,          // plates + bar usable for loaded compounds
  rack: true,            // squat/bench rack or stands
  flatBench: true,
  dumbbells: true,
  pullUpBar: true,
  bands: false,
  cables: false,         // cable stack or functional trainer
  kettlebells: false,
  machines: false,       // any selectorized / plate machines
  landmine: false,
  // always available conceptually:
  // bodyweight: true
}
```

**Presets (one tap):**

| Preset | Sets |
|--------|------|
| Commercial gym | All `true` (or leave equipment `null`) |
| Home barbell | barbell, plates, rack, flatBench, pullUpBar; dumbbells optional |
| Dumbbell only | dumbbells, flatBench, bands optional, pullUpBar optional |
| Minimal | pullUpBar + bands + bodyweight only |

### Exercise equipment tags

Extend each exercise in `data.js` (or a parallel map) with:

```js
{
  id: "bb_back_squat",
  // ...
  requires: ["barbell", "plates", "rack"],  // ALL required
  // optional later: anyOf: [["dumbbells"], ["barbell","plates"]]
}
```

**Rules:**

- Exercise is available if every `requires` flag is true on the user’s equipment.  
- Empty `requires` → bodyweight / no special gear.  
- If `settings.equipment` is `null` (legacy): **all exercises available** (current behavior).  
- Preferred / excluded still apply after equipment filter.  
- Swap list and exclude list only show available exercises (or show unavailable as disabled with reason: “Needs cables”).

### UI

- **Settings → My equipment** card: checklist + presets + “Save & rebuild”.  
- **Onboarding** step (new or extended): “Where do you train?” → Gym / Home → if Home, equipment checklist before first plan.  
- Banner on Today if equipment not configured and mode is program/custom: soft nudge, not a hard block for MED Auto.

---

## 4. Mode: MED Auto

Unchanged core:

- `buildPlan(trainingDays, effectiveSettings, horizon)`  
- Split preference, MED multiplier, recovery multiplier  
- **New:** `effectiveSettings` already applies equipment filter when picking exercises  

Migration: existing users keep `trainingMode: "med"` (default).

---

## 5. Mode: Programs (follow the program)

### Catalog (v1)

Educational **templates** inspired by popular public structures. UI copy: *“Educational template inspired by … not a substitute for the author’s book/materials.”* No long copyrighted text, no paid PDF dumps.

| id | Name | Structure | Best for |
|----|------|-----------|----------|
| `bbb_531` | 5/3/1 Boring But Big (template) | 4 day types: Squat / Bench / Deadlift / Press weeks cycling; main work + BBB supplemental 5×10 pattern | Strength + size, barbell home gym |
| `ppl_hyper` | Push / Pull / Legs (hypertrophy) | 6 session types rotating; volume accessories | 4–6 days/week when calendar allows |
| `ul_hyper` | Upper / Lower hypertrophy | 4 session types | 3–4 days/week |
| `bro_classic` | Classic body-part split | 5 day types: Chest, Back, Shoulders, Legs, Arms | 4–5 days/week |

### Program definition schema

```js
{
  id: "bbb_531",
  name: "5/3/1 Boring But Big (template)",
  attribution: "Inspired by Jim Wendler’s 5/3/1 / BBB concepts. Educational summary only.",
  minDaysPerWeek: 3,
  idealDaysPerWeek: 4,
  requiresAny: ["barbell"], // soft warning if missing
  // Training maxes (user input) — BBB only
  needsTrainingMaxes: true,
  slots: [
    {
      id: "squat_day",
      label: "Squat + BBB",
      focusHint: ["quads", "glutes"],
      main: { exerciseId: "bb_back_squat", scheme: "531_main" },
      supplemental: { exerciseId: "bb_back_squat", scheme: "bbb_5x10" },
      accessories: [
        { pick: "pattern", pattern: "horizontal_pull", sets: 5, reps: "8-12" },
        { pick: "pattern", pattern: "isolation", primary: "core", sets: 3, reps: "10-15" },
      ],
    },
    // bench_day, deadlift_day, press_day ...
  ],
  // How slots map onto a week of train days
  rotation: "sequential", // assign slot 0..n-1 in order of train days in week; wrap
}
```

### Schemes (program engine)

Small scheme library (not full spreadsheet software):

| scheme | Behavior |
|--------|----------|
| `531_main` | Week wave in 4-week cycle: 5s / 3s / 5/3/1 / deload-ish light; uses training max %; 1+ AMRAP on top set (log-friendly) |
| `bbb_5x10` | 5×10 @ ~50–60% TM (user setting default 50%) of same or paired lift |
| `fixed` | Fixed sets × rep range (bodybuilding templates) |
| `med_fill` | Fallback: use planner isolation/compound pick for a muscle/pattern (if primary exercise unequipped) |

**Training maxes (BBB):** Settings fields: squat / bench / deadlift / press TM (lb or unit label). If missing when program selected → prompt before first session; use bodyweight placeholders only if user skips (with warning).

### Mapping program → calendar

1. User marks **train days** on Plan (their real month schedule).  
2. For each week (Mon–Sun, existing `weekKey`), sort train days.  
3. Assign slots in **rotation order** (sequential wrap).  
   - Example: 4 BBB slots, 3 train days that week → slots 0,1,2; next week continues at 3,0,1… **or** reset each week to slot 0 (prefer **reset each calendar week** for predictability: Mon-start week always tries Squat first if day1, etc.).  
4. **Decision (v1):** **Per-week restart** — first train day of each week = slot 0 of the program’s weekly order. Fewer “lost place” bugs for casual users.  
5. If fewer days than ideal: still run; coach note: “3 days this week — you’re rotating through S/B/D (press slides).”  
6. If more days than slots: wrap rotation or insert optional light/accessory day (v1: wrap).

### Equipment inside programs

- Resolve each template exercise through equipment filter.  
- If main lift unavailable → substitute same `pattern` + primary muscle with highest preference score among available (reuse substitute ranking from `logging.js` / planner).  
- If no substitute → session shows gap + “Add equipment or swap program.”

### Dose / time-box / deload interaction

- **Deload active:** scale schemes (e.g. top sets only, or 50% volume) — mirror current rough dose bias.  
- **Time-box:** drop accessories first, then reduce supplemental sets; never drop main work first.  
- **Day dose rough/MED/OED:** scale accessory volume; keep main scheme structure.

---

## 6. Mode: Custom

### User inputs

1. Train days (calendar) — same as today  
2. **Weekly emphasis** per muscle (or group presets):

```js
settings.customTargets = {
  // muscleId -> multiplier on weeklyMed (default 1.0 for all if unset)
  chest: 1.2,
  lats: 1.2,
  quads: 1.0,
  // ...
}
// OR presets that set the map:
// "balanced" | "push_focus" | "pull_focus" | "legs_focus" | "arms_shoulders"
```

3. Optional **split preference** (full body / UL / PPL / bro / auto) — already exists  
4. Equipment  

### Engine

Reuse `buildPlan` with:

```js
function weeklyTarget(m, settings) {
  const base = m.weeklyMed * (settings.medMultiplier || 1);
  const custom = settings.customTargets?.[m.id];
  return base * (custom != null ? custom : 1);
}
```

UI: sliders or − / + chips per primary muscle (0.5× – 1.5×), secondaries optional advanced. Presets fill the map.

No separate “program runner”; coverage meter on Plan/Cover still works.

---

## 7. Data model & store

### Settings additions

```js
// DEFAULT_SETTINGS extensions
trainingMode: "med",           // "med" | "program" | "custom"
activeProgramId: null,         // when mode === "program"
equipment: null,               // null = unrestricted legacy
equipmentPreset: null,         // "gym" | "home_barbell" | "db_only" | "minimal" | "custom"
customTargets: null,           // null = all 1.0
trainingMaxes: {               // lb (or unitLabel)
  squat: null,
  bench: null,
  deadlift: null,
  press: null,
},
bbbSupplementalPct: 0.5,       // 50% TM default for BBB sets
programWeekOffset: 0,          // 0–3 for 5/3/1 wave position (user can set “I’m on week 2”)
```

### Store version

- Bump `STORE_VERSION` to **4**.  
- Migration: fill new keys with defaults; leave `equipment: null`.  

### Plan cache

- Rebuild sessions when mode, program, equipment, customTargets, training days, or TMs change (existing Save & rebuild path).  
- Session objects gain optional fields:

```js
{
  // existing fields...
  source: "med" | "program" | "custom",
  programId?: string,
  slotId?: string,
  schemeNotes?: string,  // e.g. "Week 2 · 3s wave · BBB 5×10 @ 50% TM"
}
```

---

## 8. UI / navigation

### Settings

1. **Training mode** segmented control or select: MED Auto | Programs | Custom  
2. **Programs** (visible if Programs): catalog cards → select active → TM fields if needed  
3. **Custom targets** (visible if Custom): presets + per-muscle multipliers  
4. **My equipment** (always): checklist + presets  
5. Existing: split (still relevant for MED + Custom), exclude, dose, deload  

### Plan tab

- Mode chip: `PROGRAM · BBB` / `CUSTOM` / `MED AUTO`  
- Unchanged day tapping  
- Coverage footer: for Programs, show “slots this month” + soft adherence note instead of only MED under-coverage (or both)

### Today tab

- Session from plan as today  
- Program sessions show scheme line under each lift (%, sets)  
- Swap still allowed among equipment-legal substitutes (program main lifts: warn “Changes the template”)

### Onboarding (new steps)

1. Name / session length (existing)  
2. **Where do you train?** Gym → equipment null/all; Home → checklist  
3. **How do you want to train?** MED Auto / Pick a program / Custom muscles  
4. If program BBB → optional TM entry (“can set later in Settings”)  
5. **Mark train days** on Plan (existing messaging)

### Coach copy

- Program mode: mission line describes slot + week wave, not MED debt  
- Custom: mission line mentions emphasis muscles  
- MED: existing  

---

## 9. Architecture (code)

```
js/
  data.js              # MUSCLES, EXERCISES + requires[], PROGRAMS catalog light refs
  equipment.js         # NEW: presets, isExerciseAvailable, filterExercises
  programs.js          # NEW: PROGRAM_DEFS, schemes, assignSlots, buildProgramPlan
  planner.js           # buildPlan; honor equipment + customTargets
  logging.js           # substitutes respect equipment
  store.js             # v4 migration
  app.js               # mode UI, onboarding, rebuild routing
  coach.js             # scripts per mode
```

### Plan rebuild router

```js
function rebuildPlan() {
  const s = effectiveSettings();
  if (s.trainingMode === "program" && s.activeProgramId) {
    plan = buildProgramPlan(state.trainingDays, s, horizon);
  } else {
    // med + custom share buildPlan; customTargets only affect custom (or always if set)
    plan = buildPlan(state.trainingDays, s, horizon);
  }
}
```

Custom vs MED: both call `buildPlan`; `customTargets` applied only when `trainingMode === "custom"` (ignore stale map in MED mode).

### Testing

| Area | Tests |
|------|--------|
| Equipment filter | Exercise with `requires: ["cables"]` hidden when cables false |
| Legacy null equipment | All exercises pass |
| Program slot assignment | 4 train days → 4 BBB slots in order; 3 days → first 3 slots that week |
| 531 week wave | programWeekOffset + calendar week math stable |
| Custom targets | Higher chest multiplier → more chest volume in coverage |
| Store migrate v3→v4 | New keys present, no data loss |
| Logging substitutes | No unequipped options |

---

## 10. Legal / educational

- Every program screen includes short attribution + “not affiliated / not the full commercial program.”  
- Numbers and structures are **publicly discussed training patterns** summarized for education (5/3/1 weekly waves, BBB 5×10 supplemental idea, generic PPL/UL/bro).  
- Disclaimer footer already educational — keep and extend on program cards.  
- Do **not** paste book chapters, exact marketing names beyond fair descriptive titles, or paywalled PDFs.

---

## 11. Implementation phases

### Phase 1 — Equipment foundation

- `equipment.js` + `requires` on exercises  
- Settings UI + presets  
- Wire filter into planner pick + swaps + exclude list  
- Store v4 + tests  

### Phase 2 — Training mode shell + Custom

- Mode switcher  
- Custom targets UI + `weeklyTarget` hook  
- Onboarding steps  
- Coach/Plan chips  

### Phase 3 — Programs engine + BBB

- `programs.js` schemes + slot assignment  
- BBB template + TM fields  
- Time-box / deload scaling  

### Phase 4 — Bodybuilding templates

- PPL hypertrophy, Upper/Lower, Classic bro  
- Catalog polish, empty states, “needs more train days” hints  

### Phase 5 — Polish

- Coverage UX per mode  
- Home screen copy / README  
- Cache bump, GitHub Pages deploy  

Phases 1–2 deliver home-gym value even before BBB; 3–4 complete the original request.

---

## 12. Edge cases

| Case | Behavior |
|------|----------|
| Program selected, 0 train days | Today: same as now — prompt Plan |
| Equipment too sparse for program | Catalog card warning; allow select but sessions may be accessory-heavy with alerts |
| Switch mode mid-month | Rebuild future sessions; keep logs/history |
| Import backup without equipment | `equipment: null` → full library |
| Exclude conflicts with program main | Exclude wins; substitute or gap message |
| Quality coach stages | Unrelated; controls already open (v19.2) |

---

## 13. Success criteria

1. Friend with dumbbells-only completes onboarding, never sees cable-only lifts in Today.  
2. Friend selects BBB template, enters TMs, marks 4 days/week → sees S/B/D/O-style days with main + BBB-style volume.  
3. Friend on Custom boosts back/chest → Plan coverage and sessions reflect emphasis.  
4. Existing MED user with no settings change: behavior matches pre-feature (null equipment, mode med).  
5. All new unit tests pass; manual smoke on iPhone PWA after deploy.

---

## 14. Open decisions (resolved for v1)

| Topic | Decision |
|-------|----------|
| Equipment detail | Simple checklist (+ presets); no weight inventory |
| Program strictness | Follow the program (template runner) |
| Custom builder | Weekly muscle targets + auto sessions |
| v1 programs | BBB + PPL hyper + UL hyper + classic bro |
| Slot mapping | Per calendar week restart at slot 0 |
| Approach | Three modes + shared equipment (Approach A) |

---

## 15. Next step after approval

Invoke **writing-plans** to produce an implementation plan under `docs/superpowers/plans/` for Phases 1–4, then implement Phase 1 first.
