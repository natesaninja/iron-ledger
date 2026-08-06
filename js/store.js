/**
 * localStorage persistence (MacroLedger-style offline)
 * Versioned migrations + backup helpers
 */

const KEY = "strengthledger_v1";
/** Schema version written on save */
export const STORE_VERSION = 3;

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
  /** ISO timestamp of last successful export / share backup */
  lastBackupAt: null,
  /** Days between backup reminders (default 7) */
  backupRemindDays: 7,
  version: STORE_VERSION,
  updatedAt: null,
});

/**
 * Apply sequential migrations so older backups stay readable.
 */
export function migrateState(raw) {
  const base = EMPTY();
  if (!raw || typeof raw !== "object") return base;
  let data = { ...base, ...raw };

  // v1 → v2: logs was sometimes an array stub
  if (Array.isArray(data.logs)) data.logs = {};
  if (!data.logs || typeof data.logs !== "object") data.logs = {};
  if (!data.stackCheckins || typeof data.stackCheckins !== "object") data.stackCheckins = {};
  if (!data.completedSessions || typeof data.completedSessions !== "object") data.completedSessions = {};
  if (!data.dayDose || typeof data.dayDose !== "object") data.dayDose = {};
  if (!Array.isArray(data.myStack)) data.myStack = [];
  if (!Array.isArray(data.trainingDays)) data.trainingDays = [];
  if (!Array.isArray(data.restForced)) data.restForced = [];
  if (!Array.isArray(data.lightOnly)) data.lightOnly = [];
  if (!Array.isArray(data.workOff)) data.workOff = [];

  const ver = +data.version || 1;
  // v2 → v3: backup metadata
  if (ver < 3) {
    if (data.lastBackupAt === undefined) data.lastBackupAt = null;
    if (data.backupRemindDays == null) data.backupRemindDays = 7;
  }

  data.version = STORE_VERSION;
  return data;
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY();
    return migrateState(JSON.parse(raw));
  } catch {
    return EMPTY();
  }
}

export function saveState(state) {
  const payload = {
    ...state,
    version: STORE_VERSION,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(KEY, JSON.stringify(payload));
  return payload;
}

export function exportJson(state) {
  return JSON.stringify(
    {
      ...state,
      version: STORE_VERSION,
      exportedAt: new Date().toISOString(),
      app: "iron-ledger",
    },
    null,
    2
  );
}

export function importJson(text) {
  const data = JSON.parse(text);
  if (!data || typeof data !== "object") throw new Error("Invalid backup");
  const migrated = migrateState(data);
  return saveState(migrated);
}

export function clearAll() {
  localStorage.removeItem(KEY);
}

/** True if user should be nudged to export (no backup or older than remind days). */
export function needsBackupReminder(state, now = new Date()) {
  const days = Math.max(1, +state?.backupRemindDays || 7);
  const last = state?.lastBackupAt;
  if (!last) {
    // Only nag if there's something worth saving
    const hasData =
      (state?.trainingDays || []).length > 0 ||
      Object.keys(state?.logs || {}).length > 0 ||
      Object.keys(state?.completedSessions || {}).length > 0;
    return hasData;
  }
  const t = Date.parse(last);
  if (Number.isNaN(t)) return true;
  const ageMs = now.getTime() - t;
  return ageMs >= days * 24 * 60 * 60 * 1000;
}

export function markBackupDone(state) {
  state.lastBackupAt = new Date().toISOString();
  return saveState(state);
}

export function formatBackupAge(lastBackupAt, now = new Date()) {
  if (!lastBackupAt) return "Never backed up";
  const t = Date.parse(lastBackupAt);
  if (Number.isNaN(t)) return "Never backed up";
  const days = Math.floor((now.getTime() - t) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "Backed up today";
  if (days === 1) return "Backed up yesterday";
  return `Last backup ${days} days ago`;
}
