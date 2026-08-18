/**
 * Training-week strip + next-session progression helpers (pure).
 */
import { weekKey, parseISO, toISO, addDays, weekdayShort } from "./planner.js";
import { lastWorkingSets, suggestNext, formatLoad } from "./logging.js";

export { weekKey };

/**
 * Seven ISO dates Mon→Sun for the week containing `iso`.
 */
export function weekDates(iso) {
  const mon = weekKey(iso);
  return [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(mon, i));
}

/**
 * @param {object} opts
 * @param {string[]} opts.trainingDays
 * @param {object} opts.completedSessions
 * @param {object} opts.dayDose
 * @param {string|null} opts.deloadUntil
 * @param {string} opts.today
 * @returns {{
 *   mon: string,
 *   days: Array<{ iso: string, dow: string, isTrain: boolean, done: boolean, missed: boolean, rough: boolean, isToday: boolean }>,
 *   trainCount: number,
 *   doneCount: number,
 *   missedCount: number,
 *   roughCount: number,
 *   deloadActive: boolean,
 *   headline: string,
 *   subline: string
 * }}
 */
export function buildTrainingWeekStrip({
  trainingDays = [],
  completedSessions = {},
  dayDose = {},
  deloadUntil = null,
  today,
} = {}) {
  const t = today || toISO(new Date());
  const trainSet = new Set(trainingDays || []);
  const days = weekDates(t).map((iso) => {
    const isTrain = trainSet.has(iso);
    const done = !!(completedSessions?.[iso]?.completed);
    const missed = isTrain && iso < t && !done;
    const rough = dayDose?.[iso] === "rough";
    return {
      iso,
      dow: weekdayShort(iso),
      isTrain,
      done,
      missed,
      rough,
      isToday: iso === t,
    };
  });

  const trainCount = days.filter((d) => d.isTrain).length;
  const doneCount = days.filter((d) => d.isTrain && d.done).length;
  const missedCount = days.filter((d) => d.missed).length;
  const roughCount = days.filter((d) => d.rough).length;
  const deloadActive = !!(deloadUntil && t <= deloadUntil);

  let headline = `${doneCount}/${trainCount || 0} train days done`;
  if (!trainCount) headline = "No train days this week";
  else if (missedCount) headline = `${doneCount}/${trainCount} done · ${missedCount} missed`;

  const bits = [];
  if (roughCount) bits.push(`${roughCount} rough`);
  if (deloadActive) bits.push(`deload → ${deloadUntil}`);
  const remaining = days.filter((d) => d.isTrain && d.iso >= t && !d.done).length;
  if (remaining && trainCount) bits.push(`${remaining} left`);
  const subline = bits.length ? bits.join(" · ") : trainCount ? "On track for the week" : "Mark days on Plan";

  return {
    mon: weekKey(t),
    days,
    trainCount,
    doneCount,
    missedCount,
    roughCount,
    deloadActive,
    headline,
    subline,
  };
}

/**
 * Next-session targets for each lift in today's session (from prior logs).
 *
 * @returns {Array<{ exerciseId: string, name: string, line: string, loadLabel: string, hasHistory: boolean, sets: Array }>}
 */
export function buildProgressionSheet(session, logs) {
  const day = session?.day;
  const out = [];
  for (const ex of session?.exercises || []) {
    if (ex.isGap) continue;
    const last = lastWorkingSets(logs, ex.exerciseId, day);
    const sug = suggestNext(last, ex.reps);
    const hasHistory = !!(last?.sets?.length);
    let loadLabel = "First time";
    if (hasHistory && sug.sets?.length) {
      const w = sug.sets[0]?.weight;
      const r = sug.sets[0]?.reps;
      loadLabel = w != null && w !== "" ? `${formatLoad(w)} × ${r ?? "—"}` : sug.lines[0] || "Match last";
    }
    out.push({
      exerciseId: ex.exerciseId,
      name: ex.name,
      line: (sug.lines && sug.lines[0]) || loadLabel,
      loadLabel,
      hasHistory,
      sets: sug.sets || [],
      role: ex.role,
    });
  }
  return out;
}
