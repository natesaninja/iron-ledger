/**
 * Iron Ledger PWA — commercial gym MED planner
 */
import {
  DEFAULT_SETTINGS,
  SEED_AUGUST_2026,
  EXERCISES,
  SUPPLEMENTS,
  EVIDENCE_GRADES,
  MUSCLES,
  MED_PRINCIPLES,
  DOSE_PROFILES,
} from "./data.js";
import {
  buildPlan,
  substitutesFor,
  muscleName,
  toISO,
  parseISO,
  weekdayShort,
  monthLabel,
} from "./planner.js";
import { loadState, saveState, exportJson, importJson } from "./store.js";
import {
  countCompletedSessions,
  resolveCoachStage,
  stageCapabilities,
  buildCoachScript,
} from "./coach.js";
import {
  inviteRequired,
  isInviteUnlocked,
  tryUnlockInvite,
  tryUnlockFromUrl,
  clearInviteUnlock,
  showInviteGate,
  hideInviteGate,
  buildInviteUrl,
  INVITE_SHARE_SLOTS,
  APP_PUBLIC_URL,
} from "./invite.js";

const APP_VERSION = "14";
const LIVE_URL = APP_PUBLIC_URL || "https://natesaninja.github.io/iron-ledger/";
const APP_NAME = "Iron Ledger";
/** Sibling diet app — deep-link exercise log after a session */
const MACROLEDGER_URL = "https://natesaninja.github.io/macroledger/";

/** @type {ReturnType<typeof loadState>} */
let state = loadState();
/** Supps tab: search + tier filter */
let suppQuery = "";
let suppFilter = "all";
/** @type {ReturnType<typeof buildPlan> | null} */
let plan = null;
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth(); // 0-index
let activeSessionIso = null;
let swapCtx = null; // { sessionIso, exIndex }
let onboardStep = 0;

// ---------- bootstrap ----------
function ensureSeeded() {
  if (!state.settings) {
    state.settings = { ...DEFAULT_SETTINGS };
  } else {
    state.settings = { ...DEFAULT_SETTINGS, ...state.settings };
  }
  if (!state.trainingDays) state.trainingDays = [];
  if (!state.restForced) state.restForced = [];
  if (!state.lightOnly) state.lightOnly = [];
  if (!state.workOff) state.workOff = [];
  if (!state.completedSessions) state.completedSessions = {};
  if (!state.dayDose) state.dayDose = {};
  if (!Array.isArray(state.myStack)) state.myStack = [];
  if (state.onboardingComplete == null) state.onboardingComplete = false;
  if (!state.settings.defaultDose) state.settings.defaultDose = "med";

  // Existing users who already have a plan: skip forced onboarding
  if (state.trainingDays.length > 0) {
    state.onboardingComplete = true;
  }
  persist();
}

function applyAugustSeed(toastMsg = true) {
  state.trainingDays = [...SEED_AUGUST_2026.trainingDays];
  state.restForced = [...SEED_AUGUST_2026.restForced];
  state.lightOnly = [...SEED_AUGUST_2026.lightOnly];
  state.workOff = [...SEED_AUGUST_2026.workOff];
  state.settings = { ...DEFAULT_SETTINGS, ...state.settings };
  calYear = 2026;
  calMonth = 7; // August
  rebuild();
  if (toastMsg) toast("Loaded sample shift schedule");
}

function persist() {
  state = saveState(state);
}

function getCoach() {
  const n = countCompletedSessions(state.completedSessions);
  const mode = state.settings.coachMode || "auto";
  const stage = resolveCoachStage(n, { mode });
  const caps = stageCapabilities(stage.id);
  return { n, stage, caps };
}

function effectiveSettings() {
  const { caps } = getCoach();
  const s = { ...state.settings };
  // Guided/Building: force full-body MED so the app does the thinking
  if (caps.lockFullBody) {
    s.splitPreference = "full_body";
  }
  return s;
}

function rebuild() {
  const days = [...state.trainingDays].sort();
  let horizon = {};
  if (days.length) {
    const d0 = parseISO(days[0]);
    const start = toISO(new Date(d0.getFullYear(), d0.getMonth(), 1));
    const end = toISO(new Date(d0.getFullYear(), d0.getMonth() + 1, 1));
    horizon = { start, end };
  }
  plan = buildPlan(days, effectiveSettings(), {
    ...horizon,
    dayDose: state.dayDose || {},
    doseProfiles: DOSE_PROFILES,
  });

  // Merge completed flags (match by exercise id when dose rebuilds the list)
  for (const s of plan.sessions) {
    const done = state.completedSessions[s.day];
    if (done) {
      s.completed = !!done.completed;
      if (done.byExerciseId) {
        s.exercises.forEach((ex) => {
          ex.done = !!done.byExerciseId[ex.exerciseId];
        });
      } else if (done.exerciseDone) {
        s.exercises.forEach((ex, i) => {
          ex.done = !!done.exerciseDone[i];
        });
      }
    }
  }
  renderAll();
}

function doseForDay(iso) {
  const id = (state.dayDose && state.dayDose[iso]) || state.settings.defaultDose || "med";
  return DOSE_PROFILES[id] || DOSE_PROFILES.med;
}

function setDayDose(iso, doseId, { rebuildSession = true } = {}) {
  if (!DOSE_PROFILES[doseId]) return;
  state.dayDose = state.dayDose || {};
  state.dayDose[iso] = doseId;
  // Switching dose mid-session un-completes the day so you can re-work the new list
  if (state.completedSessions[iso]?.completed) {
    state.completedSessions[iso] = {
      ...state.completedSessions[iso],
      completed: false,
    };
  }
  persist();
  if (rebuildSession) {
    rebuild();
    toast(
      doseId === "oed"
        ? "OED — optimum day volume"
        : doseId === "rough"
          ? "Rough day — lighter session"
          : "MED — minimum effective dose"
    );
  }
}

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 2200);
}

function todayISO() {
  return toISO(new Date());
}

function sessionByDay(iso) {
  return plan?.sessions.find((s) => s.day === iso) || null;
}

function nextTrainDay(fromIso) {
  const days = [...state.trainingDays].sort();
  return days.find((d) => d >= fromIso) || days[0] || null;
}

// ---------- theme ----------
function resolveTheme(pref) {
  if (pref === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "midnight" : "light";
  }
  return pref === "midnight" || pref === "dark" ? "midnight" : "light";
}

function getThemePref() {
  // Iron Ledger is dark-first (logo aesthetic); system still available in settings
  return localStorage.getItem("sl_theme_pref") || localStorage.getItem("sl_theme") || "midnight";
}

function applyTheme(pref) {
  const mode = resolveTheme(pref);
  document.documentElement.setAttribute("data-theme", mode);
  localStorage.setItem("sl_theme_pref", pref);
  localStorage.setItem("sl_theme", mode); // resolved, for older reads
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", mode === "midnight" ? "#070708" : "#e4e6ea");
  const btn = document.getElementById("theme-toggle");
  if (btn) {
    const isDark = mode === "midnight";
    btn.textContent = isDark ? "☀" : "☾";
    btn.title = isDark ? "Light plate" : "Iron dark";
    btn.setAttribute("aria-label", btn.title);
  }
  const sel = document.getElementById("set-theme");
  if (sel && sel.value !== pref) sel.value = pref === "dark" ? "midnight" : pref;
}

function initTheme() {
  let pref = getThemePref();
  // migrate bare "light"/"midnight" from v1 toggle into pref
  if (pref === "light" || pref === "midnight" || pref === "dark") {
    // keep as explicit choice
  } else if (!localStorage.getItem("sl_theme_pref") && localStorage.getItem("sl_theme")) {
    pref = localStorage.getItem("sl_theme");
  }
  applyTheme(pref);

  document.getElementById("theme-toggle").addEventListener("click", () => {
    // Quick toggle: always flip resolved mode to the opposite (sets explicit pref)
    const cur = document.documentElement.getAttribute("data-theme");
    applyTheme(cur === "midnight" ? "light" : "midnight");
    toast(cur === "midnight" ? "Light plate" : "Iron dark");
  });

  // Follow OS if user chose System
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (getThemePref() === "system") applyTheme("system");
  });
}

// ---------- nav ----------
function initNav() {
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.view;
      document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("active", b === btn));
      document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${view}`));
      if (view === "plan") renderCalendar();
      if (view === "coverage") renderCoverage();
      if (view === "supps") renderSupps();
      if (view === "settings") renderSettingsForm();
    });
  });
}

// ---------- render today ----------
function renderCoachPanel(session) {
  const { n, stage } = getCoach();
  const chip = document.getElementById("stage-chip");
  if (chip) {
    chip.textContent = `${stage.label} · ${n} done`;
    chip.className = "chip " + (stage.id === "custom" ? "ok" : stage.id === "building" ? "train" : "warn");
  }
  const ver = document.getElementById("app-version");
  if (ver) ver.textContent = `v${APP_VERSION}`;

  const upcoming = (plan?.sessions || []).filter((s) => s.day > (session?.day || todayISO()));
  const script = buildCoachScript({
    stage,
    session,
    completedCount: n,
    nextSession: upcoming[0] || null,
  });
  const dose = session ? doseForDay(session.day) : DOSE_PROFILES[state.settings.defaultDose || "med"];
  const doseLine = session
    ? `Today’s dose: ${dose.label} (${dose.feel}). Switch Low / MED / OED above if energy changes mid-day.`
    : `Default dose: ${dose.label}. Set per day when you have a session.`;
  const set = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text || "";
  };
  set("coach-headline", script.headline);
  set("coach-mission", `${script.mission} ${doseLine}`);
  set(
    "coach-science",
    script.science
      ? `Evidence angle: ${script.science} Dose: ${dose.science}`
      : `Dose: ${dose.science}`
  );
  set("coach-progress", script.progressNote);
  set("coach-unlock", script.unlockHint);
  const ol = document.getElementById("coach-steps");
  if (ol) {
    ol.innerHTML = (script.steps || []).map((s) => `<li>${escapeHtml(s)}</li>`).join("");
  }
}

function renderDosePicker(iso) {
  if (!iso) return "";
  const cur = doseForDay(iso).id;
  const btns = ["rough", "med", "oed"]
    .map((id) => {
      const p = DOSE_PROFILES[id];
      const active = cur === id ? "active" : "";
      return `<button type="button" class="dose-btn ${active}" data-dose="${id}" data-day="${iso}" title="${escapeHtml(p.feel)}">${escapeHtml(p.short)}</button>`;
    })
    .join("");
  const p = doseForDay(iso);
  return `
    <div class="dose-panel" id="dose-panel">
      <div class="dose-label">How I feel → dose</div>
      <div class="dose-btns" role="group" aria-label="Training dose">${btns}</div>
      <p class="dose-hint"><strong>${escapeHtml(p.label)}</strong> — ${escapeHtml(p.feel)}. Change anytime; session rebuilds on the fly.</p>
      <p class="dim dose-science">${escapeHtml(p.science)}</p>
    </div>`;
}

function wireDosePicker() {
  document.querySelectorAll("[data-dose]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const day = btn.dataset.day;
      const dose = btn.dataset.dose;
      if (!day || !dose) return;
      activeSessionIso = day;
      setDayDose(day, dose);
    });
  });
}

function renderToday() {
  const today = todayISO();
  const trainToday = state.trainingDays.includes(today);
  const restToday = state.restForced.includes(today);
  const lightToday = state.lightOnly.includes(today);
  let focusIso = trainToday ? today : nextTrainDay(today);
  if (activeSessionIso && sessionByDay(activeSessionIso)) focusIso = activeSessionIso;

  const hero = document.getElementById("today-hero");
  const session = focusIso ? sessionByDay(focusIso) : null;
  renderCoachPanel(session);

  if (restToday) {
    hero.innerHTML = `
      <div class="hero-kicker">Today · ${weekdayShort(today)} ${today}</div>
      <div class="hero-title">Sleep / transition</div>
      <div class="hero-meta"><span class="chip rest">Post-nights · no hard lift</span></div>
      <p class="hint" style="margin:0">Protect recovery. Next train day when ready.</p>
    `;
  } else if (lightToday && !trainToday) {
    hero.innerHTML = `
      <div class="hero-kicker">Today · ${weekdayShort(today)} ${today}</div>
      <div class="hero-title">Easy day</div>
      <div class="hero-meta"><span class="chip warn">Walk / mobility only</span></div>
      <p class="hint" style="margin:0">Optional. No commercial gym pressure.</p>
    `;
  } else if (trainToday && session) {
    const dose = doseForDay(session.day);
    hero.innerHTML = `
      <div class="hero-kicker">Today · ${weekdayShort(today)} ${today}</div>
      <div class="hero-title">${session.label}</div>
      <div class="hero-meta">
        <span class="chip train">Train day</span>
        <span class="chip ember">${escapeHtml(dose.short)}</span>
        <span class="chip">~${session.estimatedMinutes} min</span>
        <span class="chip">${session.exercises.length} lifts</span>
        ${session.completed ? '<span class="chip ok">Done</span>' : ""}
      </div>
      ${renderDosePicker(session.day)}
      <p class="hint" style="margin:0.65rem 0 0">Commercial gym · skip anything that feels unsafe</p>
    `;
    activeSessionIso = today;
  } else if (session) {
    const dose = doseForDay(session.day);
    hero.innerHTML = `
      <div class="hero-kicker">Next session · ${weekdayShort(session.day)} ${session.day}</div>
      <div class="hero-title">${session.label}</div>
      <div class="hero-meta">
        <span class="chip train">Planned</span>
        <span class="chip ember">${escapeHtml(dose.short)}</span>
        <span class="chip">~${session.estimatedMinutes} min</span>
      </div>
      ${renderDosePicker(session.day)}
      <p class="hint" style="margin:0.65rem 0 0">Preview below. Change dose anytime if energy shifts.</p>
    `;
    activeSessionIso = session.day;
  } else {
    hero.innerHTML = `
      <div class="hero-kicker">Iron Ledger</div>
      <div class="hero-title">No train days set</div>
      <p class="hint" style="margin:0">Open <strong>Plan</strong> and tap the days you can train — or load a sample schedule.</p>
    `;
  }

  wireDosePicker();
  renderSessionCard(session);
  renderUpcoming(today);
}

function renderSessionCard(session) {
  const title = document.getElementById("today-session-title");
  const rationale = document.getElementById("today-rationale");
  const list = document.getElementById("today-exercises");
  const actions = document.getElementById("today-actions");

  if (!session) {
    title.textContent = "Session";
    rationale.textContent = "Mark train days on the Plan tab.";
    list.innerHTML = "";
    actions.innerHTML = `<button type="button" class="primary-btn" id="go-plan">Open Plan</button>`;
    document.getElementById("go-plan")?.addEventListener("click", () => {
      document.querySelector('.nav-btn[data-view="plan"]').click();
    });
    return;
  }

  title.textContent = `${weekdayShort(session.day)} · ${session.label}`;
  rationale.textContent = session.rationale;
  const { caps } = getCoach();
  const whyOpen = caps.showWhyDefaultOpen;

  list.innerHTML = session.exercises
    .map(
      (ex, i) => `
    <li class="ex-item ${ex.done ? "done" : ""}" data-i="${i}">
      <button type="button" class="ex-check" data-toggle="${i}" aria-label="Mark done">${ex.done ? "✓" : ""}</button>
      <div>
        <div class="ex-name">${escapeHtml(ex.name)}</div>
        <div class="ex-detail">${ex.sets} × ${escapeHtml(ex.reps)} · ${ex.role} · ${escapeHtml(ex.primary.map(muscleName).join(", "))}</div>
        <button type="button" class="why-toggle" data-why="${i}" aria-expanded="${whyOpen ? "true" : "false"}">${whyOpen ? "Hide reason" : "Why this lift?"}</button>
        <div class="ex-why" id="why-${i}" ${whyOpen ? "" : "hidden"}>${escapeHtml(ex.why || "Selected to cover today’s muscle needs.")}</div>
      </div>
      <div class="ex-actions">
        ${caps.allowSwap ? `<button type="button" data-swap="${i}">Swap</button>` : ""}
      </div>
    </li>`
    )
    .join("");

  list.querySelectorAll("[data-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = +btn.dataset.toggle;
      session.exercises[i].done = !session.exercises[i].done;
      saveSessionProgress(session);
      renderSessionCard(session);
      renderToday();
    });
  });
  list.querySelectorAll("[data-swap]").forEach((btn) => {
    btn.addEventListener("click", () => openSwap(session.day, +btn.dataset.swap));
  });
  list.querySelectorAll("[data-why]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = btn.dataset.why;
      const panel = document.getElementById(`why-${i}`);
      const open = panel.hidden;
      panel.hidden = !open;
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.textContent = open ? "Hide reason" : "Why this lift?";
    });
  });

  actions.innerHTML = `
    <button type="button" class="primary-btn" id="mark-complete">${session.completed ? "Mark incomplete" : "Mark session complete"}</button>
    <button type="button" class="ghost-btn" id="log-macro" title="Open MacroLedger with this session prefilled">Log burn in MacroLedger</button>
    <button type="button" class="ghost-btn" id="skip-day">Remove this train day</button>
  `;
  document.getElementById("mark-complete").onclick = () => {
    const finishing = !session.completed;
    session.completed = !session.completed;
    if (session.completed) session.exercises.forEach((e) => (e.done = true));
    saveSessionProgress(session);
    toast(session.completed ? "Session complete" : "Marked incomplete");
    renderToday();
    renderCalendar();
    if (finishing && session.completed) {
      // Offer MacroLedger handoff after a real finish
      setTimeout(() => {
        if (confirm("Log this session’s burn in MacroLedger?\n\nOpens MacroLedger and adds the workout for that day (protein tracking stays there).")) {
          openMacroLedgerHandoff(session, { auto: true });
        }
      }, 280);
    }
  };
  document.getElementById("log-macro").onclick = () => {
    openMacroLedgerHandoff(session, { auto: true });
  };
  document.getElementById("skip-day").onclick = () => {
    if (!confirm(`Remove ${session.day} from train days and rebuild?`)) return;
    state.trainingDays = state.trainingDays.filter((d) => d !== session.day);
    delete state.completedSessions[session.day];
    persist();
    rebuild();
    toast("Day removed · plan rebuilt");
  };
}

/**
 * Deep-link into MacroLedger with session minutes + name.
 * MacroLedger reads ?iron=1&date=&min=&name=&auto=1 and logs exercise.
 */
function openMacroLedgerHandoff(session, { auto = true } = {}) {
  if (!session) return;
  const minutes = Math.max(1, Math.round(session.estimatedMinutes || 45));
  const name = `Iron Ledger · ${session.label || "Strength"}`;
  const url = new URL(MACROLEDGER_URL);
  url.searchParams.set("iron", "1");
  url.searchParams.set("date", session.day);
  url.searchParams.set("min", String(minutes));
  url.searchParams.set("name", name);
  if (auto) url.searchParams.set("auto", "1");
  // Remember last handoff so we don’t spam if user returns
  try {
    sessionStorage.setItem("il_last_macro_handoff", `${session.day}:${minutes}`);
  } catch {
    /* ok */
  }
  window.open(url.toString(), "_blank", "noopener,noreferrer");
  toast("Opening MacroLedger…");
}

function saveSessionProgress(session) {
  const byExerciseId = {};
  session.exercises.forEach((e) => {
    byExerciseId[e.exerciseId] = !!e.done;
  });
  state.completedSessions[session.day] = {
    completed: !!session.completed,
    exerciseDone: session.exercises.map((e) => !!e.done),
    byExerciseId,
    doseId: session.doseId || doseForDay(session.day).id,
    savedAt: new Date().toISOString(),
  };
  persist();
}

function renderUpcoming(today) {
  const el = document.getElementById("upcoming-list");
  const upcoming = (plan?.sessions || []).filter((s) => s.day >= today).slice(0, 6);
  if (!upcoming.length) {
    el.innerHTML = `<p class="empty-state"><strong>No upcoming sessions</strong>Add train days on Plan.</p>`;
    return;
  }
  el.innerHTML = upcoming
    .map(
      (s) => `
    <button type="button" class="session-row" data-open="${s.day}">
      <div>
        <strong>${weekdayShort(s.day)} ${s.day.slice(5)} · ${escapeHtml(s.label)}</strong>
        <span>~${s.estimatedMinutes} min · ${s.exercises.length} exercises ${s.completed ? "· done" : ""}</span>
      </div>
      <span class="chip train">Open</span>
    </button>`
    )
    .join("");
  el.querySelectorAll("[data-open]").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeSessionIso = btn.dataset.open;
      renderToday();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

// ---------- calendar ----------
function renderCalendar() {
  document.getElementById("cal-label").textContent = monthLabel(calYear, calMonth);
  const dows = document.getElementById("cal-dows");
  if (!dows.dataset.ready) {
    dows.innerHTML = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]
      .map((d) => `<div class="cal-dow">${d}</div>`)
      .join("");
    dows.dataset.ready = "1";
  }

  const first = new Date(calYear, calMonth, 1);
  let startPad = first.getDay() - 1; // Mon=0
  if (startPad < 0) startPad = 6;
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const today = todayISO();
  const grid = document.getElementById("cal-grid");
  let html = "";
  for (let i = 0; i < startPad; i++) html += `<div class="cal-day empty"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = toISO(new Date(calYear, calMonth, d));
    const classes = ["cal-day"];
    if (iso === today) classes.push("today");
    if (state.trainingDays.includes(iso)) classes.push("train");
    if (state.restForced.includes(iso)) classes.push("rest-forced");
    if (state.lightOnly.includes(iso)) classes.push("light");
    if (state.workOff.includes(iso)) classes.push("off");
    if (state.completedSessions[iso]?.completed) classes.push("done");
    html += `<button type="button" class="${classes.join(" ")}" data-day="${iso}">${d}</button>`;
  }
  grid.innerHTML = html;
  grid.querySelectorAll("[data-day]").forEach((btn) => {
    btn.addEventListener("click", () => cycleDay(btn.dataset.day));
  });

  // session list
  const list = document.getElementById("plan-session-list");
  const monthSessions = (plan?.sessions || []).filter((s) => {
    const d = parseISO(s.day);
    return d.getFullYear() === calYear && d.getMonth() === calMonth;
  });
  if (!monthSessions.length) {
    list.innerHTML = `<p class="hint">No train days this month yet. Tap days above.</p>`;
  } else {
    list.innerHTML = monthSessions
      .map(
        (s) => `
      <button type="button" class="session-row" data-jump="${s.day}">
        <div>
          <strong>${weekdayShort(s.day)} ${s.day} · ${escapeHtml(s.label)}</strong>
          <span>${s.exercises.map((e) => e.name).slice(0, 3).join(" · ")}${s.exercises.length > 3 ? "…" : ""}</span>
        </div>
        <span class="chip">${s.estimatedMinutes}m</span>
      </button>`
      )
      .join("");
    list.querySelectorAll("[data-jump]").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeSessionIso = btn.dataset.jump;
        document.querySelector('.nav-btn[data-view="today"]').click();
        renderToday();
      });
    });
  }
}

function cycleDay(iso) {
  // cycle: none -> train -> restForced -> light -> none
  const t = state.trainingDays.includes(iso);
  const r = state.restForced.includes(iso);
  const l = state.lightOnly.includes(iso);

  state.trainingDays = state.trainingDays.filter((d) => d !== iso);
  state.restForced = state.restForced.filter((d) => d !== iso);
  state.lightOnly = state.lightOnly.filter((d) => d !== iso);
  // keep workOff if already, or add when user marks anything on that day for legend
  if (!t && !r && !l) {
    state.trainingDays.push(iso);
    if (!state.workOff.includes(iso)) state.workOff.push(iso);
  } else if (t) {
    state.restForced.push(iso);
  } else if (r) {
    state.lightOnly.push(iso);
  }
  // else clear all flags for that day (except we leave workOff)

  state.trainingDays.sort();
  persist();
  rebuild();
  toast(labelForDay(iso));
}

function labelForDay(iso) {
  if (state.trainingDays.includes(iso)) return `${iso} → Train`;
  if (state.restForced.includes(iso)) return `${iso} → Sleep / post-nights`;
  if (state.lightOnly.includes(iso)) return `${iso} → Easy only`;
  return `${iso} → Cleared`;
}

// ---------- coverage ----------
function renderCoverage() {
  const meta = document.getElementById("coverage-meta");
  const bars = document.getElementById("coverage-bars");
  const principles = document.getElementById("med-principles");
  if (principles) {
    principles.innerHTML = MED_PRINCIPLES.map(
      (p) => `
      <div class="principle">
        <strong>${escapeHtml(p.title)}</strong>
        <p>${escapeHtml(p.body)}</p>
      </div>`
    ).join("");
  }

  if (!plan) {
    meta.textContent = "No plan yet — mark train days on Plan.";
    bars.innerHTML = "";
    return;
  }
  const under = plan.meta.underCoveredPrimaries || [];
  meta.textContent = under.length
    ? `⚠ Under MED on: ${under.join(", ")} · ${plan.meta.trainingDays} train days · raise days or keep sessions full-body`
    : `✓ Primaries at MED track · ${plan.meta.trainingDays} train days · multiplier ×${plan.meta.medMultiplier}`;

  const rows = MUSCLES.map((m) => {
    const got = plan.coverage[m.id] || 0;
    const tgt = plan.targets[m.id] || 1;
    const pct = Math.min(100, Math.round((got / tgt) * 100));
    const low = pct < 70;
    return { m, got, tgt, pct, low };
  }).sort((a, b) => b.tgt - a.tgt);

  bars.innerHTML = rows
    .map(
      (r) => `
    <div class="cov-row">
      <span>${escapeHtml(r.m.name)}</span>
      <div class="cov-bar ${r.low ? "low" : ""}"><i style="width:${r.pct}%"></i></div>
      <span class="dim">${r.pct}%</span>
    </div>`
    )
    .join("");
}

// ---------- supps (training evidence browser) ----------
const TIER_LABEL = {
  core: "MED core",
  optional: "Optional",
  conditional: "Only if needed",
  skip: "Usually skip",
};
const TIER_CLASS = {
  core: "tier-core",
  optional: "tier-optional",
  conditional: "tier-conditional",
  skip: "tier-skip",
};
const SEV_CLASS = { low: "sev-low", moderate: "sev-moderate", high: "sev-high" };

function myStackSet() {
  return new Set(state.myStack || []);
}

function toggleMyStack(id) {
  const set = myStackSet();
  if (set.has(id)) set.delete(id);
  else set.add(id);
  state.myStack = [...set];
  persist();
  renderSupps();
}

function suppMatchesQuery(s, q) {
  if (!q) return true;
  const hay = [
    s.name,
    s.id,
    ...(s.aliases || []),
    ...(s.tags || []),
    s.why,
    s.science,
    ...(s.claims || []).map((c) => `${c.outcome} ${c.note || ""}`),
  ]
    .join(" ")
    .toLowerCase();
  return q.split(/\s+/).filter(Boolean).every((term) => hay.includes(term));
}

function filteredSupplements() {
  const q = suppQuery.trim().toLowerCase();
  const stack = myStackSet();
  return SUPPLEMENTS.filter((s) => {
    if (suppFilter === "stack" && !stack.has(s.id)) return false;
    if (suppFilter !== "all" && suppFilter !== "stack" && (s.tier || "optional") !== suppFilter) {
      return false;
    }
    return suppMatchesQuery(s, q);
  });
}

function renderClaimRow(c) {
  const g = EVIDENCE_GRADES[c.grade] || { label: c.grade, short: c.grade };
  return `
    <li class="claim-row">
      <span class="claim-outcome">${escapeHtml(c.outcome)}</span>
      <span class="chip grade-${escapeHtml(c.grade)}">${escapeHtml(g.label)}</span>
      ${c.note ? `<span class="claim-note">${escapeHtml(c.note)}</span>` : ""}
    </li>`;
}

function renderSupps() {
  const list = document.getElementById("supp-list");
  const countEl = document.getElementById("supp-count");
  if (!list) return;

  const searchEl = document.getElementById("supp-search");
  if (searchEl && searchEl.value !== suppQuery) searchEl.value = suppQuery;

  document.querySelectorAll(".supp-filter-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.filter === suppFilter);
  });

  const stack = myStackSet();
  const items = filteredSupplements();
  if (countEl) {
    const stackN = stack.size;
    countEl.textContent =
      items.length === SUPPLEMENTS.length && !suppQuery && suppFilter === "all"
        ? `${SUPPLEMENTS.length} compounds · ${stackN} on your stack`
        : `${items.length} match${items.length === 1 ? "" : "es"} · ${stackN} on your stack`;
  }

  if (!items.length) {
    list.innerHTML = `<p class="hint" style="margin:0.75rem 0 0">No matches. Try another search or filter — library is training-focused, not every wellness claim.</p>`;
    return;
  }

  list.innerHTML = items
    .map((s) => {
      const tid = s.tier || "optional";
      const onStack = stack.has(s.id);
      const claims = (s.claims || []).map(renderClaimRow).join("");
      const interactions = (s.interactions || [])
        .map(
          (ix) => `
        <li class="ix-row">
          <span class="chip ${SEV_CLASS[ix.severity] || "sev-low"}">${escapeHtml(ix.severity || "note")}</span>
          <span>${escapeHtml(ix.text)}</span>
        </li>`
        )
        .join("");
      return `
    <article class="sup-card" data-supp-id="${escapeHtml(s.id)}">
      <div class="sup-card-head">
        <h3>${escapeHtml(s.name)}</h3>
        <span class="chip ${TIER_CLASS[tid] || ""}">${TIER_LABEL[tid] || tid}</span>
        <button type="button" class="stack-btn ${onStack ? "on" : ""}" data-stack-toggle="${escapeHtml(s.id)}" aria-pressed="${onStack}">
          ${onStack ? "On stack ✓" : "Add to stack"}
        </button>
      </div>
      ${claims ? `<ul class="claim-list">${claims}</ul>` : ""}
      <p class="sup-meta"><strong>Studied / MED dose:</strong> ${escapeHtml(s.medDose)}</p>
      <p class="sup-meta"><strong>When:</strong> ${escapeHtml(s.when)} · ${escapeHtml(s.window)}</p>
      <p class="sup-why"><strong>Why:</strong> ${escapeHtml(s.why)}</p>
      <details class="sup-details">
        <summary>Science, cautions &amp; skip rules</summary>
        <div class="sup-science"><strong>Science (short):</strong> ${escapeHtml(s.science)}</div>
        ${
          interactions
            ? `<div class="sup-ix"><strong>Interactions / cautions:</strong><ul class="ix-list">${interactions}</ul></div>`
            : ""
        }
        <p class="sup-meta"><strong>Skip if:</strong> ${escapeHtml(s.skipIf)}</p>
        <p class="dim">${escapeHtml(s.wastedEffortNote)}</p>
      </details>
    </article>`;
    })
    .join("");
}

function initSuppsUi() {
  const search = document.getElementById("supp-search");
  if (search) {
    search.addEventListener("input", () => {
      suppQuery = search.value || "";
      renderSupps();
    });
  }
  document.getElementById("supp-filters")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-filter]");
    if (!btn) return;
    suppFilter = btn.dataset.filter || "all";
    renderSupps();
  });
  document.getElementById("supp-list")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-stack-toggle]");
    if (!btn) return;
    toggleMyStack(btn.dataset.stackToggle);
  });
}

// ---------- settings ----------
function renderSettingsForm() {
  const s = state.settings;
  const { n, stage, caps } = getCoach();
  const nameEl = document.getElementById("set-name");
  if (nameEl) nameEl.value = s.displayName || "";
  document.getElementById("set-minutes").value = s.sessionMinutes;
  document.getElementById("set-split").value = s.splitPreference;
  document.getElementById("set-med").value = s.medMultiplier;
  document.getElementById("set-rec").value = s.recoveryMultiplier;
  const coachSel = document.getElementById("set-coach");
  if (coachSel) coachSel.value = s.coachMode || "auto";
  const doseSel = document.getElementById("set-default-dose");
  if (doseSel) doseSel.value = s.defaultDose || "med";
  const sessionsLabel = document.getElementById("sessions-done-label");
  if (sessionsLabel) {
    sessionsLabel.textContent = `${n} session${n === 1 ? "" : "s"} completed · current stage: ${stage.label}`;
  }
  const stageDetail = document.getElementById("coach-stage-detail");
  if (stageDetail) {
    stageDetail.innerHTML = `${escapeHtml(stage.blurb)} Auto path: <strong>Guided</strong> (0–5) → <strong>Building</strong> (6–14) → <strong>Custom</strong> (15+).`;
  }

  const adv = document.getElementById("advanced-settings");
  const advHint = document.getElementById("advanced-locked-hint");
  const excludeCard = document.getElementById("exclude-card");
  if (adv) adv.classList.toggle("is-locked", !caps.showAdvancedSettings);
  if (advHint) advHint.hidden = caps.showAdvancedSettings;
  if (excludeCard) excludeCard.classList.toggle("is-locked", !caps.allowExclude);

  const themeSel = document.getElementById("set-theme");
  if (themeSel) {
    let pref = getThemePref();
    if (pref === "dark") pref = "midnight";
    themeSel.value = ["light", "midnight", "system"].includes(pref) ? pref : "system";
  }
  const live = document.getElementById("live-url-label");
  if (live) live.textContent = `Live: ${LIVE_URL}`;

  const box = document.getElementById("exclude-list");
  const excluded = new Set(s.excludedExercises || []);
  box.innerHTML = EXERCISES.map(
    (ex) => `
    <label>
      <input type="checkbox" value="${ex.id}" ${excluded.has(ex.id) ? "checked" : ""} ${caps.allowExclude ? "" : "disabled"} />
      ${escapeHtml(ex.name)}
    </label>`
  ).join("");
}

function saveSettingsFromForm() {
  const { caps } = getCoach();
  const nameEl = document.getElementById("set-name");
  if (nameEl) state.settings.displayName = nameEl.value.trim();
  state.settings.sessionMinutes = +document.getElementById("set-minutes").value || 55;
  const coachSel = document.getElementById("set-coach");
  if (coachSel) state.settings.coachMode = coachSel.value;
  const doseSel = document.getElementById("set-default-dose");
  if (doseSel) state.settings.defaultDose = doseSel.value || "med";

  // Recompute caps after mode change
  const mode = state.settings.coachMode || "auto";
  const n = countCompletedSessions(state.completedSessions);
  const stage = resolveCoachStage(n, { mode });
  const newCaps = stageCapabilities(stage.id);

  if (newCaps.allowSplitChange) {
    state.settings.splitPreference = document.getElementById("set-split").value;
  }
  if (newCaps.allowMedMultiplier) {
    state.settings.medMultiplier = +document.getElementById("set-med").value || 1;
    state.settings.recoveryMultiplier = +document.getElementById("set-rec").value || 1;
  }
  if (newCaps.allowExclude) {
    const checks = [...document.querySelectorAll("#exclude-list input:checked")];
    state.settings.excludedExercises = checks.map((c) => c.value);
  }
  persist();
  rebuild();
  updateGreeting();
  toast("Settings saved · plan rebuilt");
}

// ---------- swap modal ----------
function openSwap(sessionIso, exIndex) {
  const session = sessionByDay(sessionIso);
  if (!session) return;
  const ex = session.exercises[exIndex];
  swapCtx = { sessionIso, exIndex };
  const subs = substitutesFor(ex.exerciseId, state.settings);
  const box = document.getElementById("swap-options");
  document.getElementById("swap-title").textContent = `Swap ${ex.name}`;
  if (!subs.length) {
    box.innerHTML = `<p class="hint">No similar swaps. Exclude this exercise in Settings or pick another.</p>`;
  } else {
    box.innerHTML = subs
      .map(
        (s) => `
      <button type="button" class="swap-option" data-id="${s.id}">
        <strong>${escapeHtml(s.name)}</strong><br/>
        <span class="dim">${s.sets} × ${escapeHtml(s.reps)} · ${escapeHtml(s.primary.map(muscleName).join(", "))}</span>
      </button>`
      )
      .join("");
    box.querySelectorAll("[data-id]").forEach((btn) => {
      btn.addEventListener("click", () => applySwap(btn.dataset.id));
    });
  }
  document.getElementById("swap-modal").hidden = false;
}

function applySwap(newId) {
  if (!swapCtx) return;
  const session = sessionByDay(swapCtx.sessionIso);
  const exNew = EXERCISES.find((e) => e.id === newId);
  if (!session || !exNew) return;
  const old = session.exercises[swapCtx.exIndex];
  session.exercises[swapCtx.exIndex] = {
    exerciseId: exNew.id,
    name: exNew.name,
    sets: exNew.sets,
    reps: exNew.reps,
    primary: [...exNew.primary],
    secondary: [...exNew.secondary],
    minutes: Math.round(exNew.sets * exNew.minPerSet * 10) / 10,
    pattern: exNew.pattern,
    role: exNew.role,
    why: exNew.why
      ? `${exNew.why} Swapped in as a similar ${exNew.pattern.replace(/_/g, " ")} option for ${exNew.primary.map(muscleName).join(" & ")}.`
      : `Swapped in for ${exNew.primary.map(muscleName).join(" & ")}.`,
    done: false,
  };
  // keep session minutes rough
  session.estimatedMinutes =
    Math.round(session.exercises.reduce((s, e) => s + e.minutes, 0) * 10) / 10;
  saveSessionProgress(session);
  closeSwap();
  toast(`Swapped → ${exNew.name}`);
  renderToday();
}

function excludeCurrentSwap() {
  if (!swapCtx) return;
  const session = sessionByDay(swapCtx.sessionIso);
  const ex = session?.exercises[swapCtx.exIndex];
  if (!ex) return;
  if (!state.settings.excludedExercises.includes(ex.exerciseId)) {
    state.settings.excludedExercises.push(ex.exerciseId);
  }
  // also remove from this session via first substitute or drop
  const subs = substitutesFor(ex.exerciseId, state.settings);
  if (subs[0]) applySwap(subs[0].id);
  else {
    session.exercises.splice(swapCtx.exIndex, 1);
    saveSessionProgress(session);
    closeSwap();
  }
  persist();
  rebuild();
  toast(`${ex.name} excluded forever`);
}

function closeSwap() {
  document.getElementById("swap-modal").hidden = true;
  swapCtx = null;
}

// ---------- utils ----------
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderAll() {
  renderToday();
  renderCalendar();
  renderCoverage();
  renderSupps();
}

// ---------- events ----------
// ---------- onboarding (share-friendly, each device is private) ----------
const ONBOARD_STEPS = [
  {
    title: "We do the thinking first",
    html: `
      <p class="hint"><strong>Iron Ledger</strong> builds commercial-gym sessions from evidence-based minimum effective dose: compounds first, recovery windows, weekly muscle coverage — so limited train days still count.</p>
      <p class="hint" style="margin-top:0.65rem"><strong>Guided mode</strong> first: follow the coach and mark sessions done. Later you unlock swaps, then full Custom — keep what works, drop what doesn’t.</p>
      <p class="dim" style="margin-top:0.65rem">Updates install automatically when online. Never delete the Home Screen icon to update.</p>
    `,
  },
  {
    title: "Your setup",
    html: `
      <div class="field">
        <label for="ob-name">Name (optional)</label>
        <input type="text" id="ob-name" placeholder="e.g. Alex" maxlength="40" />
      </div>
      <div class="field">
        <label for="ob-minutes">Session length (minutes)</label>
        <input type="number" id="ob-minutes" min="30" max="90" step="5" value="55" />
      </div>
      <p class="hint">Start Guided. Advanced knobs stay locked until you’ve banked sessions (or you choose Custom later).</p>
    `,
  },
  {
    title: "Start your calendar",
    html: `
      <p class="hint">Mark train days on <strong>Plan</strong>, then open <strong>Today</strong> and follow the coach. Or load a sample schedule to explore.</p>
      <div class="btn-row" style="margin-top:0.75rem">
        <button type="button" class="primary-btn" id="ob-empty">Start empty (recommended)</button>
        <button type="button" class="ghost-btn" id="ob-sample">Load sample schedule</button>
      </div>
      <p class="dim" style="margin-top:0.75rem">Path: Guided (0–5 sessions) → Building (6–14) → Custom (15+). Science notes live under each lift and on Supps.</p>
    `,
  },
];

function showOnboarding(force = false) {
  if (!force && state.onboardingComplete) {
    document.getElementById("onboard").hidden = true;
    return;
  }
  onboardStep = 0;
  document.getElementById("onboard").hidden = false;
  renderOnboardStep();
}

function renderOnboardStep() {
  const step = ONBOARD_STEPS[onboardStep];
  document.getElementById("onboard-title").textContent = step.title;
  document.getElementById("onboard-body").innerHTML = step.html;
  document.getElementById("onboard-back").hidden = onboardStep === 0;
  const next = document.getElementById("onboard-next");
  next.textContent = onboardStep >= ONBOARD_STEPS.length - 1 ? "Open app" : "Continue";

  if (onboardStep === 1) {
    document.getElementById("ob-name").value = state.settings.displayName || "";
    document.getElementById("ob-minutes").value = state.settings.sessionMinutes || 55;
  }
  if (onboardStep === 2) {
    document.getElementById("ob-empty")?.addEventListener("click", () => finishOnboarding(false));
    document.getElementById("ob-sample")?.addEventListener("click", () => finishOnboarding(true));
    next.hidden = true;
  } else {
    next.hidden = false;
  }
}

function finishOnboarding(useSample) {
  if (onboardStep >= 1) {
    const nameEl = document.getElementById("ob-name");
    const minEl = document.getElementById("ob-minutes");
    if (nameEl) state.settings.displayName = nameEl.value.trim();
    if (minEl) state.settings.sessionMinutes = +minEl.value || 55;
  }
  // capture step 1 fields if user jumped via sample from step 2 after visiting 1
  state.onboardingComplete = true;
  if (useSample) {
    applyAugustSeed(true);
  } else {
    // leave calendar empty — user marks days
    persist();
    rebuild();
  }
  document.getElementById("onboard").hidden = true;
  updateGreeting();
  if (!useSample) {
    document.querySelector('.nav-btn[data-view="plan"]')?.click();
    toast("Tap days you can train");
  }
}

function updateGreeting() {
  const name = state.settings?.displayName?.trim();
  document.getElementById("greeting").textContent = name
    ? `${name} · strength training`
    : "Strength training app";
}

function initEvents() {
  document.getElementById("cal-prev").onclick = () => {
    calMonth--;
    if (calMonth < 0) {
      calMonth = 11;
      calYear--;
    }
    renderCalendar();
  };
  document.getElementById("cal-next").onclick = () => {
    calMonth++;
    if (calMonth > 11) {
      calMonth = 0;
      calYear++;
    }
    renderCalendar();
  };
  document.getElementById("rebuild-plan").onclick = () => {
    rebuild();
    toast("Plan rebuilt");
  };
  document.getElementById("seed-august").onclick = () => {
    if (state.trainingDays.length && !confirm("Replace current calendar with sample shift schedule?")) return;
    applyAugustSeed(true);
  };
  document.getElementById("save-settings").onclick = saveSettingsFromForm;
  document.getElementById("set-theme")?.addEventListener("change", (e) => {
    applyTheme(e.target.value);
    toast(
      e.target.value === "midnight"
        ? "Iron dark"
        : e.target.value === "light"
          ? "Light plate"
          : "System theme"
    );
  });
  document.getElementById("export-btn").onclick = () => {
    const blob = new Blob([exportJson(state)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `iron-ledger-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Backup exported");
  };
  document.getElementById("import-btn").onclick = () => document.getElementById("import-file").click();
  document.getElementById("import-file").onchange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      state = importJson(text);
      ensureSeeded();
      rebuild();
      updateGreeting();
      toast("Backup imported");
    } catch {
      toast("Import failed");
    }
    e.target.value = "";
  };
  document.getElementById("swap-close").onclick = closeSwap;
  document.getElementById("swap-exclude").onclick = excludeCurrentSwap;
  document.getElementById("swap-modal").addEventListener("click", (e) => {
    if (e.target.id === "swap-modal") closeSwap();
  });

  document.getElementById("onboard-next").onclick = () => {
    if (onboardStep === 1) {
      const nameEl = document.getElementById("ob-name");
      const minEl = document.getElementById("ob-minutes");
      if (nameEl) state.settings.displayName = nameEl.value.trim();
      if (minEl) state.settings.sessionMinutes = +minEl.value || 55;
      persist();
    }
    if (onboardStep >= ONBOARD_STEPS.length - 1) {
      finishOnboarding(false);
      return;
    }
    onboardStep++;
    renderOnboardStep();
  };
  document.getElementById("onboard-back").onclick = () => {
    if (onboardStep > 0) {
      onboardStep--;
      renderOnboardStep();
    }
  };
  document.getElementById("replay-onboard")?.addEventListener("click", () => showOnboarding(true));
  renderInviteShareList();
  document.getElementById("copy-link-btn")?.addEventListener("click", async () => {
    const url = LIVE_URL;
    try {
      await navigator.clipboard.writeText(url);
      toast("Base link copied (still needs ?i=… for invites)");
    } catch {
      toast(url);
    }
  });
  document.getElementById("share-native-btn")?.addEventListener("click", async () => {
    // Default share = coworker 1 invite link (most common)
    const url = buildInviteUrl("crew1", LIVE_URL);
    const text = "Iron Ledger (private pilot) — open this link to unlock:\n" + url;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Iron Ledger invite",
          text,
          url,
        });
      } catch {
        /* cancelled */
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast("Coworker 1 invite link copied");
      } catch {
        toast(url);
      }
    }
  });
}

async function copyText(text, okMsg) {
  try {
    await navigator.clipboard.writeText(text);
    toast(okMsg || "Copied");
    return true;
  } catch {
    // Fallback prompt for older WebViews
    try {
      window.prompt("Copy this invite link:", text);
    } catch {
      toast(text);
    }
    return false;
  }
}

function renderInviteShareList() {
  const box = document.getElementById("invite-share-list");
  if (!box) return;
  box.innerHTML = (INVITE_SHARE_SLOTS || [])
    .map(
      (slot) => `
    <div class="invite-share-row" data-token="${escapeHtml(slot.token)}">
      <div>
        <strong>${escapeHtml(slot.label)}</strong>
        <span>${escapeHtml(slot.blurb || "")} · ?i=${escapeHtml(slot.token)}</span>
      </div>
      <button type="button" class="primary" data-copy-invite="${escapeHtml(slot.token)}">Copy link</button>
      <button type="button" data-share-invite="${escapeHtml(slot.token)}">Share</button>
    </div>`
    )
    .join("");

  box.querySelectorAll("[data-copy-invite]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const token = btn.getAttribute("data-copy-invite");
      const url = buildInviteUrl(token, LIVE_URL);
      copyText(url, `Invite link copied (${token})`);
    });
  });
  box.querySelectorAll("[data-share-invite]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const token = btn.getAttribute("data-share-invite");
      const url = buildInviteUrl(token, LIVE_URL);
      const text = `Iron Ledger — open this link to get in:\n${url}`;
      if (navigator.share) {
        try {
          await navigator.share({ title: "Iron Ledger invite", text, url });
        } catch {
          /* cancelled */
        }
      } else {
        copyText(url, "Invite link copied");
      }
    });
  });
}

// ---------- service worker (MacroLedger-style auto updates) ----------
let swReg = null;
const SW_RELOAD_KEY = "sl_sw_reload_at";

function wireServiceWorkerLifecycle() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    try {
      const last = parseInt(sessionStorage.getItem(SW_RELOAD_KEY) || "0", 10) || 0;
      if (Date.now() - last < 60_000) return;
      sessionStorage.setItem(SW_RELOAD_KEY, String(Date.now()));
    } catch {
      /* private mode */
    }
    setTimeout(() => {
      try {
        window.location.reload();
      } catch {
        /* ignore */
      }
    }, 350);
  });
}

function applyWaitingServiceWorker(reg, { quiet = true } = {}) {
  if (!reg?.waiting) return false;
  try {
    sessionStorage.setItem(SW_RELOAD_KEY, "0");
  } catch {
    /* private mode */
  }
  reg.waiting.postMessage("SKIP_WAITING");
  if (!quiet) toast("Updating…");
  return true;
}

async function checkForAppUpdate({ manual = false } = {}) {
  if (!("serviceWorker" in navigator)) {
    if (manual) toast("Updates aren’t available in this browser");
    return;
  }
  if (!navigator.onLine) {
    if (manual) toast("Go online to check for updates");
    return;
  }
  try {
    if (manual) toast("Checking for updates…");
    const reg = swReg || (await navigator.serviceWorker.getRegistration()) || null;
    if (!reg) {
      if (manual) window.location.reload();
      return;
    }
    await reg.update();
    if (reg.waiting) {
      applyWaitingServiceWorker(reg, { quiet: !manual });
      if (manual) toast("Update found — applying…");
      return;
    }
    if (reg.installing) {
      if (manual) toast("Downloading update…");
      return;
    }
    if (manual) {
      toast("You’re up to date");
      window.location.reload();
    }
  } catch (e) {
    console.warn("update check failed", e);
    if (manual) toast("Update check failed — try again online");
  }
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  wireServiceWorkerLifecycle();
  try {
    swReg = await navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" });
    if (swReg.waiting) applyWaitingServiceWorker(swReg);
    swReg.update().catch(() => {});
    swReg.addEventListener("updatefound", () => {
      const nw = swReg.installing;
      if (!nw) return;
      nw.addEventListener("statechange", () => {
        if (nw.state === "installed" && navigator.serviceWorker.controller) {
          applyWaitingServiceWorker(swReg, { quiet: true });
        }
      });
    });
    window.addEventListener("online", () => swReg?.update?.().catch(() => {}));
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") swReg?.update?.().catch(() => {});
    });
  } catch (e) {
    console.warn("SW failed", e);
  }
}

function wireInviteGate() {
  const input = document.getElementById("invite-code");
  const err = document.getElementById("invite-error");
  const btn = document.getElementById("invite-unlock");
  const submit = async () => {
    if (err) {
      err.hidden = true;
      err.textContent = "";
    }
    const result = await tryUnlockInvite(input?.value || "");
    if (!result.ok) {
      if (err) {
        err.textContent = result.error || "Invalid code";
        err.hidden = false;
      }
      toast(result.error || "Invalid code");
      return;
    }
    hideInviteGate();
    toast("Unlocked — welcome");
    startAppShell();
  };
  btn?.addEventListener("click", submit);
  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  });
  document.getElementById("revoke-invite")?.addEventListener("click", () => {
    if (!confirm("Lock this device? You’ll need an invite code again to open Iron Ledger.")) return;
    clearInviteUnlock();
    showInviteGate();
    toast("Device locked");
  });
}

function startAppShell() {
  ensureSeeded();
  if (state.trainingDays[0]) {
    const d = parseISO(state.trainingDays[0]);
    calYear = d.getFullYear();
    calMonth = d.getMonth();
  }
  rebuild();
  updateGreeting();
  if (state.settings && "workHoursNote" in state.settings) {
    delete state.settings.workHoursNote;
    persist();
  }
  showOnboarding(false);
}

// ---------- start ----------
async function boot() {
  initTheme();
  initNav();
  initEvents();
  initSuppsUi();
  wireInviteGate();
  document.getElementById("btn-check-update")?.addEventListener("click", () =>
    checkForAppUpdate({ manual: true })
  );

  // Invites off: always open the app. (If re-enabled later, URL ?i= token still works.)
  try {
    hideInviteGate();
  } catch {
    /* ok */
  }
  if (inviteRequired() && !isInviteUnlocked()) {
    try {
      const fromUrl = await tryUnlockFromUrl();
      if (!fromUrl.unlocked) {
        showInviteGate();
        if (fromUrl.error) {
          const err = document.getElementById("invite-error");
          if (err) {
            err.textContent = fromUrl.error;
            err.hidden = false;
          }
        }
        await registerServiceWorker();
        return;
      }
    } catch (e) {
      console.warn("invite url unlock failed", e);
      // Fail open when gate misbehaves
    }
  }

  hideInviteGate();
  startAppShell();
  await registerServiceWorker();
  console.info(`${APP_NAME} v${APP_VERSION}`);
}

boot();
