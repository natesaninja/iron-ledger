/**
 * localStorage persistence (MacroLedger-style offline)
 */

const KEY = "strengthledger_v1";

const EMPTY = () => ({
  settings: null,
  trainingDays: [],
  restForced: [],
  lightOnly: [],
  workOff: [],
  completedSessions: {}, // iso -> { completed, exerciseDone, byExerciseId, doseId }
  /** iso -> "rough" | "med" | "oed" — how you feel that day (change anytime) */
  dayDose: {},
  /** Supplement ids marked “on my stack” (local-only) */
  myStack: [],
  /**
   * Set logs: iso -> { exercises: { exerciseId: { sets: [{weight,reps,hard,rpe}], skipReason } } }
   */
  logs: {},
  /** iso -> { suppId: true } daily stack check-in */
  stackCheckins: {},
  /** Inclusive end date (ISO) for deload — force rough while active */
  deloadUntil: null,
  onboardingComplete: false,
  version: 2,
  updatedAt: null,
});

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY();
    const data = JSON.parse(raw);
    const merged = { ...EMPTY(), ...data };
    // Migrate old logs:[] stub
    if (Array.isArray(merged.logs)) merged.logs = {};
    if (!merged.logs || typeof merged.logs !== "object") merged.logs = {};
    if (!merged.stackCheckins || typeof merged.stackCheckins !== "object") merged.stackCheckins = {};
    return merged;
  } catch {
    return EMPTY();
  }
}

export function saveState(state) {
  const payload = {
    ...state,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(KEY, JSON.stringify(payload));
  return payload;
}

export function exportJson(state) {
  return JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2);
}

export function importJson(text) {
  const data = JSON.parse(text);
  if (!data || typeof data !== "object") throw new Error("Invalid backup");
  return saveState({ ...EMPTY(), ...data, version: 1 });
}

export function clearAll() {
  localStorage.removeItem(KEY);
}
