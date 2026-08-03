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
  completedSessions: {}, // iso -> { completedAt, exercises done flags }
  /** iso -> "rough" | "med" | "oed" — how you feel that day (change anytime) */
  dayDose: {},
  /** Supplement ids marked “on my stack” (local-only) */
  myStack: [],
  logs: [], // optional set logs later
  onboardingComplete: false,
  version: 1,
  updatedAt: null,
});

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY();
    const data = JSON.parse(raw);
    return { ...EMPTY(), ...data };
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
