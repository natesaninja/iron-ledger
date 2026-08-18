/** Commercial-gym exercise library + MED muscle targets */

export const MUSCLES = [
  { id: "chest", name: "Chest", tier: "primary", weeklyMed: 8, recoveryH: 48 },
  { id: "lats", name: "Lats", tier: "primary", weeklyMed: 8, recoveryH: 48 },
  { id: "upper_back", name: "Upper Back", tier: "primary", weeklyMed: 6, recoveryH: 48 },
  { id: "quads", name: "Quads", tier: "primary", weeklyMed: 8, recoveryH: 72 },
  { id: "hamstrings", name: "Hamstrings", tier: "primary", weeklyMed: 6, recoveryH: 72 },
  { id: "glutes", name: "Glutes", tier: "primary", weeklyMed: 6, recoveryH: 72 },
  { id: "front_delts", name: "Front Delts", tier: "secondary", weeklyMed: 4, recoveryH: 48 },
  { id: "side_delts", name: "Side Delts", tier: "secondary", weeklyMed: 6, recoveryH: 48 },
  { id: "rear_delts", name: "Rear Delts", tier: "secondary", weeklyMed: 6, recoveryH: 48 },
  { id: "biceps", name: "Biceps", tier: "secondary", weeklyMed: 4, recoveryH: 36 },
  { id: "triceps", name: "Triceps", tier: "secondary", weeklyMed: 4, recoveryH: 36 },
  { id: "calves", name: "Calves", tier: "secondary", weeklyMed: 6, recoveryH: 36 },
  { id: "core", name: "Core", tier: "support", weeklyMed: 4, recoveryH: 24 },
  { id: "traps", name: "Traps", tier: "support", weeklyMed: 4, recoveryH: 48 },
  { id: "lower_back", name: "Lower Back", tier: "support", weeklyMed: 2, recoveryH: 72 },
];

export const PRIORITY = [
  "quads", "hamstrings", "glutes", "chest", "lats", "upper_back",
  "side_delts", "rear_delts", "front_delts", "triceps", "biceps",
  "calves", "core", "traps", "lower_back",
];

/** Multipliers on weeklyMed when trainingMode === "custom". balanced → null (all 1.0). */
export const CUSTOM_TARGET_PRESETS = {
  balanced: {}, // treat as all 1.0 → store null
  push_focus: { chest: 1.25, front_delts: 1.2, side_delts: 1.15, triceps: 1.15 },
  pull_focus: { lats: 1.25, upper_back: 1.2, rear_delts: 1.15, biceps: 1.15 },
  legs_focus: { quads: 1.25, hamstrings: 1.2, glutes: 1.2, calves: 1.1 },
  arms_shoulders: { side_delts: 1.25, rear_delts: 1.15, biceps: 1.25, triceps: 1.25 },
};

/** Quantize custom target multiplier to 0.05 steps (presets use 1.15 / 1.25). */
export function quantizeCustomTarget(v) {
  const n = +v;
  if (!Number.isFinite(n)) return 1;
  return Math.round(Math.min(1.5, Math.max(0.5, n)) * 20) / 20;
}

export const FOCUS = {
  push: ["chest", "front_delts", "side_delts", "triceps"],
  pull: ["lats", "upper_back", "rear_delts", "biceps"],
  legs: ["quads", "hamstrings", "glutes", "calves", "lower_back"],
  upper: ["chest", "lats", "upper_back", "front_delts", "side_delts", "rear_delts", "biceps", "triceps", "traps"],
  lower: ["quads", "hamstrings", "glutes", "calves", "core", "lower_back"],
  full_body: ["quads", "hamstrings", "glutes", "chest", "lats", "upper_back", "side_delts", "rear_delts", "core", "calves"],
};

/**
 * why = plain-English reason for the movement itself (shown in the app).
 * Planner adds a second line: why *this session* picked it (coverage/recovery).
 */
export const EXERCISES = [
  { id: "bb_back_squat", name: "Barbell Back Squat", pattern: "squat", primary: ["quads", "glutes"], secondary: ["core", "hamstrings"], role: "compound", minPerSet: 3.5, sets: 3, reps: "5-8",
    requires: ["barbell", "plates", "rack"],
    why: "Main squat pattern: loads quads and glutes hard so one lift covers a lot of lower-body needs." },
  { id: "leg_press", name: "Leg Press", pattern: "squat", primary: ["quads", "glutes"], secondary: ["hamstrings"], role: "compound", minPerSet: 2.5, sets: 3, reps: "8-12",
    requires: ["machines"],
    why: "Same job as a squat (quads/glutes) with back support — easier to progress confidently in a busy gym." },
  { id: "hack_squat", name: "Hack Squat", pattern: "squat", primary: ["quads"], secondary: ["glutes"], role: "compound", minPerSet: 2.5, sets: 3, reps: "8-12",
    requires: ["machines"],
    why: "Guided squat path that hammers quads without balancing a free bar." },
  { id: "leg_extension", name: "Leg Extension", pattern: "isolation", primary: ["quads"], secondary: [], role: "isolation", minPerSet: 2.0, sets: 2, reps: "10-15",
    requires: ["machines"],
    why: "Finishes quads alone when compounds already did the heavy work — simple machine, clear target." },
  { id: "rdl", name: "Romanian Deadlift", pattern: "hinge", primary: ["hamstrings", "glutes"], secondary: ["lower_back", "traps"], role: "compound", minPerSet: 3.5, sets: 3, reps: "6-10",
    requires: ["barbell", "plates"],
    why: "Hinge pattern for hamstrings and glutes with less floor-pull fatigue than a conventional deadlift." },
  { id: "conventional_dl", name: "Conventional Deadlift", pattern: "hinge", primary: ["hamstrings", "glutes", "lower_back"], secondary: ["traps", "upper_back", "core"], role: "compound", minPerSet: 4.0, sets: 3, reps: "3-5",
    requires: ["barbell", "plates"],
    why: "Big posterior-chain lift: hamstrings, glutes, and back work together — high payoff per set when recovered." },
  { id: "seated_leg_curl", name: "Seated Leg Curl", pattern: "isolation", primary: ["hamstrings"], secondary: [], role: "isolation", minPerSet: 2.0, sets: 3, reps: "8-12",
    requires: ["machines"],
    why: "Isolates hamstrings so they get direct volume without taxing the lower back again." },
  { id: "hip_thrust", name: "Barbell Hip Thrust", pattern: "hinge", primary: ["glutes"], secondary: ["hamstrings", "core"], role: "compound", minPerSet: 3.0, sets: 3, reps: "6-10",
    requires: ["barbell", "plates", "flatBench"],
    why: "Glute-focused hinge that builds the back of the hip without heavy spinal loading like a max deadlift." },
  { id: "cable_pull_through", name: "Cable Pull-Through", pattern: "hinge", primary: ["glutes", "hamstrings"], secondary: [], role: "accessory", minPerSet: 2.0, sets: 2, reps: "10-15",
    requires: ["cables"],
    why: "Light hinge pattern for glutes/hamstrings — good support work when you want hinge volume without a heavy bar." },
  { id: "bb_bench", name: "Barbell Bench Press", pattern: "horizontal_push", primary: ["chest"], secondary: ["front_delts", "triceps"], role: "compound", minPerSet: 3.5, sets: 3, reps: "5-8",
    requires: ["barbell", "plates", "flatBench", "rack"],
    why: "Primary horizontal push: chest drives the lift while shoulders and triceps assist — efficient upper push." },
  { id: "db_bench", name: "Dumbbell Bench Press", pattern: "horizontal_push", primary: ["chest"], secondary: ["front_delts", "triceps"], role: "compound", minPerSet: 3.0, sets: 3, reps: "8-12",
    requires: ["dumbbells", "flatBench"],
    why: "Chest press with each arm free — more range of motion and easier to bail than a fixed bar." },
  { id: "incline_db_press", name: "Incline DB Press", pattern: "horizontal_push", primary: ["chest", "front_delts"], secondary: ["triceps"], role: "compound", minPerSet: 3.0, sets: 3, reps: "8-12",
    requires: ["dumbbells", "flatBench"],
    why: "Upper-chest and front-delt emphasis so pressing volume isn’t only flat-bench." },
  { id: "chest_press_machine", name: "Machine Chest Press", pattern: "horizontal_push", primary: ["chest"], secondary: ["front_delts", "triceps"], role: "compound", minPerSet: 2.5, sets: 3, reps: "8-12",
    requires: ["machines"],
    why: "Chest push on a stable machine — same pattern as bench with less setup stress." },
  { id: "cable_fly", name: "Cable Fly", pattern: "isolation", primary: ["chest"], secondary: [], role: "isolation", minPerSet: 2.0, sets: 2, reps: "10-15",
    requires: ["cables"],
    why: "Chest-only finisher after presses so the pecs get extra work without more shoulder load from heavy pressing." },
  { id: "ohp", name: "Barbell Overhead Press", pattern: "vertical_push", primary: ["front_delts", "side_delts"], secondary: ["triceps", "traps", "core"], role: "compound", minPerSet: 3.5, sets: 3, reps: "5-8",
    requires: ["barbell", "plates"],
    why: "Vertical push for shoulders and triceps; builds pressing strength you don’t get from bench alone." },
  { id: "db_shoulder_press", name: "DB Shoulder Press", pattern: "vertical_push", primary: ["front_delts", "side_delts"], secondary: ["triceps"], role: "compound", minPerSet: 3.0, sets: 3, reps: "8-12",
    requires: ["dumbbells"],
    why: "Shoulder press with independent arms — solid overhead work with easier joint freedom than a bar." },
  { id: "machine_shoulder_press", name: "Machine Shoulder Press", pattern: "vertical_push", primary: ["front_delts", "side_delts"], secondary: ["triceps"], role: "compound", minPerSet: 2.5, sets: 3, reps: "8-12",
    requires: ["machines"],
    why: "Guided overhead press for delts when you want vertical push volume with less balance demand." },
  { id: "lateral_raise", name: "DB Lateral Raise", pattern: "isolation", primary: ["side_delts"], secondary: [], role: "isolation", minPerSet: 2.0, sets: 3, reps: "12-15",
    requires: ["dumbbells"],
    why: "Side delts don’t get fully hit by bench or rows — this is direct width work." },
  { id: "cable_lateral", name: "Cable Lateral Raise", pattern: "isolation", primary: ["side_delts"], secondary: [], role: "isolation", minPerSet: 2.0, sets: 2, reps: "12-15",
    requires: ["cables"],
    why: "Constant cable tension on side delts — cleaner isolation than swinging dumbbells." },
  { id: "face_pull", name: "Face Pull", pattern: "isolation", primary: ["rear_delts", "upper_back"], secondary: ["traps"], role: "isolation", minPerSet: 2.0, sets: 3, reps: "12-15",
    requires: ["cables"],
    why: "Rear delts and upper back balance all the pressing; helps posture and shoulder health." },
  { id: "reverse_pec_deck", name: "Reverse Pec Deck", pattern: "isolation", primary: ["rear_delts"], secondary: ["upper_back"], role: "isolation", minPerSet: 2.0, sets: 2, reps: "12-15",
    requires: ["machines"],
    why: "Machine rear-delt work so the back of the shoulder isn’t neglected after chest/shoulder presses." },
  { id: "pullup", name: "Pull-Up / Assisted", pattern: "vertical_pull", primary: ["lats"], secondary: ["biceps", "upper_back"], role: "compound", minPerSet: 3.0, sets: 3, reps: "5-10",
    requires: ["pullUpBar"],
    why: "Vertical pull for lats (and arms) — the main “up” pull pattern opposite pressing." },
  { id: "lat_pulldown", name: "Lat Pulldown", pattern: "vertical_pull", primary: ["lats"], secondary: ["biceps", "upper_back"], role: "compound", minPerSet: 2.5, sets: 3, reps: "8-12",
    requires: ["machines"],
    why: "Same lat-focused vertical pull as a pull-up, with easier load control on a machine." },
  { id: "bb_row", name: "Barbell Row", pattern: "horizontal_pull", primary: ["upper_back", "lats"], secondary: ["rear_delts", "biceps", "lower_back"], role: "compound", minPerSet: 3.5, sets: 3, reps: "6-10",
    requires: ["barbell", "plates"],
    why: "Horizontal pull for thickness through the back — balances horizontal presses like bench." },
  { id: "chest_supported_row", name: "Chest-Supported Row", pattern: "horizontal_pull", primary: ["upper_back", "lats"], secondary: ["rear_delts", "biceps"], role: "compound", minPerSet: 2.5, sets: 3, reps: "8-12",
    requires: ["machines"],
    why: "Row for back thickness without lower-back strain — chest pad removes the need to hold torso position." },
  { id: "seated_cable_row", name: "Seated Cable Row", pattern: "horizontal_pull", primary: ["upper_back", "lats"], secondary: ["biceps", "rear_delts"], role: "compound", minPerSet: 2.5, sets: 3, reps: "8-12",
    requires: ["cables"],
    why: "Stable cable row for mid-back and lats; easy to control and swap grips if a station is free." },
  { id: "straight_arm_pulldown", name: "Straight-Arm Pulldown", pattern: "isolation", primary: ["lats"], secondary: [], role: "isolation", minPerSet: 2.0, sets: 2, reps: "10-15",
    requires: ["cables"],
    why: "Lat-only finisher that doesn’t tax biceps like curls or heavy rows." },
  { id: "bb_curl", name: "Barbell Curl", pattern: "isolation", primary: ["biceps"], secondary: [], role: "isolation", minPerSet: 2.0, sets: 2, reps: "8-12",
    requires: ["barbell", "plates"],
    why: "Direct biceps work when pulls alone haven’t met arm volume for the week." },
  { id: "db_curl", name: "DB Curl", pattern: "isolation", primary: ["biceps"], secondary: [], role: "isolation", minPerSet: 2.0, sets: 2, reps: "10-12",
    requires: ["dumbbells"],
    why: "Simple biceps isolation; each arm works independently." },
  { id: "triceps_pushdown", name: "Triceps Pushdown", pattern: "isolation", primary: ["triceps"], secondary: [], role: "isolation", minPerSet: 2.0, sets: 2, reps: "10-15",
    requires: ["cables"],
    why: "Direct triceps after pressing so the arms get finished without another heavy compound." },
  { id: "oh_triceps_ext", name: "Overhead Triceps Extension", pattern: "isolation", primary: ["triceps"], secondary: [], role: "isolation", minPerSet: 2.0, sets: 2, reps: "10-15",
    requires: ["dumbbells"],
    why: "Hits the long head of the triceps in a stretch — pairs well with pushdowns." },
  { id: "standing_calf", name: "Standing Calf Raise", pattern: "isolation", primary: ["calves"], secondary: [], role: "isolation", minPerSet: 2.0, sets: 3, reps: "8-15",
    requires: ["machines"],
    why: "Calves rarely get enough work from compounds alone — short direct sets cover them." },
  { id: "seated_calf", name: "Seated Calf Raise", pattern: "isolation", primary: ["calves"], secondary: [], role: "isolation", minPerSet: 2.0, sets: 2, reps: "10-15",
    requires: ["machines"],
    why: "Seated calf work targets the soleus; complements standing raises." },
  { id: "cable_crunch", name: "Cable Crunch", pattern: "isolation", primary: ["core"], secondary: [], role: "isolation", minPerSet: 2.0, sets: 2, reps: "12-15",
    requires: ["cables"],
    why: "Loaded abs so the core gets a clear stimulus beyond “bracing” on big lifts." },
  { id: "plank", name: "Plank", pattern: "isolation", primary: ["core"], secondary: [], role: "isolation", minPerSet: 1.5, sets: 2, reps: "30-60s",
    requires: [],
    why: "Anti-extension core work — teaches the trunk to stay stable under tension." },
  { id: "shrug", name: "DB Shrug", pattern: "isolation", primary: ["traps"], secondary: [], role: "isolation", minPerSet: 2.0, sets: 2, reps: "10-15",
    requires: ["dumbbells"],
    why: "Direct upper traps when rows/pulls haven’t covered them enough." },
  { id: "back_extension", name: "Back Extension", pattern: "hinge", primary: ["lower_back", "glutes"], secondary: ["hamstrings"], role: "accessory", minPerSet: 2.0, sets: 2, reps: "10-15",
    requires: ["machines"],
    why: "Controlled lower-back and glute work that reinforces the hinge without a heavy deadlift." },
  { id: "walking_lunge", name: "Walking Lunge (DB)", pattern: "squat", primary: ["quads", "glutes"], secondary: ["hamstrings", "core"], role: "accessory", minPerSet: 3.0, sets: 2, reps: "8-12/leg",
    requires: ["dumbbells"],
    why: "Single-leg squat pattern for balance and glute/quad work (excluded by default until you’re ready)." },

  // —— Home-gym alternatives (DB / bands / floor / BW) ——
  { id: "goblet_squat", name: "Goblet Squat (DB)", pattern: "squat", primary: ["quads", "glutes"], secondary: ["core"], role: "compound", minPerSet: 2.5, sets: 3, reps: "8-12",
    requires: ["dumbbells"],
    why: "Home squat pattern: one dumbbell at the chest loads quads and glutes without a rack." },
  { id: "db_rdl", name: "DB Romanian Deadlift", pattern: "hinge", primary: ["hamstrings", "glutes"], secondary: ["lower_back"], role: "compound", minPerSet: 3.0, sets: 3, reps: "8-12",
    requires: ["dumbbells"],
    why: "Hinge for hamstrings/glutes with dumbbells — same job as a bar RDL for home setups." },
  { id: "db_floor_press", name: "DB Floor Press", pattern: "horizontal_push", primary: ["chest"], secondary: ["triceps", "front_delts"], role: "compound", minPerSet: 2.5, sets: 3, reps: "8-12",
    requires: ["dumbbells"],
    why: "Chest press on the floor when you don’t have a bench — shoulders stay safer at the bottom." },
  { id: "pushup", name: "Push-Up", pattern: "horizontal_push", primary: ["chest"], secondary: ["triceps", "front_delts", "core"], role: "compound", minPerSet: 2.0, sets: 3, reps: "8-20",
    requires: [],
    why: "Bodyweight horizontal push — zero equipment chest and triceps work." },
  { id: "band_chest_press", name: "Band Chest Press", pattern: "horizontal_push", primary: ["chest"], secondary: ["triceps", "front_delts"], role: "compound", minPerSet: 2.0, sets: 3, reps: "10-15",
    requires: ["bands"],
    why: "Horizontal push with bands when dumbbells or a bench aren’t available." },
  { id: "band_row", name: "Band Row", pattern: "horizontal_pull", primary: ["upper_back", "lats"], secondary: ["rear_delts", "biceps"], role: "compound", minPerSet: 2.0, sets: 3, reps: "10-15",
    requires: ["bands"],
    why: "Horizontal pull for mid-back with a band anchored to a door or post." },
  { id: "db_row", name: "DB Single-Arm Row", pattern: "horizontal_pull", primary: ["upper_back", "lats"], secondary: ["rear_delts", "biceps"], role: "compound", minPerSet: 2.5, sets: 3, reps: "8-12",
    requires: ["dumbbells"],
    why: "One-arm row for back thickness without a cable or chest-supported machine." },
  { id: "band_pulldown", name: "Band Lat Pulldown", pattern: "vertical_pull", primary: ["lats"], secondary: ["biceps", "upper_back"], role: "compound", minPerSet: 2.0, sets: 3, reps: "10-15",
    requires: ["bands"],
    why: "Vertical pull when there’s no pull-up bar or lat machine — band over a high anchor." },
  { id: "band_face_pull", name: "Band Face Pull", pattern: "isolation", primary: ["rear_delts", "upper_back"], secondary: ["traps"], role: "isolation", minPerSet: 2.0, sets: 3, reps: "12-15",
    requires: ["bands"],
    why: "Rear delts and upper back with a band — balances pressing without a cable stack." },
  { id: "band_lateral", name: "Band Lateral Raise", pattern: "isolation", primary: ["side_delts"], secondary: [], role: "isolation", minPerSet: 1.5, sets: 3, reps: "12-15",
    requires: ["bands"],
    why: "Side-delt isolation with a band when light dumbbells aren’t enough or available." },
  { id: "db_fly", name: "DB Fly", pattern: "isolation", primary: ["chest"], secondary: [], role: "isolation", minPerSet: 2.0, sets: 2, reps: "10-15",
    requires: ["dumbbells", "flatBench"],
    why: "Chest isolation after presses — home alternative to cable fly." },
  { id: "nordic_curl_ecc", name: "Nordic Curl (eccentric)", pattern: "isolation", primary: ["hamstrings"], secondary: [], role: "isolation", minPerSet: 2.5, sets: 2, reps: "4-8",
    requires: [],
    why: "Bodyweight hamstring work — lower under control; pad the knees and anchor the feet." },
  { id: "glute_bridge", name: "Glute Bridge", pattern: "hinge", primary: ["glutes"], secondary: ["hamstrings", "core"], role: "accessory", minPerSet: 2.0, sets: 3, reps: "10-15",
    requires: [],
    why: "Floor glute hinge with no equipment — add a DB on the hips when you have one." },
  { id: "db_hip_thrust", name: "DB Hip Thrust", pattern: "hinge", primary: ["glutes"], secondary: ["hamstrings", "core"], role: "compound", minPerSet: 2.5, sets: 3, reps: "8-12",
    requires: ["dumbbells", "flatBench"],
    why: "Loaded glute thrust with a dumbbell across the hips — home version of the barbell thrust." },
  { id: "db_calf_raise", name: "DB Standing Calf Raise", pattern: "isolation", primary: ["calves"], secondary: [], role: "isolation", minPerSet: 2.0, sets: 3, reps: "10-15",
    requires: ["dumbbells"],
    why: "Calf work with a dumbbell and a stair edge — no calf machine required." },
  { id: "bw_calf_raise", name: "Bodyweight Calf Raise", pattern: "isolation", primary: ["calves"], secondary: [], role: "isolation", minPerSet: 1.5, sets: 3, reps: "12-20",
    requires: [],
    why: "Simple calf volume with no gear — pause at the top and full stretch at the bottom." },
  { id: "band_pushdown", name: "Band Triceps Pushdown", pattern: "isolation", primary: ["triceps"], secondary: [], role: "isolation", minPerSet: 1.5, sets: 2, reps: "12-15",
    requires: ["bands"],
    why: "Triceps finisher with a band over a high anchor — cable pushdown alternative." },
  { id: "band_curl", name: "Band Curl", pattern: "isolation", primary: ["biceps"], secondary: [], role: "isolation", minPerSet: 1.5, sets: 2, reps: "12-15",
    requires: ["bands"],
    why: "Biceps isolation when dumbbells are limited — stand on the band and curl." },
  { id: "dead_bug", name: "Dead Bug", pattern: "isolation", primary: ["core"], secondary: [], role: "isolation", minPerSet: 1.5, sets: 2, reps: "8-12/side",
    requires: [],
    why: "Core anti-extension on the floor — pairs with planks for no-equipment trunk work." },
  { id: "good_morning_bw", name: "Bodyweight Good Morning", pattern: "hinge", primary: ["hamstrings", "glutes", "lower_back"], secondary: ["core"], role: "accessory", minPerSet: 2.0, sets: 2, reps: "10-15",
    requires: [],
    why: "Light hinge pattern for the posterior chain when you can’t load a bar or DBs." },
];

/**
 * Evidence grades for training claims (educational, not medical advice).
 * strong > moderate > mixed > weak > insufficient
 */
export const EVIDENCE_GRADES = {
  strong: { label: "Strong", short: "Strong" },
  moderate: { label: "Moderate", short: "Mod" },
  mixed: { label: "Mixed", short: "Mixed" },
  weak: { label: "Weak", short: "Weak" },
  insufficient: { label: "Insufficient", short: "Insuff." },
};

/**
 * MED-first training supplement library — claim grades, studied dose, timing, cautions.
 * tier: core | optional | conditional | skip (usually not worth it for MED training)
 * Not medical advice. Summaries are educational; check a clinician for personal use, labs, and meds.
 */
export const SUPPLEMENTS = [
  {
    id: "creatine",
    name: "Creatine monohydrate",
    aliases: ["creatine", "creapure", "cm"],
    tier: "core",
    tags: ["strength", "power", "daily", "hypertrophy"],
    medDose: "3–5 g every day (no loading required for MED)",
    window: "Any consistent time — with a meal is fine",
    when: "Daily, train or rest",
    why: "Most researched sports supplement. Raises muscle phosphocreatine so you can do a bit more high-intensity work (extra reps/sets over months). That extra recoverable work is the growth signal — not magic powder during the set.",
    science:
      "Meta-analyses show small-to-moderate gains in strength and lean mass with resistance training vs training alone. Works by improving ATP regeneration in short hard efforts. Timing is not critical; saturation from daily use matters, not “pre-workout only.”",
    skipIf: "You already get plenty from food and don’t care about marginal strength gains; or a clinician advised against it (rare).",
    wastedEffortNote: "Loading 20 g/day is optional, not required for results — daily 3–5 g is the MED path.",
    claims: [
      { outcome: "Strength / power", grade: "strong", note: "Consistent benefit for high-intensity efforts and strength gains with training." },
      { outcome: "Lean mass", grade: "moderate", note: "Often helps with training-driven lean mass; some early water weight is normal." },
      { outcome: "Endurance (long steady cardio)", grade: "weak", note: "Less relevant for long aerobic work than for short hard efforts." },
    ],
    interactions: [
      { severity: "low", text: "Generally well tolerated. Stay hydrated; discuss with a clinician if you have known kidney disease." },
      { severity: "low", text: "Caffeine: older “cancel out” fears are overstated for most people; daily creatine still works with coffee." },
    ],
  },
  {
    id: "protein",
    name: "Protein (food first; whey if needed)",
    aliases: ["whey", "casein", "protein powder", "protein"],
    tier: "core",
    tags: ["hypertrophy", "recovery", "daily"],
    medDose: "About 1.6–2.2 g per kg bodyweight per day total from all food (not “per shake”)",
    window: "Spread across the day; a post-workout shake only helps if it fills the daily gap",
    when: "Every day — recovery happens between sessions",
    why: "Muscle repair needs amino acids. Under a sparse schedule you can’t afford to miss recovery nutrition on rest days either.",
    science:
      "Reviews (e.g. Morton et al., ISSN positions) support ~1.6 g/kg/day as enough for most training people to maximize hypertrophy; more than ~2.2 g/kg rarely adds more muscle. Food counts fully; powder is a convenience tool, not superior magic.",
    skipIf: "You already hit the daily target with meals.",
    wastedEffortNote: "Chugging protein only post-workout while under-eating the rest of the day wastes the MED idea — total daily intake matters most.",
    claims: [
      { outcome: "Hypertrophy (with training)", grade: "strong", note: "Hitting a solid daily protein target supports muscle gain; powder is optional convenience." },
      { outcome: "Recovery between sessions", grade: "moderate", note: "Adequate protein helps repair; sleep and total calories still matter more than shake timing." },
      { outcome: "Fat loss without training", grade: "mixed", note: "Protein can help satiety; it does not replace a calorie deficit or lifting." },
    ],
    interactions: [
      { severity: "low", text: "Usually fine. If you have kidney disease, protein targets should be set with a clinician." },
    ],
  },
  {
    id: "caffeine",
    name: "Caffeine",
    aliases: ["coffee", "preworkout", "pre-workout", "caffeine"],
    tier: "optional",
    tags: ["performance", "focus", "pre-workout"],
    medDose: "About 3–6 mg per kg bodyweight only on hard sessions if you tolerate it (many do well at the low end)",
    window: "~30–60 minutes before training",
    when: "Train days only — skip if it wrecks sleep",
    why: "Can raise alertness and training quality for a short session so the limited gym time counts. Sleep is higher priority than caffeine on night-shift transitions.",
    science:
      "ISSN and multiple trials: caffeine reliably improves strength/power and workout performance in many people. It’s a performance aid, not a muscle-building nutrient. Tolerance and sleep disruption are real tradeoffs.",
    skipIf: "Anxiety, poor sleep, late sessions, or coming off nights — then caffeine is anti-MED because it steals recovery.",
    wastedEffortNote: "Pre-workout blends with 15 ingredients usually don’t beat plain caffeine + creatine + protein fundamentals.",
    claims: [
      { outcome: "Strength / power (acute)", grade: "strong", note: "Reliable acute performance aid for many trainees." },
      { outcome: "Endurance / work capacity", grade: "moderate", note: "Often helps effort quality; individual response varies." },
      { outcome: "Muscle growth directly", grade: "weak", note: "No direct hypertrophy magic — only helps if it improves training quality." },
    ],
    interactions: [
      { severity: "moderate", text: "Can raise heart rate/blood pressure; be careful with other stimulants (yohimbine, high-dose synephrine, etc.)." },
      { severity: "moderate", text: "Late use can wreck sleep — sleep loss is worse for gains than skipping caffeine." },
      { severity: "low", text: "May interact with some meds (e.g. certain heart/anxiety drugs) — check with a pharmacist if unsure." },
    ],
  },
  {
    id: "vitd",
    name: "Vitamin D",
    aliases: ["d3", "vitamin d", "cholecalciferol"],
    tier: "conditional",
    tags: ["deficiency", "health", "daily"],
    medDose: "Only if deficient or low sun/labs — dose per clinician; common OTC is not a free pass to megadose",
    window: "With a meal that has some fat",
    when: "Daily if advised",
    why: "Correcting a real deficiency supports general health and may help training capacity; supplementing when levels are already fine is low return.",
    science:
      "Vitamin D is a hormone precursor. Deficiency is common in low-sun lifestyles. Evidence for “extra D builds more muscle in replete people” is weak; evidence for fixing deficiency improving health outcomes is stronger.",
    skipIf: "Recent labs are normal and sun/diet is adequate.",
    wastedEffortNote: "Don’t buy D “for gains” without a reason — test or clinical advice beats guessing.",
    claims: [
      { outcome: "Correcting deficiency", grade: "strong", note: "Clear role when levels are low — confirm with labs when possible." },
      { outcome: "Extra muscle in replete people", grade: "weak", note: "Little reliable evidence that megadosing builds more muscle if you’re already fine." },
      { outcome: "Training performance (if deficient)", grade: "mixed", note: "Fixing deficiency may help capacity; not a performance PED when levels are normal." },
    ],
    interactions: [
      { severity: "moderate", text: "High chronic doses can raise calcium too high — don’t megadose without guidance." },
      { severity: "low", text: "Can interact with some meds (steroids, certain weight-loss or seizure drugs) — ask a clinician if on prescriptions." },
    ],
  },
  {
    id: "omega",
    name: "Omega-3 (EPA/DHA)",
    aliases: ["fish oil", "omega", "epa", "dha", "krill"],
    tier: "conditional",
    tags: ["health", "recovery", "daily"],
    medDose: "Only if you rarely eat fatty fish — food first (e.g. fish 1–2×/week often covers MED)",
    window: "With a meal",
    when: "Daily if diet gap",
    why: "Fills an essential fatty-acid gap for general health. Not a primary hypertrophy driver.",
    science:
      "EPA/DHA have cardiovascular and inflammatory roles. Direct muscle-growth effects of fish oil in already healthy trainees are modest/inconsistent. MED is “don’t be deficient,” not “more pills = more muscle.”",
    skipIf: "You already eat fatty fish regularly.",
    wastedEffortNote: "Omega-3 does not replace sleep, protein, or progressive training.",
    claims: [
      { outcome: "General health / diet gap", grade: "moderate", note: "Useful when fatty fish is rare; food is fine first." },
      { outcome: "Hypertrophy", grade: "weak", note: "Not a primary muscle-building supplement in trained people." },
      { outcome: "Soreness / recovery", grade: "mixed", note: "Some trials show modest effects; results are inconsistent." },
    ],
    interactions: [
      { severity: "moderate", text: "High doses may increase bleeding tendency — caution with anticoagulants/antiplatelets; ask a clinician." },
      { severity: "low", text: "Take with food if fishy burps bother you; quality/oxidation varies by brand." },
    ],
  },
  {
    id: "beta_alanine",
    name: "Beta-alanine",
    aliases: ["beta alanine", "carnosine", "ba"],
    tier: "optional",
    tags: ["endurance", "hypertrophy", "daily"],
    medDose: "~3–6 g/day split doses for weeks (tingles are common, harmless for most)",
    window: "Split across the day; not only “right before lifting”",
    when: "Daily for saturation — like creatine, consistency beats acute timing",
    why: "Raises muscle carnosine and can help efforts that burn in the ~1–4 minute range (higher-rep sets, short metcons). Smaller payoff for pure low-rep strength.",
    science:
      "Meta-analyses support small improvements in exercise capacity for efforts in the roughly 1–4 min window. Tingling (paresthesia) is common; splitting doses helps. Not a substitute for progressive training volume.",
    skipIf: "You only do very low-rep strength work and hate the tingle, or you’re chasing pure 1RM strength.",
    wastedEffortNote: "Won’t turn a missed protein target or skipped sessions into gains.",
    claims: [
      { outcome: "Work capacity (1–4 min efforts)", grade: "moderate", note: "Best-supported use case for beta-alanine." },
      { outcome: "Low-rep max strength", grade: "weak", note: "Limited benefit for pure maximal strength." },
      { outcome: "Hypertrophy (indirect)", grade: "mixed", note: "Only helps if extra quality volume actually happens." },
    ],
    interactions: [
      { severity: "low", text: "Tingling is common. Rare issues — stop and check with a clinician if something feels wrong." },
    ],
  },
  {
    id: "citrulline",
    name: "L-citrulline / citrulline malate",
    aliases: ["citrulline", "citrulline malate", "pump", "nitric oxide"],
    tier: "optional",
    tags: ["performance", "pre-workout", "endurance"],
    medDose: "Often ~6–8 g L-citrulline (or ~8 g citrulline malate) pre-workout in studies — products vary",
    window: "~30–60 minutes before training",
    when: "Train days (optional)",
    why: "May improve blood flow / “pump” and slightly help higher-rep performance. Nice-to-have after creatine + protein + caffeine, not before them.",
    science:
      "Evidence is promising but less consistent than creatine or caffeine. Many commercial pre-workouts underdose it. Useful as an optional performance polish, not a foundation.",
    skipIf: "Budget is tight or fundamentals (sleep, protein, creatine) aren’t locked — spend there first.",
    wastedEffortNote: "A weak pre-workout “pump complex” with 1 g citrulline is mostly marketing.",
    claims: [
      { outcome: "Higher-rep performance / pumps", grade: "mixed", note: "Some trials positive; not as reliable as caffeine or creatine." },
      { outcome: "Max strength", grade: "weak", note: "Not a primary strength supplement." },
      { outcome: "Hypertrophy directly", grade: "weak", note: "Indirect at best via training quality." },
    ],
    interactions: [
      { severity: "moderate", text: "May lower blood pressure slightly — caution if on BP meds or with other vasodilators; ask a clinician." },
      { severity: "low", text: "Often stacked with caffeine in pre-workouts — watch total stimulant load." },
    ],
  },
  {
    id: "magnesium",
    name: "Magnesium",
    aliases: ["mag", "magnesium glycinate", "magnesium citrate", "oxide"],
    tier: "conditional",
    tags: ["sleep", "recovery", "deficiency", "daily"],
    medDose: "Common supplemental range ~200–400 mg elemental if diet is low — form matters; don’t exceed labels without advice",
    window: "Evening is common if used for wind-down; with food if GI upset",
    when: "Daily only if diet/gap suggests need",
    why: "Many people under-eat magnesium-rich foods. Fixing a real gap can support sleep and general function; mega-dosing “for gains” is not the play.",
    science:
      "Magnesium is essential. Supplementation helps most when intake is low or losses are high. Evidence for huge performance boosts in already replete athletes is weak. Oxide is cheap but often harsher on the gut.",
    skipIf: "You already eat nuts, seeds, legumes, greens regularly and sleep/recovery are fine.",
    wastedEffortNote: "Oxide at high doses often equals bathroom urgency more than superpowers.",
    claims: [
      { outcome: "Correcting low intake", grade: "moderate", note: "Useful when diet is light on Mg-rich foods." },
      { outcome: "Sleep / relaxation", grade: "mixed", note: "Some people report better sleep; evidence is mixed overall." },
      { outcome: "Strength / hypertrophy", grade: "weak", note: "Not a primary muscle-building supplement when diet is adequate." },
    ],
    interactions: [
      { severity: "moderate", text: "Can reduce absorption of some antibiotics and bisphosphonates if taken at the same time — separate by several hours." },
      { severity: "moderate", text: "Kidney disease: do not self-supplement high doses without medical advice." },
      { severity: "low", text: "High doses → diarrhea (especially oxide/citrate)." },
    ],
  },
  {
    id: "ashwagandha",
    name: "Ashwagandha",
    aliases: ["withania", "ksm-66", "sensoril", "ashwagandha"],
    tier: "optional",
    tags: ["stress", "sleep", "recovery"],
    medDose: "Study products often ~300–600 mg/day of standardized extract — follow product/clinician guidance",
    window: "Often evening if used for wind-down; follow label",
    when: "Daily trial period only if stress/sleep is the bottleneck",
    why: "Some evidence for stress/anxiety and subjective recovery. Not a replacement for sleep hygiene, and not a steroid alternative.",
    science:
      "Several RCTs show reduced stress scores and some strength/recovery signals, but quality and extracts vary. Treat as optional stress-support, not a core hypertrophy stack item.",
    skipIf: "You’re pregnant, have thyroid issues, or take sedating/thyroid meds without clinician OK — or stress isn’t actually your limiter.",
    wastedEffortNote: "Won’t fix under-eating protein or skipping progressive overload.",
    claims: [
      { outcome: "Stress / anxiety scores", grade: "moderate", note: "Best-supported use case in human trials of standardized extracts." },
      { outcome: "Strength / body comp", grade: "mixed", note: "Some positive trials; less consistent than creatine." },
      { outcome: "Testosterone “boost”", grade: "weak", note: "Marketing overstates; not a reliable hormone therapy." },
    ],
    interactions: [
      { severity: "moderate", text: "May enhance sedatives / sleep meds; caution with thyroid medication — ask a clinician." },
      { severity: "moderate", text: "Avoid in pregnancy unless a clinician specifically approves." },
    ],
  },
  {
    id: "electrolytes",
    name: "Sodium / electrolytes",
    aliases: ["salt", "electrolytes", "lmnt", "sodium", "potassium"],
    tier: "conditional",
    tags: ["performance", "endurance", "hydration"],
    medDose: "Context-dependent: heavy sweat, long sessions, low-carb, or hot gyms — not a fixed “more salt = more gains” dose",
    window: "Around hard sweaty sessions or throughout hot training days",
    when: "When sweat losses are high — not mandatory every rest day for everyone",
    why: "Hard training + sweat + low sodium intake can trash session quality. This is about replacing losses, not chugging sports drink for ego.",
    science:
      "Sodium is the main electrolyte lost in sweat. Needs vary wildly by sweat rate and diet. Evidence for fancy multi-electrolyte blends over basic sodium + fluids is often overstated for short gym sessions.",
    skipIf: "You already salt food normally, sessions are short, and you don’t cramp or crash from heat/sweat.",
    wastedEffortNote: "Electrolyte marketing won’t fix chronic under-sleep or under-fueling.",
    claims: [
      { outcome: "Session quality in heavy sweat / heat", grade: "moderate", note: "Replacing sodium/fluids can matter when losses are high." },
      { outcome: "Hypertrophy directly", grade: "weak", note: "Not a muscle-building nutrient beyond enabling training." },
      { outcome: "Cramps cure-all", grade: "mixed", note: "Cramps have many causes; electrolytes help some people, not all." },
    ],
    interactions: [
      { severity: "moderate", text: "High blood pressure or sodium-restricted diets: don’t freestyle high salt — ask a clinician." },
      { severity: "low", text: "Potassium supplements can be risky with certain BP/heart meds — food first unless advised." },
    ],
  },
  {
    id: "hmb",
    name: "HMB",
    aliases: ["hmb", "beta-hydroxy", "hydroxymethylbutyrate"],
    tier: "skip",
    tags: ["recovery", "hypertrophy"],
    medDose: "Often ~3 g/day in studies — usually low ROI for trained lifters on adequate protein",
    window: "Daily in research protocols",
    when: "Rarely needed for MED commercial-gym trainees",
    why: "Sometimes marketed for muscle preservation. For trained people already eating enough protein, evidence is usually disappointing vs cost.",
    science:
      "Stronger signals in untrained or calorie-deficit contexts in some papers; trained lifters with solid protein intake rarely see meaningful extras. Creatine + protein remain higher priority.",
    skipIf: "Almost always for MED stacks — spend on food and creatine first.",
    wastedEffortNote: "Expensive for uncertain upside when protein is already dialed.",
    claims: [
      { outcome: "Muscle in trained lifters (adequate protein)", grade: "weak", note: "Limited reliable benefit for most intermediate+ trainees." },
      { outcome: "Muscle preservation (novice / deficit)", grade: "mixed", note: "Some contexts look better; still not first-line for most gym-goers." },
    ],
    interactions: [
      { severity: "low", text: "Generally considered safe at common study doses; still not “free muscle.”" },
    ],
  },
  {
    id: "bcaa",
    name: "BCAAs (isolated)",
    aliases: ["bcaa", "branched chain", "leucine drink"],
    tier: "skip",
    tags: ["recovery", "hypertrophy"],
    medDose: "Not recommended as a default when total daily protein is already hit",
    window: "N/A for MED — use whole protein instead",
    when: "Skip if protein intake is solid",
    why: "If you already eat enough complete protein, isolated BCAAs rarely add muscle. They’re a classic “busy person wasting money” product.",
    science:
      "Muscle protein synthesis is driven more by total daily essential amino acids / protein than by sipping BCAAs alone. Intact protein (food or whey) covers leucine needs more effectively for most people.",
    skipIf: "You hit ~1.6 g/kg protein from food — which is the MED path.",
    wastedEffortNote: "BCAA pink drinks don’t outlift a chicken sandwich or whey shake for less money.",
    claims: [
      { outcome: "Hypertrophy when protein is already enough", grade: "weak", note: "Little added value over total daily protein." },
      { outcome: "Fasted training comfort", grade: "mixed", note: "Some use them for hunger; whole protein or a meal is usually better." },
    ],
    interactions: [
      { severity: "low", text: "Generally safe; main risk is opportunity cost and sugar in flavored products." },
    ],
  },
  {
    id: "theanine",
    name: "L-theanine",
    aliases: ["theanine", "l-theanine", "green tea"],
    tier: "optional",
    tags: ["focus", "caffeine", "pre-workout", "anxiety"],
    medDose: "Often ~100–200 mg with caffeine (ratios vary)",
    window: "With or shortly after caffeine / pre-workout",
    when: "Train days if caffeine makes you jittery",
    why: "Pairs with caffeine for calmer focus. Useful when coffee helps the session but also spikes anxiety.",
    science:
      "Human studies often combine theanine with caffeine for attention/alertness with less jitter. Not a hypertrophy nutrient — it’s a session-quality aid.",
    skipIf: "You tolerate caffeine fine alone, or you don’t use stimulants.",
    wastedEffortNote: "Won’t replace sleep debt or fix a junk pre-workout formula.",
    claims: [
      { outcome: "Calm focus with caffeine", grade: "moderate", note: "Best-supported use is caffeine + theanine combos." },
      { outcome: "Strength / muscle", grade: "weak", note: "No direct anabolic effect." },
    ],
    interactions: [
      { severity: "low", text: "Generally well tolerated; may add to sedating effects of some meds — ask a pharmacist if unsure." },
    ],
  },
  {
    id: "melatonin",
    name: "Melatonin",
    aliases: ["melatonin", "sleep hormone"],
    tier: "conditional",
    tags: ["sleep", "recovery", "shift"],
    medDose: "Often 0.5–3 mg for sleep onset — more is not always better; follow label/clinician",
    window: "30–60 minutes before intended sleep (or as directed for jet lag/shift)",
    when: "When sleep timing is the bottleneck (shift changes, travel)",
    why: "Can help sleep onset when schedule is wrecked. Recovery is mostly sleep — this is a tool, not a free pass to scroll until 2am.",
    science:
      "Evidence supports melatonin for some circadian/sleep-onset issues. High doses don’t equal better sleep and can leave a hangover feeling. Sleep hygiene still wins.",
    skipIf: "You already sleep well on a stable schedule.",
    wastedEffortNote: "10–20 mg “megadoses” are rarely MED — start low if you use it at all.",
    claims: [
      { outcome: "Sleep onset / jet lag / shift", grade: "moderate", note: "Best-supported contexts; individual response varies." },
      { outcome: "Hypertrophy directly", grade: "weak", note: "Only helps if sleep actually improves." },
    ],
    interactions: [
      { severity: "moderate", text: "May enhance sedatives; caution with some blood-pressure or immune-related conditions/meds — ask a clinician." },
      { severity: "low", text: "Next-day grogginess if dose/timing is off." },
    ],
  },
  {
    id: "collagen",
    name: "Collagen peptides",
    aliases: ["collagen", "gelatin", "joint protein"],
    tier: "conditional",
    tags: ["joints", "tendons", "recovery"],
    medDose: "Study protocols often ~10–15 g/day; sometimes with vitamin C around loading activity",
    window: "Some research uses it ~30–60 min before tendon/ligament loading work",
    when: "If joint/tendon comfort is a limiter — not as your only protein source",
    why: "May support connective tissue comfort for some people. It is not a complete muscle protein replacement for whey/food.",
    science:
      "Emerging evidence for collagen + vitamin C around rehab/tendon loading. Hypertrophy evidence is weaker than complete proteins with leucine. Treat as joint-support optional, not core mass gainer.",
    skipIf: "Joints feel fine and you’re already hitting complete protein targets.",
    wastedEffortNote: "Collagen coffee isn’t a substitute for chicken, dairy, or whey for muscle.",
    claims: [
      { outcome: "Joint / tendon support", grade: "mixed", note: "Promising in some rehab/loading contexts; not universal." },
      { outcome: "Muscle hypertrophy vs whey", grade: "weak", note: "Incomplete amino profile vs dairy/meat/whey for MPS." },
    ],
    interactions: [
      { severity: "low", text: "Usually well tolerated; check allergies (bovine/marine sources)." },
    ],
  },
  {
    id: "zinc",
    name: "Zinc",
    aliases: ["zinc", "zn", "zinc picolinate", "zinc gluconate"],
    tier: "conditional",
    tags: ["deficiency", "immune", "hormones", "daily"],
    medDose: "Only if diet/labs suggest need — common supplemental elemental zinc is modest; don’t chronic megadose",
    window: "Away from high-dose calcium/iron if absorption is a concern; with food if nauseous",
    when: "Daily only with a real gap (low intake, some restrictive diets)",
    why: "Essential mineral. Fixing deficiency matters; stacking zinc “for testosterone” when levels are normal is usually a waste.",
    science:
      "Zinc deficiency can impair many systems including training capacity. Supplementation in replete athletes for hormone “optimization” is oversold. Excess chronic zinc can mess with copper balance.",
    skipIf: "You eat meat/seafood/legumes regularly and have no deficiency reason.",
    wastedEffortNote: "ZMA marketing often outruns the evidence for well-fed lifters.",
    claims: [
      { outcome: "Correcting deficiency", grade: "strong", note: "Clear role when intake/status is low." },
      { outcome: "Testosterone boost if replete", grade: "weak", note: "Not a reliable T booster in adequate diets." },
    ],
    interactions: [
      { severity: "moderate", text: "High doses long-term can lower copper; can interact with some antibiotics — separate timing." },
      { severity: "low", text: "Empty-stomach zinc can nauseate — take with food if needed." },
    ],
  },
  {
    id: "iron_mineral",
    name: "Iron",
    aliases: ["iron", "ferrous", "ferritin", "anemia"],
    tier: "conditional",
    tags: ["deficiency", "energy", "endurance", "labs"],
    medDose: "Only with labs/clinician guidance — self-supplementing iron is risky",
    window: "As directed (often away from calcium/tea/coffee for absorption)",
    when: "If deficient / prescribed — especially relevant for some menstruating athletes",
    why: "Low iron wrecks energy and training quality. This is a lab-driven fix, not a default stack item.",
    science:
      "Iron deficiency impairs oxygen delivery and performance. Excess iron is harmful. MED path: test → treat if needed → don’t megadose for “gains.”",
    skipIf: "Ferritin/iron labs are fine — do not add iron “just in case.”",
    wastedEffortNote: "Random iron pills without labs can be dangerous.",
    claims: [
      { outcome: "Performance when deficient", grade: "strong", note: "Correcting deficiency clearly helps capacity." },
      { outcome: "Extra iron if replete", grade: "weak", note: "No benefit and potential harm." },
    ],
    interactions: [
      { severity: "high", text: "Do not self-dose high iron without medical advice — overload risk is real." },
      { severity: "moderate", text: "Interacts with many meds/minerals on absorption — follow clinician timing." },
    ],
  },
  {
    id: "vitamin_c",
    name: "Vitamin C",
    aliases: ["ascorbic", "vit c", "ascorbate"],
    tier: "conditional",
    tags: ["health", "collagen", "immunity"],
    medDose: "Food first; supplemental often 200–500 mg if used with collagen protocols — megadoses rarely needed",
    window: "With meals; with collagen if using that protocol",
    when: "Diet gap or alongside collagen loading work — not as an immunity megadose habit",
    why: "Essential nutrient. Useful if fruit/veg intake is low or paired with collagen for connective tissue protocols. Not a hypertrophy PED.",
    science:
      "Prevents scurvy and supports collagen synthesis. Mega-dosing for colds/gains is weakly supported for trained athletes with adequate diets. High doses can upset the gut.",
    skipIf: "You already eat fruit/veg daily.",
    wastedEffortNote: "1,000+ mg “immune blasts” aren’t a training strategy.",
    claims: [
      { outcome: "Correcting low intake / collagen cofactor", grade: "moderate", note: "Food first; useful as cofactor in some tendon protocols." },
      { outcome: "Muscle growth", grade: "weak", note: "Not a primary anabolic supplement." },
    ],
    interactions: [
      { severity: "low", text: "High doses may affect some lab tests or upset stomach; kidney stone history — ask a clinician." },
    ],
  },
  {
    id: "curcumin",
    name: "Curcumin / turmeric extract",
    aliases: ["curcumin", "turmeric", "meriva", "bcm-95"],
    tier: "optional",
    tags: ["recovery", "inflammation", "joints"],
    medDose: "Standardized extracts vary widely (often hundreds of mg curcuminoids) — follow studied products/labels",
    window: "With food / fat; formulations with piperine increase absorption (and interactions)",
    when: "Optional if joint discomfort or perceived inflammation is a limiter",
    why: "Some people use it for joint comfort. Evidence is mixed and product quality varies — not a core MED stack item.",
    science:
      "Anti-inflammatory mechanisms are plausible; human performance/hypertrophy outcomes are inconsistent. Bioavailability differs a lot by formula.",
    skipIf: "Joints feel fine and budget is better spent on food/creatine.",
    wastedEffortNote: "Grocery turmeric powder ≠ clinical extract doses in studies.",
    claims: [
      { outcome: "Joint comfort / soreness", grade: "mixed", note: "Some positive trials; results vary by extract." },
      { outcome: "Hypertrophy", grade: "weak", note: "Not a muscle-building foundation." },
    ],
    interactions: [
      { severity: "moderate", text: "May affect bleeding risk / interact with anticoagulants — ask a clinician if on blood thinners." },
      { severity: "moderate", text: "Piperine-enhanced products can change drug metabolism — caution with prescriptions." },
    ],
  },
  {
    id: "tart_cherry",
    name: "Tart cherry (juice / extract)",
    aliases: ["tart cherry", "montmorency", "cherry juice"],
    tier: "optional",
    tags: ["recovery", "sleep", "soreness"],
    medDose: "Study protocols vary (juice servings or concentrated extracts) — follow product evidence",
    window: "Often evening or around hard training blocks in research",
    when: "Optional during high-soreness blocks — not mandatory daily forever",
    why: "May help soreness and sleep for some athletes. Sugar in juice versions can add calories — count them if you’re tracking.",
    science:
      "Some RCTs show reduced soreness/inflammation markers and sleep benefits; not universal. Treat as optional recovery polish.",
    skipIf: "You’re not sore, sleep is fine, or juice sugar doesn’t fit your goals.",
    wastedEffortNote: "Won’t replace progressive programming or protein.",
    claims: [
      { outcome: "Soreness / recovery", grade: "mixed", note: "Several athletic studies positive; effect sizes modest." },
      { outcome: "Sleep", grade: "mixed", note: "Some support; melatonin content is small vs dedicated melatonin." },
    ],
    interactions: [
      { severity: "low", text: "Generally safe; watch calories/sugar in juice forms." },
    ],
  },
  {
    id: "rhodiola",
    name: "Rhodiola rosea",
    aliases: ["rhodiola", "arctic root", "shr-5"],
    tier: "optional",
    tags: ["stress", "fatigue", "focus"],
    medDose: "Standardized extracts in studies often ~200–600 mg/day — use labeled extracts",
    window: "Morning / earlier day (can feel stimulating for some)",
    when: "Optional if fatigue/stress is limiting sessions — after sleep and caffeine basics",
    why: "Adaptogen marketed for fatigue and mental fatigue. Evidence is mixed but some standardized extracts show benefit.",
    science:
      "Several trials on fatigue/stress with standardized rhodiola; quality varies. Not a creatine replacement for strength.",
    skipIf: "Sleep and caffeine are already optimized, or you’re sensitive to stimulating herbs.",
    wastedEffortNote: "Won’t fix chronic under-recovery from nights + max caffeine.",
    claims: [
      { outcome: "Fatigue / mental fatigue", grade: "mixed", note: "Some positive standardized-extract trials." },
      { outcome: "Strength / hypertrophy", grade: "weak", note: "Not a primary muscle supplement." },
    ],
    interactions: [
      { severity: "moderate", text: "May interact with stimulants, antidepressants, or blood-pressure meds — ask a clinician if on Rx." },
    ],
  },
  {
    id: "beet_nitrate",
    name: "Dietary nitrate (beetroot)",
    aliases: ["beetroot", "nitrates", "beet juice", "nitric oxide"],
    tier: "optional",
    tags: ["endurance", "performance", "pre-workout"],
    medDose: "Study beet juices/concentrates vary; look for products standardized for nitrate content",
    window: "~2–3 hours before endurance-style efforts in many protocols",
    when: "Optional for higher-rep / conditioning work — less critical for pure low-rep strength",
    why: "Nitrates can help oxygen efficiency in some endurance contexts. Smaller relevance for short heavy barbell work.",
    science:
      "Evidence is stronger for endurance/time-trial settings than for 1RM strength. Oral bacteria matter for nitrate→nitrite conversion (avoid strong antibacterial mouthwash right before if using this strategy).",
    skipIf: "You only care about low-rep strength and hate beet taste/cost.",
    wastedEffortNote: "A random “NO blend” without real nitrate dose is usually marketing.",
    claims: [
      { outcome: "Endurance performance", grade: "moderate", note: "Best-supported use case." },
      { outcome: "Max strength", grade: "weak", note: "Limited relevance for pure maximal strength." },
    ],
    interactions: [
      { severity: "moderate", text: "Caution with low blood pressure or nitrate meds (e.g. angina drugs) — ask a clinician." },
    ],
  },
  {
    id: "taurine",
    name: "Taurine",
    aliases: ["taurine"],
    tier: "optional",
    tags: ["performance", "hydration", "pre-workout"],
    medDose: "Common study doses ~1–3 g around exercise — evidence still developing",
    window: "Pre-workout in many protocols",
    when: "Optional; low priority vs creatine/caffeine",
    why: "Appears in energy drinks and some pre-workouts. Possible small performance effects; not a foundation supplement.",
    science:
      "Emerging meta-analyses suggest small benefits in some exercise settings; less proven than creatine or caffeine. Fine as optional, not core.",
    skipIf: "You’re already covering creatine + caffeine and want fewer pills.",
    wastedEffortNote: "Energy-drink sugar + taurine isn’t a MED stack.",
    claims: [
      { outcome: "Exercise performance", grade: "mixed", note: "Some positive signals; less consistent than creatine." },
      { outcome: "Hypertrophy", grade: "weak", note: "Not a primary muscle-building nutrient." },
    ],
    interactions: [
      { severity: "low", text: "Generally well tolerated at common doses." },
    ],
  },
  {
    id: "multivitamin",
    name: "Multivitamin / multimineral",
    aliases: ["multi", "multivitamin", "mv", "centrum"],
    tier: "conditional",
    tags: ["health", "deficiency", "daily"],
    medDose: "One standard daily multi if diet is chaotic — not a megadose pack",
    window: "With a meal",
    when: "If food variety is poor — not a license to eat junk",
    why: "Insurance policy for messy diets. Won’t outperform food quality, protein, creatine, or sleep for training results.",
    science:
      "Multis can fill gaps but don’t reliably improve performance in well-fed athletes. Fat-soluble vitamins can accumulate — more is not better.",
    skipIf: "You eat a varied diet and have no deficiency risk factors.",
    wastedEffortNote: "Athlete mega-packs are often expensive urine.",
    claims: [
      { outcome: "Covering diet gaps", grade: "moderate", note: "Reasonable safety net when intake is inconsistent." },
      { outcome: "Strength / hypertrophy", grade: "weak", note: "Not a performance PED when diet is adequate." },
    ],
    interactions: [
      { severity: "moderate", text: "Can contain iron/vitamin K/etc. that interact with meds — check labels if on prescriptions." },
    ],
  },
  {
    id: "eaa",
    name: "Essential amino acids (EAA drinks)",
    aliases: ["eaa", "essential amino", "amino energy"],
    tier: "skip",
    tags: ["hypertrophy", "recovery", "intra-workout"],
    medDose: "Usually unnecessary if daily protein target is hit with food/whey",
    window: "N/A for MED defaults",
    when: "Rarely — maybe if you can’t eat protein and need a stopgap",
    why: "Marketed as superior intra-workout magic. If total daily protein is already solid, EAAs add little for most lifters.",
    science:
      "EAAs can stimulate MPS in lab settings, but whole protein meals/shakes already provide them. Cost per benefit is usually poor vs food.",
    skipIf: "You’re hitting ~1.6 g/kg protein — the MED path.",
    wastedEffortNote: "Sip EAAs while under-eating real protein is rearranging deck chairs.",
    claims: [
      { outcome: "Hypertrophy when protein is adequate", grade: "weak", note: "Little added value over total daily protein." },
      { outcome: "Stopgap when no food available", grade: "mixed", note: "Better than nothing acutely; food still wins." },
    ],
    interactions: [
      { severity: "low", text: "Watch stimulant “amino energy” blends — that’s caffeine marketing in disguise." },
    ],
  },
  {
    id: "glutamine",
    name: "L-glutamine",
    aliases: ["glutamine"],
    tier: "skip",
    tags: ["recovery", "gut", "immunity"],
    medDose: "Not recommended as a default muscle-building supplement",
    window: "N/A for MED hypertrophy stacks",
    when: "Skip for typical gym trainees with adequate protein",
    why: "Body already handles glutamine. For healthy lifters eating enough protein, extra glutamine rarely moves strength or size.",
    science:
      "Limited benefit for hypertrophy/performance in healthy trained people. Clinical gut uses are a different context than “gains.”",
    skipIf: "Almost always for MED commercial-gym goals.",
    wastedEffortNote: "Classic supplement-aisle distraction from creatine and protein.",
    claims: [
      { outcome: "Muscle / strength in healthy lifters", grade: "weak", note: "Poor ROI for typical trainees." },
      { outcome: "Clinical gut contexts", grade: "mixed", note: "Different use case — not a default gym stack." },
    ],
    interactions: [
      { severity: "low", text: "Generally safe; still opportunity cost." },
    ],
  },
  {
    id: "carnitine",
    name: "L-carnitine",
    aliases: ["carnitine", "l-carnitine", "acetyl-l-carnitine", "alc"],
    tier: "skip",
    tags: ["fat loss", "recovery"],
    medDose: "Not a MED default for fat loss or muscle",
    window: "N/A",
    when: "Skip for most trainees",
    why: "Marketed for fat burning. Oral carnitine is a weak lever compared to diet deficit + lifting.",
    science:
      "Performance/fat-loss evidence for oral carnitine in already healthy adults is disappointing vs hype. IV protocols are not a consumer MED path.",
    skipIf: "You’re chasing fat loss — fix calories and steps first.",
    wastedEffortNote: "Fat-burner aisle tax.",
    claims: [
      { outcome: "Fat loss", grade: "weak", note: "Does not replace a calorie deficit." },
      { outcome: "Recovery / androgen receptors (marketing)", grade: "weak", note: "Claims outrun practical evidence for most users." },
    ],
    interactions: [
      { severity: "low", text: "May cause GI upset; discuss with clinician if on thyroid meds or seizure history (esp. acetyl forms)." },
    ],
  },
  {
    id: "tongkat",
    name: "Tongkat ali / “test boosters”",
    aliases: ["tongkat", "eurycoma", "longjack", "testosterone booster", "tribulus"],
    tier: "skip",
    tags: ["hormones", "libido", "marketing"],
    medDose: "Not recommended as a training foundation",
    window: "N/A",
    when: "Skip — sleep, body fat, and medical care beat herb stacks for hormones",
    why: "Sold as natural testosterone. Effects are inconsistent and overhyped versus basics (sleep, weight, lifting, medical evaluation if symptoms).",
    science:
      "Some small studies on tongkat/other herbs exist; none replace diagnosing real hypogonadism or fixing sleep/obesity. Tribulus is especially disappointing for T in healthy men.",
    skipIf: "Always for MED stacks unless a clinician recommends a specific workup/product.",
    wastedEffortNote: "If you have real low-T symptoms, see a clinician — don’t self-stack Amazon bottles.",
    claims: [
      { outcome: "Meaningful testosterone rise in healthy men", grade: "weak", note: "Marketing exceeds evidence." },
      { outcome: "Strength / hypertrophy", grade: "weak", note: "Not comparable to proven training basics or prescribed therapy when indicated." },
    ],
    interactions: [
      { severity: "moderate", text: "Herb–drug interactions possible; avoid if on hormone therapy unless clinician OK." },
    ],
  },
];

/** App-wide MED philosophy (shown in UI) */
export const MED_PRINCIPLES = [
  {
    title: "Train what recovers, skip what doesn’t",
    body: "Every set should buy progress. If a muscle is still cooked, pressing it again is wasted time — the planner prioritizes recovered muscles that are behind on weekly volume.",
  },
  {
    title: "Compounds first, isolation only if needed",
    body: "One leg press + row + press covers more of the body per minute than six isolation machines. Isolation is a finisher when a muscle is still short of MED sets.",
  },
  {
    title: "Weekly volume targets, not daily perfection",
    body: "Sparse schedules win by hitting enough hard sets per muscle across the week/month — not by living in the gym 5 days if life only gives you 2–3 off days.",
  },
  {
    title: "Recovery is part of the dose",
    body: "Sleep after nights, food protein, and rest days are not optional fluff. Without them the training dose doesn’t “land.”",
  },
  {
    title: "Supplements: only proven MED stack",
    body: "Creatine + enough protein are the high-ROI defaults. Caffeine is optional for session quality. Vit D / omega / magnesium only if you have a real gap. Optional pumps or stress aids come after fundamentals — most kitchen-sink pre-workouts are noise.",
  },
];

/**
 * Training dose by readiness. Switch any day (or mid-session) — plan rebuilds.
 * MED = least that still progresses · OED = sweet-spot volume when recovered · Rough = protect recovery
 */
export const DOSE_PROFILES = {
  rough: {
    id: "rough",
    label: "Rough day",
    short: "Low",
    feel: "Feel bad / beat up / low sleep",
    science:
      "When recovery is poor, extra volume mostly adds fatigue. A short session maintains the habit and some stimulus without digging a deeper hole.",
    sessionMinutes: 40,
    setScale: 0.75,
    maxExercises: 5,
    isolationBonus: 0,
    recoveryBump: 0.1,
  },
  med: {
    id: "med",
    label: "Minimum effective dose",
    short: "MED",
    feel: "Okay / normal energy",
    science:
      "Minimum effective dose is the least hard work that still drives progress for most people with limited time — compounds first, enough weekly sets, then stop.",
    sessionMinutes: 55,
    setScale: 1.0,
    maxExercises: 7,
    isolationBonus: 0,
    recoveryBump: 0,
  },
  oed: {
    id: "oed",
    label: "Optimum effective dose",
    short: "OED",
    feel: "Feel strong / recovered / more time",
    science:
      "Optimum effective dose is more volume than the bare minimum when recovery and time allow — still short of junk volume. Useful on good days to push adaptation harder without maxing recoverable volume every session.",
    sessionMinutes: 75,
    setScale: 1.2,
    maxExercises: 9,
    isolationBonus: 1,
    recoveryBump: -0.05,
  },
};

export const DEFAULT_SETTINGS = {
  sessionMinutes: 55,
  /**
   * Hard time-box for the planner (minutes). 0 = use sessionMinutes only.
   * Trims volume via session budget the same way as sessionMinutes.
   */
  timeBoxMinutes: 0,
  splitPreference: "auto",
  /** Baseline weekly coverage targets (stable; day dose changes session size, not the yardstick) */
  medMultiplier: 0.9,
  recoveryMultiplier: 1.15,
  excludedExercises: ["walking_lunge"],
  preferredExercises: ["leg_press", "rdl", "bb_bench", "lat_pulldown", "seated_cable_row", "chest_supported_row", "leg_extension", "hack_squat"],
  displayName: "",
  /** auto = unlock by completed sessions · guided | building | custom = force stage */
  coachMode: "auto",
  /** Default dose when a day has no override: rough | med | oed */
  defaultDose: "med",
  /** Prefer quality-gated unlocks (logged hard sets) when coachMode is auto */
  coachQualityGates: true,
  /** Show warm-up ladder under each lift */
  showWarmups: true,
  /** Default rest timer seconds when starting from compound */
  restDefaultSec: 90,
  /** Optional bodyweight (kg) for protein hints — local only */
  bodyweightKg: null,
  /** med | program | custom */
  trainingMode: "med",
  activeProgramId: null,
  /** null = unrestricted equipment */
  equipment: null,
  equipmentPreset: null,
  customTargets: null,
  trainingMaxes: { squat: null, bench: null, deadlift: null, press: null },
  bbbSupplementalPct: 0.5,
  /** 0–3 for 5/3/1 wave */
  programWeekOffset: 0,
};

/** August 2026 shift-aware defaults (can clear/edit in app) */
export const SEED_AUGUST_2026 = {
  year: 2026,
  month: 7, // JS Date month 0-indexed when constructing; we store ISO strings
  trainingDays: [
    "2026-08-03",
    "2026-08-09",
    "2026-08-14",
    "2026-08-16",
    "2026-08-18",
    "2026-08-20",
    "2026-08-27",
  ],
  restForced: ["2026-08-07", "2026-08-25"], // post-nights
  lightOnly: ["2026-08-08", "2026-08-26"],
  workOff: [
    "2026-08-03", "2026-08-07", "2026-08-08", "2026-08-09",
    "2026-08-14", "2026-08-15", "2026-08-16", "2026-08-17", "2026-08-18", "2026-08-19", "2026-08-20",
    "2026-08-25", "2026-08-26", "2026-08-27",
  ],
};
