/**
 * Stack today's lifts so the work that still matters most is at the top.
 * Time-crunched sessions: compounds covering lagging muscles first, isolation last.
 */
import { MUSCLES } from "./data.js";
import { weeklyTarget, weekKey, addDays } from "./planner.js";
import { loggedCoverage } from "./logging.js";

const ROLE_RANK = { compound: 0, accessory: 1, isolation: 2 };

/** Remaining weekly hard-set need per muscle (target − logged this week through today). */
export function muscleNeedMap({ logs, settings, today, sessionDay, weekStart } = {}) {
  const t = today || new Date().toISOString().slice(0, 10);
  const mon = weekStart || weekKey(sessionDay || t);
  const logged = loggedCoverage(logs, mon, addDays(t, 1));
  const need = {};
  for (const m of MUSCLES) {
    const target = weeklyTarget(m, settings || {});
    need[m.id] = Math.max(0, target - (logged[m.id] || 0));
  }
  return need;
}

export function exerciseNeedScore(ex, muscleNeed = {}) {
  return (ex?.primary || []).reduce((n, m) => n + (Number(muscleNeed[m]) || 0), 0);
}

/**
 * @param {Array} exercises
 * @param {{ muscleNeed?: Record<string, number>, doneLast?: boolean }} [opts]
 * @returns {Array} new array, original objects
 */
export function orderExercisesByNeed(exercises, { muscleNeed = {}, doneLast = true } = {}) {
  return [...(exercises || [])]
    .map((ex, i) => ({
      ex,
      i,
      done: doneLast && !!ex.done,
      gap: !!ex.isGap,
      role: ex.isGap ? 3 : ROLE_RANK[ex.role] ?? 2,
      need: exerciseNeedScore(ex, muscleNeed),
    }))
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (a.gap !== b.gap) return a.gap ? 1 : -1;
      if (a.role !== b.role) return a.role - b.role;
      if (b.need !== a.need) return b.need - a.need;
      return a.i - b.i;
    })
    .map((row) => row.ex);
}
