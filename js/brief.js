/**
 * Field brief — what’s in Iron Ledger (on-device overview, not a sixth tab).
 */

export const BRIEF_SECTIONS = [
  {
    id: "modes",
    code: "01",
    title: "How sessions are built",
    view: "settings",
    body: "Setup → Training mode. MED Auto covers muscles from your train days. Programs follow a fixed template (5/3/1 BBB, PPL, Upper/Lower, bro split). Custom boosts the muscle groups you emphasize.",
  },
  {
    id: "today",
    code: "02",
    title: "Today",
    view: "today",
    body: "The gym floor. Week strip, coach note, next targets from last hard sets, then the session. Low / MED / OED changes dose if energy shifts — even mid-session.",
  },
  {
    id: "logging",
    code: "03",
    title: "Set log",
    view: "today",
    body: "Weight × reps × optional RPE. +/− steps the load. Same as last, Done → rest timer, plate hint on heavy barbell work. Easy / Right / Hard adapts remaining sets. Skip a lift with a reason if gear or joints say no.",
  },
  {
    id: "plan",
    code: "04",
    title: "Plan",
    view: "plan",
    body: "Tap a day: Train → Rest → Easy → clear. Rebuild after you change days, equipment, or mode. The calendar is the schedule — Today only shows days you marked.",
  },
  {
    id: "cover",
    code: "05",
    title: "Cover",
    view: "coverage",
    body: "Planned vs logged hard sets, insights (volume, stagnation, push/pull, deload), history, and the PR board. Aim ~70%+ on main muscles — not 150% on everything.",
  },
  {
    id: "programs",
    code: "06",
    title: "Programs",
    view: "settings",
    body: "Educational templates only — not a book reprint. 5/3/1 BBB needs training maxes (suggest from logs). PPL, Upper/Lower, and classic bro split use your equipment library.",
  },
  {
    id: "equipment",
    code: "07",
    title: "Equipment",
    view: "settings",
    body: "Commercial gym, home barbell, dumbbells, or minimal. Uncheck what you don’t have; the planner won’t assign it. Exclude individual lifts anytime.",
  },
  {
    id: "journal",
    code: "08",
    title: "Journal",
    view: "today",
    body: "Per-lift pain / energy / joint. After the session: sleep, mood, fuel, stack. Cover turns repeats into pattern notes — educational, not medical advice.",
  },
  {
    id: "supps",
    code: "09",
    title: "Supps",
    view: "supps",
    body: "Evidence grades: core, optional, if needed, usually skip. Add a personal stack and check it off on Today. Food and sleep still come first.",
  },
  {
    id: "macroledger",
    code: "10",
    title: "MacroLedger",
    view: "today",
    body: "When you mark a session complete, hand off sets, dose, and muscles to the diet sibling. Same phone, separate app — log the burn after you train.",
  },
  {
    id: "install",
    code: "11",
    title: "Install & data",
    view: "settings",
    body: "iPhone: Safari → Share → Add to Home Screen. Android: Chrome → Install app. Never delete the icon to “update.” Data stays on this device — export a backup from Setup.",
  },
  {
    id: "setup",
    code: "12",
    title: "Setup",
    view: "settings",
    body: "Theme, dose default, coaching path, session minutes, time-box, deload, bodyweight. Save & rebuild after you change how you train.",
  },
];

export function listBriefSections() {
  return BRIEF_SECTIONS.map(({ id, code, title, view }) => ({ id, code, title, view }));
}

export function getBriefSection(id) {
  return BRIEF_SECTIONS.find((s) => s.id === id) || null;
}

export function briefJumpView(id) {
  return getBriefSection(id)?.view || null;
}
