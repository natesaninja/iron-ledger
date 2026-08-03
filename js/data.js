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
    why: "Main squat pattern: loads quads and glutes hard so one lift covers a lot of lower-body needs." },
  { id: "leg_press", name: "Leg Press", pattern: "squat", primary: ["quads", "glutes"], secondary: ["hamstrings"], role: "compound", minPerSet: 2.5, sets: 3, reps: "8-12",
    why: "Same job as a squat (quads/glutes) with back support — easier to progress confidently in a busy gym." },
  { id: "hack_squat", name: "Hack Squat", pattern: "squat", primary: ["quads"], secondary: ["glutes"], role: "compound", minPerSet: 2.5, sets: 3, reps: "8-12",
    why: "Guided squat path that hammers quads without balancing a free bar." },
  { id: "leg_extension", name: "Leg Extension", pattern: "isolation", primary: ["quads"], secondary: [], role: "isolation", minPerSet: 2.0, sets: 2, reps: "10-15",
    why: "Finishes quads alone when compounds already did the heavy work — simple machine, clear target." },
  { id: "rdl", name: "Romanian Deadlift", pattern: "hinge", primary: ["hamstrings", "glutes"], secondary: ["lower_back", "traps"], role: "compound", minPerSet: 3.5, sets: 3, reps: "6-10",
    why: "Hinge pattern for hamstrings and glutes with less floor-pull fatigue than a conventional deadlift." },
  { id: "conventional_dl", name: "Conventional Deadlift", pattern: "hinge", primary: ["hamstrings", "glutes", "lower_back"], secondary: ["traps", "upper_back", "core"], role: "compound", minPerSet: 4.0, sets: 3, reps: "3-5",
    why: "Big posterior-chain lift: hamstrings, glutes, and back work together — high payoff per set when recovered." },
  { id: "seated_leg_curl", name: "Seated Leg Curl", pattern: "isolation", primary: ["hamstrings"], secondary: [], role: "isolation", minPerSet: 2.0, sets: 3, reps: "8-12",
    why: "Isolates hamstrings so they get direct volume without taxing the lower back again." },
  { id: "hip_thrust", name: "Barbell Hip Thrust", pattern: "hinge", primary: ["glutes"], secondary: ["hamstrings", "core"], role: "compound", minPerSet: 3.0, sets: 3, reps: "6-10",
    why: "Glute-focused hinge that builds the back of the hip without heavy spinal loading like a max deadlift." },
  { id: "cable_pull_through", name: "Cable Pull-Through", pattern: "hinge", primary: ["glutes", "hamstrings"], secondary: [], role: "accessory", minPerSet: 2.0, sets: 2, reps: "10-15",
    why: "Light hinge pattern for glutes/hamstrings — good support work when you want hinge volume without a heavy bar." },
  { id: "bb_bench", name: "Barbell Bench Press", pattern: "horizontal_push", primary: ["chest"], secondary: ["front_delts", "triceps"], role: "compound", minPerSet: 3.5, sets: 3, reps: "5-8",
    why: "Primary horizontal push: chest drives the lift while shoulders and triceps assist — efficient upper push." },
  { id: "db_bench", name: "Dumbbell Bench Press", pattern: "horizontal_push", primary: ["chest"], secondary: ["front_delts", "triceps"], role: "compound", minPerSet: 3.0, sets: 3, reps: "8-12",
    why: "Chest press with each arm free — more range of motion and easier to bail than a fixed bar." },
  { id: "incline_db_press", name: "Incline DB Press", pattern: "horizontal_push", primary: ["chest", "front_delts"], secondary: ["triceps"], role: "compound", minPerSet: 3.0, sets: 3, reps: "8-12",
    why: "Upper-chest and front-delt emphasis so pressing volume isn’t only flat-bench." },
  { id: "chest_press_machine", name: "Machine Chest Press", pattern: "horizontal_push", primary: ["chest"], secondary: ["front_delts", "triceps"], role: "compound", minPerSet: 2.5, sets: 3, reps: "8-12",
    why: "Chest push on a stable machine — same pattern as bench with less setup stress." },
  { id: "cable_fly", name: "Cable Fly", pattern: "isolation", primary: ["chest"], secondary: [], role: "isolation", minPerSet: 2.0, sets: 2, reps: "10-15",
    why: "Chest-only finisher after presses so the pecs get extra work without more shoulder load from heavy pressing." },
  { id: "ohp", name: "Barbell Overhead Press", pattern: "vertical_push", primary: ["front_delts", "side_delts"], secondary: ["triceps", "traps", "core"], role: "compound", minPerSet: 3.5, sets: 3, reps: "5-8",
    why: "Vertical push for shoulders and triceps; builds pressing strength you don’t get from bench alone." },
  { id: "db_shoulder_press", name: "DB Shoulder Press", pattern: "vertical_push", primary: ["front_delts", "side_delts"], secondary: ["triceps"], role: "compound", minPerSet: 3.0, sets: 3, reps: "8-12",
    why: "Shoulder press with independent arms — solid overhead work with easier joint freedom than a bar." },
  { id: "machine_shoulder_press", name: "Machine Shoulder Press", pattern: "vertical_push", primary: ["front_delts", "side_delts"], secondary: ["triceps"], role: "compound", minPerSet: 2.5, sets: 3, reps: "8-12",
    why: "Guided overhead press for delts when you want vertical push volume with less balance demand." },
  { id: "lateral_raise", name: "DB Lateral Raise", pattern: "isolation", primary: ["side_delts"], secondary: [], role: "isolation", minPerSet: 2.0, sets: 3, reps: "12-15",
    why: "Side delts don’t get fully hit by bench or rows — this is direct width work." },
  { id: "cable_lateral", name: "Cable Lateral Raise", pattern: "isolation", primary: ["side_delts"], secondary: [], role: "isolation", minPerSet: 2.0, sets: 2, reps: "12-15",
    why: "Constant cable tension on side delts — cleaner isolation than swinging dumbbells." },
  { id: "face_pull", name: "Face Pull", pattern: "isolation", primary: ["rear_delts", "upper_back"], secondary: ["traps"], role: "isolation", minPerSet: 2.0, sets: 3, reps: "12-15",
    why: "Rear delts and upper back balance all the pressing; helps posture and shoulder health." },
  { id: "reverse_pec_deck", name: "Reverse Pec Deck", pattern: "isolation", primary: ["rear_delts"], secondary: ["upper_back"], role: "isolation", minPerSet: 2.0, sets: 2, reps: "12-15",
    why: "Machine rear-delt work so the back of the shoulder isn’t neglected after chest/shoulder presses." },
  { id: "pullup", name: "Pull-Up / Assisted", pattern: "vertical_pull", primary: ["lats"], secondary: ["biceps", "upper_back"], role: "compound", minPerSet: 3.0, sets: 3, reps: "5-10",
    why: "Vertical pull for lats (and arms) — the main “up” pull pattern opposite pressing." },
  { id: "lat_pulldown", name: "Lat Pulldown", pattern: "vertical_pull", primary: ["lats"], secondary: ["biceps", "upper_back"], role: "compound", minPerSet: 2.5, sets: 3, reps: "8-12",
    why: "Same lat-focused vertical pull as a pull-up, with easier load control on a machine." },
  { id: "bb_row", name: "Barbell Row", pattern: "horizontal_pull", primary: ["upper_back", "lats"], secondary: ["rear_delts", "biceps", "lower_back"], role: "compound", minPerSet: 3.5, sets: 3, reps: "6-10",
    why: "Horizontal pull for thickness through the back — balances horizontal presses like bench." },
  { id: "chest_supported_row", name: "Chest-Supported Row", pattern: "horizontal_pull", primary: ["upper_back", "lats"], secondary: ["rear_delts", "biceps"], role: "compound", minPerSet: 2.5, sets: 3, reps: "8-12",
    why: "Row for back thickness without lower-back strain — chest pad removes the need to hold torso position." },
  { id: "seated_cable_row", name: "Seated Cable Row", pattern: "horizontal_pull", primary: ["upper_back", "lats"], secondary: ["biceps", "rear_delts"], role: "compound", minPerSet: 2.5, sets: 3, reps: "8-12",
    why: "Stable cable row for mid-back and lats; easy to control and swap grips if a station is free." },
  { id: "straight_arm_pulldown", name: "Straight-Arm Pulldown", pattern: "isolation", primary: ["lats"], secondary: [], role: "isolation", minPerSet: 2.0, sets: 2, reps: "10-15",
    why: "Lat-only finisher that doesn’t tax biceps like curls or heavy rows." },
  { id: "bb_curl", name: "Barbell Curl", pattern: "isolation", primary: ["biceps"], secondary: [], role: "isolation", minPerSet: 2.0, sets: 2, reps: "8-12",
    why: "Direct biceps work when pulls alone haven’t met arm volume for the week." },
  { id: "db_curl", name: "DB Curl", pattern: "isolation", primary: ["biceps"], secondary: [], role: "isolation", minPerSet: 2.0, sets: 2, reps: "10-12",
    why: "Simple biceps isolation; each arm works independently." },
  { id: "triceps_pushdown", name: "Triceps Pushdown", pattern: "isolation", primary: ["triceps"], secondary: [], role: "isolation", minPerSet: 2.0, sets: 2, reps: "10-15",
    why: "Direct triceps after pressing so the arms get finished without another heavy compound." },
  { id: "oh_triceps_ext", name: "Overhead Triceps Extension", pattern: "isolation", primary: ["triceps"], secondary: [], role: "isolation", minPerSet: 2.0, sets: 2, reps: "10-15",
    why: "Hits the long head of the triceps in a stretch — pairs well with pushdowns." },
  { id: "standing_calf", name: "Standing Calf Raise", pattern: "isolation", primary: ["calves"], secondary: [], role: "isolation", minPerSet: 2.0, sets: 3, reps: "8-15",
    why: "Calves rarely get enough work from compounds alone — short direct sets cover them." },
  { id: "seated_calf", name: "Seated Calf Raise", pattern: "isolation", primary: ["calves"], secondary: [], role: "isolation", minPerSet: 2.0, sets: 2, reps: "10-15",
    why: "Seated calf work targets the soleus; complements standing raises." },
  { id: "cable_crunch", name: "Cable Crunch", pattern: "isolation", primary: ["core"], secondary: [], role: "isolation", minPerSet: 2.0, sets: 2, reps: "12-15",
    why: "Loaded abs so the core gets a clear stimulus beyond “bracing” on big lifts." },
  { id: "plank", name: "Plank", pattern: "isolation", primary: ["core"], secondary: [], role: "isolation", minPerSet: 1.5, sets: 2, reps: "30-60s",
    why: "Anti-extension core work — teaches the trunk to stay stable under tension." },
  { id: "shrug", name: "DB Shrug", pattern: "isolation", primary: ["traps"], secondary: [], role: "isolation", minPerSet: 2.0, sets: 2, reps: "10-15",
    why: "Direct upper traps when rows/pulls haven’t covered them enough." },
  { id: "back_extension", name: "Back Extension", pattern: "hinge", primary: ["lower_back", "glutes"], secondary: ["hamstrings"], role: "accessory", minPerSet: 2.0, sets: 2, reps: "10-15",
    why: "Controlled lower-back and glute work that reinforces the hinge without a heavy deadlift." },
  { id: "walking_lunge", name: "Walking Lunge (DB)", pattern: "squat", primary: ["quads", "glutes"], secondary: ["hamstrings", "core"], role: "accessory", minPerSet: 3.0, sets: 2, reps: "8-12/leg",
    why: "Single-leg squat pattern for balance and glute/quad work (excluded by default until you’re ready)." },
];

/**
 * MED-first supplement stack — only what earns its place under time constraints.
 * "tier": core = best evidence / usually worth it | conditional = only if gap | optional = performance nice-to-have
 * Not medical advice. Evidence summaries are educational.
 */
export const SUPPLEMENTS = [
  {
    id: "creatine",
    name: "Creatine monohydrate",
    tier: "core",
    medDose: "3–5 g every day (no loading required for MED)",
    window: "Any consistent time — with a meal is fine",
    when: "Daily, train or rest",
    why: "Most researched sports supplement. Raises muscle phosphocreatine so you can do a bit more high-intensity work (extra reps/sets over months). That extra recoverable work is the growth signal — not magic powder during the set.",
    science: "Meta-analyses show small-to-moderate gains in strength and lean mass with resistance training vs training alone. Works by improving ATP regeneration in short hard efforts. Timing is not critical; saturation from daily use matters, not “pre-workout only.”",
    skipIf: "You already get plenty from food and don’t care about marginal strength gains; or a clinician advised against it (rare).",
    wastedEffortNote: "Loading 20 g/day is optional, not required for results — daily 3–5 g is the MED path.",
  },
  {
    id: "protein",
    name: "Protein (food first; whey if needed)",
    tier: "core",
    medDose: "About 1.6–2.2 g per kg bodyweight per day total from all food (not “per shake”)",
    window: "Spread across the day; a post-workout shake only helps if it fills the daily gap",
    when: "Every day — recovery happens between sessions",
    why: "Muscle repair needs amino acids. Under a sparse schedule you can’t afford to miss recovery nutrition on rest days either.",
    science: "Reviews (e.g. Morton et al., ISSN positions) support ~1.6 g/kg/day as enough for most training people to maximize hypertrophy; more than ~2.2 g/kg rarely adds more muscle. Food counts fully; powder is a convenience tool, not superior magic.",
    skipIf: "You already hit the daily target with meals.",
    wastedEffortNote: "Chugging protein only post-workout while under-eating the rest of the day wastes the MED idea — total daily intake matters most.",
  },
  {
    id: "caffeine",
    name: "Caffeine (optional)",
    tier: "optional",
    medDose: "About 3–6 mg per kg bodyweight only on hard sessions if you tolerate it (many do well at the low end)",
    window: "~30–60 minutes before training",
    when: "Train days only — skip if it wrecks sleep",
    why: "Can raise alertness and training quality for a short session so the limited gym time counts. Sleep is higher priority than caffeine on night-shift transitions.",
    science: "ISSN and multiple trials: caffeine reliably improves strength/power and workout performance in many people. It’s a performance aid, not a muscle-building nutrient. Tolerance and sleep disruption are real tradeoffs.",
    skipIf: "Anxiety, poor sleep, late sessions, or coming off nights — then caffeine is anti-MED because it steals recovery.",
    wastedEffortNote: "Pre-workout blends with 15 ingredients usually don’t beat plain caffeine + creatine + protein fundamentals.",
  },
  {
    id: "vitd",
    name: "Vitamin D (conditional)",
    tier: "conditional",
    medDose: "Only if deficient or low sun/labs — dose per clinician; common OTC is not a free pass to megadose",
    window: "With a meal that has some fat",
    when: "Daily if advised",
    why: "Correcting a real deficiency supports general health and may help training capacity; supplementing when levels are already fine is low return.",
    science: "Vitamin D is a hormone precursor. Deficiency is common in low-sun lifestyles. Evidence for “extra D builds more muscle in replete people” is weak; evidence for fixing deficiency improving health outcomes is stronger.",
    skipIf: "Recent labs are normal and sun/diet is adequate.",
    wastedEffortNote: "Don’t buy D “for gains” without a reason — test or clinical advice beats guessing.",
  },
  {
    id: "omega",
    name: "Omega-3 (EPA/DHA) (conditional)",
    tier: "conditional",
    medDose: "Only if you rarely eat fatty fish — food first (e.g. fish 1–2×/week often covers MED)",
    window: "With a meal",
    when: "Daily if diet gap",
    why: "Fills an essential fatty-acid gap for general health. Not a primary hypertrophy driver.",
    science: "EPA/DHA have cardiovascular and inflammatory roles. Direct muscle-growth effects of fish oil in already healthy trainees are modest/inconsistent. MED is “don’t be deficient,” not “more pills = more muscle.”",
    skipIf: "You already eat fatty fish regularly.",
    wastedEffortNote: "Omega-3 does not replace sleep, protein, or progressive training.",
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
    body: "Creatine + enough protein are the high-ROI defaults. Caffeine is optional for session quality. Vit D / omega only if you have a real gap. Everything else is usually noise for busy schedules.",
  },
];

export const DEFAULT_SETTINGS = {
  sessionMinutes: 55,
  splitPreference: "auto",
  medMultiplier: 0.9,
  recoveryMultiplier: 1.15,
  excludedExercises: ["walking_lunge"],
  preferredExercises: ["leg_press", "rdl", "bb_bench", "lat_pulldown", "seated_cable_row", "chest_supported_row", "leg_extension", "hack_squat"],
  displayName: "",
  /** auto = unlock by completed sessions · guided | building | custom = force stage */
  coachMode: "auto",
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
