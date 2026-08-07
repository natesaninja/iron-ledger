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
import {
  loadState,
  saveState,
  exportJson,
  importJson,
  needsBackupReminder,
  markBackupDone,
  formatBackupAge,
} from "./store.js";
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
import {
  FORM_CUES,
  SKIP_REASONS,
  REST_PRESETS,
  restDefaultForRole,
  ensureExerciseLog,
  ensureDayLog,
  lastWorkingSets,
  suggestNext,
  formatLoad,
  warmupLadder,
  computePrBoard,
  buildHistory,
  loggedCoverage,
  countQualitySessions,
  roughDaysRecent,
  seedSetsFromSuggestion,
  plateBreakdown,
  buildSessionSummary,
  buildCoverInsights,
} from "./logging.js";

const APP_VERSION = "19";

/** Collapsed “more info” block — keeps the gym floor quiet for skimmers */
function foldHtml(summary, bodyHtml, { open = false, className = "" } = {}) {
  return `<details class="fold ${className}"${open ? " open" : ""}>
    <summary class="fold-sum">${summary}</summary>
    <div class="fold-body">${bodyHtml}</div>
  </details>`;
}
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
/** Rest timer: endsAt ms, total sec, interval id */
let restTimer = { endsAt: null, totalSec: 90, intervalId: null };
/** @type {WakeLockSentinel | null} */
let wakeLockSentinel = null;
/** Dedupe backup toast per session */
let backupNagShown = false;

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
  if (!state.logs || typeof state.logs !== "object" || Array.isArray(state.logs)) state.logs = {};
  if (!state.stackCheckins || typeof state.stackCheckins !== "object") state.stackCheckins = {};
  if (state.deloadUntil === undefined) state.deloadUntil = null;
  if (state.onboardingComplete == null) state.onboardingComplete = false;
  if (state.lastBackupAt === undefined) state.lastBackupAt = null;
  if (state.backupRemindDays == null) state.backupRemindDays = 7;
  if (!state.settings.defaultDose) state.settings.defaultDose = "med";
  if (state.settings.timeBoxMinutes == null) state.settings.timeBoxMinutes = 0;
  if (state.settings.coachQualityGates == null) state.settings.coachQualityGates = true;
  if (state.settings.showWarmups == null) state.settings.showWarmups = true;
  if (state.settings.restDefaultSec == null) state.settings.restDefaultSec = 90;
  if (state.settings.barWeight == null) state.settings.barWeight = 45;
  if (state.settings.unitLabel == null) state.settings.unitLabel = "lb";

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
  const q = countQualitySessions(state.completedSessions, state.logs);
  const mode = state.settings.coachMode || "auto";
  const useQualityGates = state.settings.coachQualityGates !== false;
  const stage = resolveCoachStage(n, { mode, qualityCount: q, useQualityGates });
  const caps = stageCapabilities(stage.id);
  return { n, q, stage, caps };
}

function effectiveSettings() {
  const { caps } = getCoach();
  const s = { ...state.settings };
  // Guided/Building: force full-body MED so the app does the thinking
  if (caps.lockFullBody) {
    s.splitPreference = "full_body";
  }
  // Time-box overrides session minutes when set
  const box = +s.timeBoxMinutes || 0;
  if (box >= 25) {
    s.sessionMinutes = box;
  }
  return s;
}

function isDeloadActive(iso = todayISO()) {
  if (!state.deloadUntil) return false;
  const today = todayISO();
  // Only today → deloadUntil (never rewrite past session doses)
  return iso >= today && iso <= state.deloadUntil;
}

/** Day dose map with deload forcing rough for active window */
function effectiveDayDose() {
  const map = { ...(state.dayDose || {}) };
  if (!state.deloadUntil) return map;
  const today = todayISO();
  // Force rough on train days from today through deloadUntil
  for (const d of state.trainingDays || []) {
    if (d >= today && d <= state.deloadUntil) {
      map[d] = "rough";
    }
  }
  return map;
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
    dayDose: effectiveDayDose(),
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
  if (isDeloadActive(iso)) return DOSE_PROFILES.rough;
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
  if (meta) meta.setAttribute("content", mode === "midnight" ? "#0c0e0b" : "#d8d4c4");
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
    toast(cur === "midnight" ? "Field day" : "Field dark");
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
  const set = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text || "";
  };
  // Short line only on the card face — details live in the fold
  const shortMission = script.mission
    ? String(script.mission).split(/[.!?]/)[0].trim() + "."
    : "Show up and lift.";
  set("coach-headline", script.headline || "Coach");
  set("coach-mission", shortMission);
  set(
    "coach-science",
    script.science
      ? `Evidence: ${script.science} · Dose: ${dose.science}`
      : `Dose: ${dose.science}`
  );
  const roughN = roughDaysRecent(state.dayDose, 7, todayISO());
  let progress = script.progressNote || "";
  if (roughN >= 2) {
    progress += ` · ${roughN} rough days this week — protect sleep.`;
  }
  if (isDeloadActive()) {
    progress += ` · Deload on through ${state.deloadUntil}.`;
  }
  set("coach-progress", progress);
  set("coach-unlock", script.unlockHint || "");
  const ol = document.getElementById("coach-steps");
  if (ol) {
    ol.innerHTML = (script.steps || []).map((s) => `<li>${escapeHtml(s)}</li>`).join("");
  }
  const doseEl = document.getElementById("coach-dose-line");
  if (doseEl) {
    doseEl.textContent = session
      ? `Dose today: ${dose.short} — change with the buttons above if energy shifts.`
      : `Default dose: ${dose.short}.`;
  }
  renderStackCheckinBanner();
  renderRestTimerBar();
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
      <div class="dose-label">How I feel</div>
      <div class="dose-btns" role="group" aria-label="Training dose">${btns}</div>
      ${foldHtml(
        "What Low / MED / OED means",
        `<p class="dose-hint"><strong>${escapeHtml(p.label)}</strong> — ${escapeHtml(p.feel)}</p>
         <p class="dim dose-science">${escapeHtml(p.science)}</p>
         <p class="dim">Change anytime — the session rebuilds.</p>`
      )}
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
      <div class="hero-kicker">Today · ${weekdayShort(today)}</div>
      <div class="hero-title">Rest day</div>
      <div class="hero-meta"><span class="chip rest">No hard lift</span></div>
    `;
  } else if (lightToday && !trainToday) {
    hero.innerHTML = `
      <div class="hero-kicker">Today · ${weekdayShort(today)}</div>
      <div class="hero-title">Easy day</div>
      <div class="hero-meta"><span class="chip warn">Walk / mobility</span></div>
    `;
  } else if (trainToday && session) {
    const dose = doseForDay(session.day);
    hero.innerHTML = `
      <div class="hero-kicker">Today · ${weekdayShort(today)}</div>
      <div class="hero-title">${session.label}</div>
      <div class="hero-meta">
        <span class="chip train">Train</span>
        <span class="chip ember">${escapeHtml(dose.short)}</span>
        <span class="chip">~${session.estimatedMinutes} min</span>
        <span class="chip">${session.exercises.length} lifts</span>
        ${session.completed ? '<span class="chip ok">Done</span>' : ""}
      </div>
      ${renderDosePicker(session.day)}
    `;
    activeSessionIso = today;
  } else if (session) {
    const dose = doseForDay(session.day);
    hero.innerHTML = `
      <div class="hero-kicker">Next · ${weekdayShort(session.day)}</div>
      <div class="hero-title">${session.label}</div>
      <div class="hero-meta">
        <span class="chip train">Planned</span>
        <span class="chip ember">${escapeHtml(dose.short)}</span>
        <span class="chip">~${session.estimatedMinutes} min</span>
      </div>
      ${renderDosePicker(session.day)}
    `;
    activeSessionIso = session.day;
  } else {
    hero.innerHTML = `
      <div class="hero-kicker">Iron Ledger</div>
      <div class="hero-title">No train days</div>
      <p class="hint" style="margin:0">Open <strong>Plan</strong> and tap the days you can train.</p>
    `;
  }

  wireDosePicker();
  renderSessionCard(session);
  renderUpcoming(today);
}

function getExLog(iso, exerciseId) {
  return ensureExerciseLog(state.logs, iso, exerciseId);
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
  const box = +state.settings.timeBoxMinutes || 0;
  const timeNote = box >= 25 ? `Time-box ${box} min.` : "";
  // Rationale stays optional/collapsed — not dumped on the card face
  if (rationale) {
    const why = (session.rationale || "").trim();
    if (why || timeNote) {
      rationale.hidden = false;
      rationale.className = "session-why-wrap";
      rationale.innerHTML = foldHtml(
        "Why this session?",
        `<p class="hint" style="margin:0">${escapeHtml(why)}${why && timeNote ? " " : ""}${escapeHtml(timeNote)}</p>`
      );
    } else {
      rationale.hidden = true;
      rationale.innerHTML = "";
    }
  }
  const { caps } = getCoach();
  const showWarm = state.settings.showWarmups !== false;

  list.innerHTML = session.exercises
    .map((ex, i) => {
      const last = lastWorkingSets(state.logs, ex.exerciseId, session.day);
      const sug = suggestNext(last, ex.reps);
      const exLog = state.logs?.[session.day]?.exercises?.[ex.exerciseId];
      const sets = exLog?.sets?.length
        ? exLog.sets
        : seedSetsFromSuggestion(sug, ex.sets).map((s) => ({ ...s, weight: s.weight === 0 ? "" : s.weight }));
      // Don't auto-persist empty seeds until user types
      const cues = FORM_CUES[ex.exerciseId] || [];
      const skip = exLog?.skipReason || "";
      const workW = sets.find((s) => +s.weight > 0)?.weight || last?.sets?.[0]?.weight || 0;
      const warm = showWarm ? warmupLadder(workW, ex.role) : [];
      const restSec = restDefaultForRole(ex.role);

      const unit = state.settings.unitLabel || "lb";
      const setRows = sets
        .map(
          (s, si) => `
        <div class="set-row" data-ex="${i}" data-set="${si}">
          <span class="set-num">${si + 1}</span>
          <div class="stepper" data-field="w">
            <button type="button" class="step-btn" data-step-w="-2.5" data-ex="${i}" data-set="${si}" aria-label="Decrease weight">−</button>
            <input type="number" class="set-w" inputmode="decimal" step="0.5" min="0" placeholder="${escapeHtml(unit)}" value="${s.weight === "" || s.weight == null ? "" : escapeHtml(String(s.weight))}" aria-label="Weight set ${si + 1}" />
            <button type="button" class="step-btn" data-step-w="2.5" data-ex="${i}" data-set="${si}" aria-label="Increase weight">+</button>
          </div>
          <span class="set-x">×</span>
          <div class="stepper" data-field="r">
            <button type="button" class="step-btn" data-step-r="-1" data-ex="${i}" data-set="${si}" aria-label="Decrease reps">−</button>
            <input type="number" class="set-r" inputmode="numeric" step="1" min="0" placeholder="reps" value="${s.reps === "" || s.reps == null ? "" : escapeHtml(String(s.reps))}" aria-label="Reps set ${si + 1}" />
            <button type="button" class="step-btn" data-step-r="1" data-ex="${i}" data-set="${si}" aria-label="Increase reps">+</button>
          </div>
          <input type="number" class="set-rpe" inputmode="decimal" step="0.5" min="1" max="10" placeholder="RPE" value="${s.rpe === "" || s.rpe == null ? "" : escapeHtml(String(s.rpe))}" aria-label="RPE set ${si + 1}" title="Optional RPE" />
          <label class="set-hard" title="Hard working set"><input type="checkbox" class="set-hard-cb" ${s.hard !== false ? "checked" : ""} /> Hard</label>
        </div>`
        )
        .join("");

      const plateHint =
        +workW > 40
          ? (() => {
              const pb = plateBreakdown(workW, +state.settings.barWeight || 45);
              if (!pb.plates.length) return "";
              return `<p class="plate-line dim">Plates/side (~${pb.bar} bar): ${pb.plates.join(" + ") || "—"} → ${formatLoad(pb.total)}</p>`;
            })()
          : "";

      const tipsBody = [
        sug.lines.length
          ? `<div class="prog-line">${sug.lines.map((l) => escapeHtml(l)).join("<br/>")}</div>`
          : "",
        warm.length
          ? `<div class="warmup-line"><span class="dim">Warm-up:</span> ${warm.map(escapeHtml).join(" → ")}</div>`
          : "",
        plateHint,
        cues.length
          ? `<div class="cues-line"><strong>Form cues:</strong> ${cues.map(escapeHtml).join(" · ")}</div>`
          : "",
        `<div class="ex-why">${escapeHtml(ex.why || "Picked to cover today’s muscle needs.")}</div>`,
        `<div class="skip-row">
          <label class="dim">Skip lift:</label>
          <select data-skip="${i}" aria-label="Skip reason">
            <option value="">—</option>
            ${SKIP_REASONS.map((r) => `<option value="${r.id}" ${skip === r.id ? "selected" : ""}>${escapeHtml(r.label)}</option>`).join("")}
          </select>
        </div>`,
      ]
        .filter(Boolean)
        .join("");

      return `
    <li class="ex-item ${ex.done ? "done" : ""} ${skip ? "skipped" : ""}" data-i="${i}" data-eid="${escapeHtml(ex.exerciseId)}">
      <button type="button" class="ex-check" data-toggle="${i}" aria-label="Mark done">${ex.done ? "✓" : ""}</button>
      <div class="ex-main">
        <div class="ex-name">${escapeHtml(ex.name)}</div>
        <div class="ex-detail">${ex.sets} × ${escapeHtml(ex.reps)} · ${escapeHtml(ex.primary.map(muscleName).join(", "))}</div>
        <div class="set-log" data-ex-log="${i}">
          <div class="set-head"><span></span><span>Load</span><span></span><span>Reps</span><span>RPE</span><span></span></div>
          ${setRows}
          <div class="set-tools">
            <button type="button" class="primary-btn tiny" data-done-set="${i}" title="Save set and start rest">Done → rest</button>
            <button type="button" class="ghost-btn tiny" data-same-last="${i}">Same as last</button>
            <button type="button" class="ghost-btn tiny" data-add-set="${i}">+ Set</button>
            <button type="button" class="ghost-btn tiny" data-rest="${restSec}" data-ex-rest="${i}">Rest ${restSec >= 60 ? restSec / 60 + "m" : restSec + "s"}</button>
            <button type="button" class="ghost-btn tiny" data-save-log="${i}">Save</button>
          </div>
        </div>
        ${foldHtml("Tips / skip", tipsBody, { className: "fold-ex" })}
      </div>
      <div class="ex-actions">
        ${caps.allowSwap ? `<button type="button" data-swap="${i}">Swap</button>` : ""}
      </div>
    </li>`;
    })
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
  list.querySelectorAll("[data-save-log]").forEach((btn) => {
    btn.addEventListener("click", () => {
      saveExerciseLogFromDom(session, +btn.dataset.saveLog);
      toast("Set log saved");
      renderSessionCard(session);
    });
  });
  list.querySelectorAll("[data-add-set]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = +btn.dataset.addSet;
      const ex = session.exercises[i];
      const log = getExLog(session.day, ex.exerciseId);
      // pull current DOM first
      saveExerciseLogFromDom(session, i, { silent: true });
      const prev = log.sets[log.sets.length - 1];
      log.sets.push({
        weight: prev?.weight ?? "",
        reps: prev?.reps ?? "",
        hard: true,
        rpe: "",
      });
      persist();
      renderSessionCard(session);
    });
  });
  list.querySelectorAll("[data-same-last]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = +btn.dataset.sameLast;
      const root = document.querySelector(`.ex-item[data-i="${i}"]`);
      if (!root) return;
      const rows = [...root.querySelectorAll(".set-row")];
      if (rows.length < 2) {
        // copy from suggestion / last session into first empty
        saveExerciseLogFromDom(session, i, { silent: true });
        const ex = session.exercises[i];
        const log = getExLog(session.day, ex.exerciseId);
        const last = lastWorkingSets(state.logs, ex.exerciseId, session.day);
        const src = last?.sets?.[0];
        if (!src) {
          toast("No previous set to copy");
          return;
        }
        const target = log.sets.find((s) => !s.reps && !s.weight) || log.sets[log.sets.length - 1];
        if (target) {
          target.weight = src.weight;
          target.reps = src.reps;
          target.hard = true;
        }
        persist();
        renderSessionCard(session);
        toast("Copied last session");
        return;
      }
      const prev = rows[rows.length - 2];
      const cur = rows[rows.length - 1];
      const w = prev.querySelector(".set-w")?.value ?? "";
      const r = prev.querySelector(".set-r")?.value ?? "";
      const rpe = prev.querySelector(".set-rpe")?.value ?? "";
      if (cur.querySelector(".set-w")) cur.querySelector(".set-w").value = w;
      if (cur.querySelector(".set-r")) cur.querySelector(".set-r").value = r;
      if (cur.querySelector(".set-rpe")) cur.querySelector(".set-rpe").value = rpe;
      saveExerciseLogFromDom(session, i, { silent: true });
      toast("Same as last set");
    });
  });
  list.querySelectorAll("[data-done-set]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = +btn.dataset.doneSet;
      const ex = session.exercises[i];
      saveExerciseLogFromDom(session, i, { silent: true });
      const restSec = restDefaultForRole(ex.role);
      startRestTimer(restSec);
      toast("Set saved · rest on");
    });
  });
  list.querySelectorAll("[data-step-w]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const row = btn.closest(".set-row");
      const inp = row?.querySelector(".set-w");
      if (!inp) return;
      const delta = +btn.dataset.stepW || 2.5;
      const cur = inp.value === "" ? 0 : +inp.value;
      const next = Math.max(0, Math.round((cur + delta) * 2) / 2);
      inp.value = String(next);
      saveExerciseLogFromDom(session, +row.dataset.ex, { silent: true });
    });
  });
  list.querySelectorAll("[data-step-r]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const row = btn.closest(".set-row");
      const inp = row?.querySelector(".set-r");
      if (!inp) return;
      const delta = +btn.dataset.stepR || 1;
      const cur = inp.value === "" ? 0 : +inp.value;
      inp.value = String(Math.max(0, cur + delta));
      saveExerciseLogFromDom(session, +row.dataset.ex, { silent: true });
    });
  });
  list.querySelectorAll("[data-rest]").forEach((btn) => {
    btn.addEventListener("click", () => startRestTimer(+btn.dataset.rest || 90));
  });
  list.querySelectorAll("[data-skip]").forEach((sel) => {
    sel.addEventListener("change", () => {
      const i = +sel.dataset.skip;
      const ex = session.exercises[i];
      const log = getExLog(session.day, ex.exerciseId);
      log.skipReason = sel.value || null;
      if (log.skipReason) {
        session.exercises[i].done = true;
      }
      persist();
      saveSessionProgress(session);
      toast(log.skipReason ? "Marked skipped" : "Skip cleared");
      renderSessionCard(session);
    });
  });
  // Auto-save on blur of set inputs
  list.querySelectorAll(".set-row input").forEach((inp) => {
    inp.addEventListener("change", () => {
      const row = inp.closest(".set-row");
      if (!row) return;
      saveExerciseLogFromDom(session, +row.dataset.ex, { silent: true });
    });
  });

  const proteinHint = proteinHintHtml();

  actions.innerHTML = `
    <div class="rest-presets" id="rest-presets">
      ${REST_PRESETS.map((p) => `<button type="button" class="ghost-btn tiny" data-rest-preset="${p.sec}">Rest ${p.label}</button>`).join("")}
      <button type="button" class="ghost-btn tiny" id="rest-stop" ${restTimer.endsAt ? "" : "hidden"}>Stop timer</button>
    </div>
    ${proteinHint}
    <button type="button" class="primary-btn" id="mark-complete">${session.completed ? "Mark incomplete" : "Mark session complete"}</button>
    <button type="button" class="ghost-btn" id="log-macro" title="Open MacroLedger with this session prefilled">Log burn in MacroLedger</button>
    <button type="button" class="ghost-btn" id="skip-day">Remove this train day</button>
  `;
  document.getElementById("rest-presets")?.querySelectorAll("[data-rest-preset]").forEach((btn) => {
    btn.addEventListener("click", () => startRestTimer(+btn.dataset.restPreset));
  });
  document.getElementById("rest-stop")?.addEventListener("click", () => stopRestTimer());
  document.getElementById("mark-complete").onclick = () => {
    // Save all visible logs first
    session.exercises.forEach((_, i) => saveExerciseLogFromDom(session, i, { silent: true }));
    const finishing = !session.completed;
    session.completed = !session.completed;
    if (session.completed) session.exercises.forEach((e) => (e.done = true));
    saveSessionProgress(session);
    toast(session.completed ? "Session complete" : "Marked incomplete");
    renderToday();
    renderCalendar();
    if (finishing && session.completed) {
      setTimeout(() => showSessionSummary(session), 200);
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

function saveExerciseLogFromDom(session, exIndex, { silent = false } = {}) {
  const ex = session.exercises[exIndex];
  if (!ex) return;
  const root = document.querySelector(`.ex-item[data-i="${exIndex}"]`);
  if (!root) return;
  const rows = [...root.querySelectorAll(".set-row")];
  const sets = rows.map((row) => {
    const w = row.querySelector(".set-w")?.value;
    const r = row.querySelector(".set-r")?.value;
    const rpe = row.querySelector(".set-rpe")?.value;
    const hard = row.querySelector(".set-hard-cb")?.checked !== false;
    return {
      weight: w === "" ? "" : +w,
      reps: r === "" ? "" : +r,
      rpe: rpe === "" ? "" : +rpe,
      hard,
    };
  });
  const log = getExLog(session.day, ex.exerciseId);
  log.sets = sets;
  // Mark done if any hard set has reps
  if (sets.some((s) => s.hard !== false && +s.reps > 0)) {
    ex.done = true;
  }
  persist();
  saveSessionProgress(session);
  if (!silent) toast("Saved");
}

function proteinHintHtml() {
  const kg = +state.settings.bodyweightKg;
  if (!kg || kg < 30) return "";
  const lo = Math.round(kg * 1.6);
  const hi = Math.round(kg * 2.2);
  return `<p class="hint protein-hint">Protein target ~${lo}–${hi} g today (1.6–2.2 g/kg) · log food in MacroLedger</p>`;
}

// ---------- wake lock (keep screen on during rest) ----------
async function requestWakeLock() {
  try {
    if (!("wakeLock" in navigator)) return;
    wakeLockSentinel = await navigator.wakeLock.request("screen");
    wakeLockSentinel.addEventListener("release", () => {
      wakeLockSentinel = null;
    });
  } catch {
    /* permission / unsupported */
  }
}

async function releaseWakeLock() {
  try {
    await wakeLockSentinel?.release();
  } catch {
    /* ok */
  }
  wakeLockSentinel = null;
}

// ---------- rest timer ----------
function startRestTimer(sec) {
  const s = Math.max(15, Math.min(600, +sec || 90));
  restTimer.totalSec = s;
  restTimer.endsAt = Date.now() + s * 1000;
  if (restTimer.intervalId) clearInterval(restTimer.intervalId);
  restTimer.intervalId = setInterval(() => {
    renderRestTimerBar();
    if (!restTimer.endsAt || Date.now() >= restTimer.endsAt) {
      stopRestTimer(true);
    }
  }, 250);
  requestWakeLock();
  renderRestTimerBar();
  toast(`Rest ${s >= 60 ? Math.round(s / 60) + " min" : s + "s"}`);
}

function stopRestTimer(finished = false) {
  if (restTimer.intervalId) clearInterval(restTimer.intervalId);
  restTimer.intervalId = null;
  restTimer.endsAt = null;
  releaseWakeLock();
  renderRestTimerBar();
  if (finished) {
    toast("Rest done — next set");
    try {
      if (navigator.vibrate) navigator.vibrate([120, 60, 120, 60, 200]);
    } catch {
      /* ok */
    }
  }
  // refresh stop button visibility on today
  const stop = document.getElementById("rest-stop");
  if (stop) stop.hidden = true;
}

/** End-of-session summary modal + optional MacroLedger handoff */
function showSessionSummary(session) {
  const dayLog = state.logs?.[session.day];
  const summary = buildSessionSummary(session, dayLog);
  const modal = document.getElementById("session-summary-modal");
  const body = document.getElementById("session-summary-body");
  if (!modal || !body) {
    // Fallback if HTML not present
    if (
      confirm(
        `Session done · ${summary.loggedHard}/${summary.plannedSets} hard sets (${summary.pctOfPlan}% of plan).\n\nLog burn in MacroLedger?`
      )
    ) {
      openMacroLedgerHandoff(session, { auto: true, summary });
    }
    return;
  }
  const liftLines = summary.lifts
    .map((l) =>
      l.skipped
        ? `<li class="dim">${escapeHtml(l.name)} — skipped</li>`
        : `<li><strong>${escapeHtml(l.name)}</strong> ${escapeHtml(l.top)} · ${l.sets} hard</li>`
    )
    .join("");
  body.innerHTML = `
    <p class="hint">${escapeHtml(summary.label)} · ${escapeHtml(session.day)}</p>
    <div class="summary-stats">
      <div><strong>${summary.loggedHard}</strong><span>hard sets</span></div>
      <div><strong>${summary.plannedSets}</strong><span>planned</span></div>
      <div><strong>${summary.pctOfPlan}%</strong><span>of plan</span></div>
      <div><strong>~${summary.minutes || "—"}</strong><span>min</span></div>
    </div>
    <ul class="summary-lifts">${liftLines || "<li class='dim'>No sets logged</li>"}</ul>
    <p class="dim">Quiet close — export a backup from Settings when you can.</p>
  `;
  modal.hidden = false;
  const close = () => {
    modal.hidden = true;
  };
  document.getElementById("session-summary-close")?.addEventListener("click", close, { once: true });
  document.getElementById("session-summary-done")?.addEventListener("click", close, { once: true });
  document.getElementById("session-summary-macro")?.addEventListener(
    "click",
    () => {
      close();
      openMacroLedgerHandoff(session, { auto: true, summary });
    },
    { once: true }
  );
  modal.addEventListener(
    "click",
    (e) => {
      if (e.target.id === "session-summary-modal") close();
    },
    { once: true }
  );
}

function renderRestTimerBar() {
  const bar = document.getElementById("rest-timer-bar");
  if (!bar) return;
  if (!restTimer.endsAt) {
    bar.hidden = true;
    bar.innerHTML = "";
    return;
  }
  const left = Math.max(0, Math.ceil((restTimer.endsAt - Date.now()) / 1000));
  const m = Math.floor(left / 60);
  const s = left % 60;
  const pct = Math.min(100, Math.round(((restTimer.totalSec - left) / restTimer.totalSec) * 100));
  bar.hidden = false;
  bar.innerHTML = `
    <div class="rest-timer-inner">
      <strong>Rest</strong>
      <span class="rest-clock">${m}:${String(s).padStart(2, "0")}</span>
      <div class="rest-bar"><i style="width:${pct}%"></i></div>
      <button type="button" class="ghost-btn tiny" id="rest-bar-stop">Skip</button>
    </div>`;
  document.getElementById("rest-bar-stop")?.addEventListener("click", () => stopRestTimer(false));
}

// ---------- stack check-in ----------
function renderStackCheckinBanner() {
  const el = document.getElementById("stack-checkin");
  if (!el) return;
  const stack = state.myStack || [];
  if (!stack.length) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }
  const today = todayISO();
  const day = state.stackCheckins[today] || {};
  el.hidden = false;
  el.innerHTML = `
    <div class="card stack-card">
      <h2>Stack today</h2>
      <div class="stack-check-list">
        ${stack
          .map((id) => {
            const name = SUPPLEMENTS.find((s) => s.id === id)?.name || id;
            const on = !!day[id];
            return `<label class="stack-check"><input type="checkbox" data-stack-day="${escapeHtml(id)}" ${on ? "checked" : ""}/> ${escapeHtml(name)}</label>`;
          })
          .join("")}
      </div>
    </div>`;
  el.querySelectorAll("[data-stack-day]").forEach((cb) => {
    cb.addEventListener("change", () => {
      if (!state.stackCheckins[today]) state.stackCheckins[today] = {};
      if (cb.checked) state.stackCheckins[today][cb.dataset.stackDay] = true;
      else delete state.stackCheckins[today][cb.dataset.stackDay];
      persist();
      toast(cb.checked ? "Checked in" : "Cleared");
    });
  });
}

/**
 * Deep-link into MacroLedger with session minutes + name + volume tags.
 * MacroLedger reads ?iron=1&date=&min=&name=&auto=1 (extra params are forward-compatible).
 */
function openMacroLedgerHandoff(session, { auto = true, summary = null } = {}) {
  if (!session) return;
  const dayLog = state.logs?.[session.day];
  const sum = summary || buildSessionSummary(session, dayLog);
  const minutes = Math.max(1, Math.round(sum.minutes || session.estimatedMinutes || 45));
  const name = `Iron Ledger · ${session.label || "Strength"}`;
  const url = new URL(MACROLEDGER_URL);
  url.searchParams.set("iron", "1");
  url.searchParams.set("date", session.day);
  url.searchParams.set("min", String(minutes));
  url.searchParams.set("name", name);
  url.searchParams.set("sets", String(sum.loggedHard || 0));
  url.searchParams.set("dose", sum.doseId || session.doseId || "med");
  const bw = +state.settings.bodyweightKg;
  if (bw >= 30) url.searchParams.set("bw", String(bw));
  const muscles = [
    ...new Set((session.exercises || []).flatMap((e) => e.primary || [])),
  ].slice(0, 8);
  if (muscles.length) url.searchParams.set("muscles", muscles.join(","));
  if (auto) url.searchParams.set("auto", "1");
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
    label: session.label,
    minutes: session.estimatedMinutes,
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

// ---------- coverage + history + PRs ----------
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

  renderCoverInsights();

  if (!plan) {
    meta.textContent = "No plan yet — mark train days on Plan.";
    bars.innerHTML = "";
    renderHistoryAndPrs();
    return;
  }
  const under = plan.meta.underCoveredPrimaries || [];
  meta.textContent = under.length
    ? `⚠ Under MED (planned) on: ${under.join(", ")} · ${plan.meta.trainingDays} train days`
    : `✓ Primaries on planned MED track · ${plan.meta.trainingDays} train days · ×${plan.meta.medMultiplier}`;

  const from = plan.meta?.start;
  const to = plan.meta?.end;
  const logged = loggedCoverage(state.logs, from, to);

  const rows = MUSCLES.map((m) => {
    const planned = plan.coverage[m.id] || 0;
    const got = logged[m.id] || 0;
    const tgt = plan.targets[m.id] || 1;
    const pctPlan = Math.min(100, Math.round((planned / tgt) * 100));
    const pctLog = Math.min(100, Math.round((got / tgt) * 100));
    const low = pctLog < 70 && pctPlan < 70;
    return { m, planned, got, tgt, pctPlan, pctLog, low };
  }).sort((a, b) => b.tgt - a.tgt);

  bars.innerHTML = rows
    .map(
      (r) => `
    <div class="cov-row dual">
      <span>${escapeHtml(r.m.name)}</span>
      <div class="cov-dual">
        <div class="cov-bar" title="Planned ${r.planned.toFixed(1)} / ${r.tgt.toFixed(1)}"><i style="width:${r.pctPlan}%"></i></div>
        <div class="cov-bar logged ${r.pctLog < 70 ? "low" : ""}" title="Logged hard sets ${r.got.toFixed(1)} / ${r.tgt.toFixed(1)}"><i style="width:${r.pctLog}%"></i></div>
      </div>
      <span class="dim cov-nums">${Math.round(r.got)}/${Math.round(r.tgt)}<br/><span class="tiny">log · plan ${Math.round(r.planned)}</span></span>
    </div>`
    )
    .join("");

  renderHistoryAndPrs();
}

function renderCoverInsights() {
  const el = document.getElementById("cover-insights");
  if (!el) return;
  const insights = buildCoverInsights({
    logs: state.logs,
    completedSessions: state.completedSessions,
    dayDose: state.dayDose,
    plan,
    today: todayISO(),
    lookbackDays: 14,
  });
  if (!insights.items.length) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }
  el.hidden = false;
  // Titles only on the face; long copy behind each dropdown
  el.innerHTML = `
    <div class="card insights-card">
      <h2>Insights</h2>
      <ul class="insight-list">
        ${insights.items
          .map(
            (it) => `
          <li class="insight-item tone-${escapeHtml(it.tone || "dim")}">
            ${foldHtml(
              escapeHtml(it.title),
              `<p>${escapeHtml(it.body)}</p>${
                it.action === "deload"
                  ? `<button type="button" class="ghost-btn tiny" data-insight-deload>Start 7-day deload</button>`
                  : ""
              }`
            )}
          </li>`
          )
          .join("")}
      </ul>
    </div>`;
  el.querySelector("[data-insight-deload]")?.addEventListener("click", () => {
    if (!confirm("Start a 7-day deload? Train days will use Low (Rough) dose until it ends.")) return;
    startDeloadWeek();
    renderCoverage();
    toast("Deload started");
  });
}

function renderHistoryAndPrs() {
  const histEl = document.getElementById("history-list");
  const prEl = document.getElementById("pr-board");
  if (histEl) {
    const rows = buildHistory(state.completedSessions, state.logs, plan?.sessions || []);
    if (!rows.length) {
      histEl.innerHTML = `<p class="hint">No sessions logged yet. Finish a session and save set loads on Today.</p>`;
    } else {
      histEl.innerHTML = rows
        .slice(0, 24)
        .map((r) => {
          const dose = DOSE_PROFILES[r.doseId]?.short || r.doseId;
          return `
        <button type="button" class="session-row" data-hist="${r.day}">
          <div>
            <strong>${weekdayShort(r.day)} ${r.day} · ${escapeHtml(r.label)}</strong>
            <span>${r.completed ? "Done" : "Partial"} · ${dose} · ${r.hardSets} hard sets${r.lifts.length ? " · " + escapeHtml(r.lifts.slice(0, 2).join(" · ")) : ""}</span>
          </div>
          <span class="chip ${r.completed ? "ok" : "warn"}">Open</span>
        </button>`;
        })
        .join("");
      histEl.querySelectorAll("[data-hist]").forEach((btn) => {
        btn.addEventListener("click", () => {
          activeSessionIso = btn.dataset.hist;
          document.querySelector('.nav-btn[data-view="today"]')?.click();
          renderToday();
        });
      });
    }
  }
  if (prEl) {
    const board = computePrBoard(state.logs);
    prEl.innerHTML = board
      .map((p) => {
        if (!p.best) {
          return `<div class="pr-row"><span class="pr-label">${escapeHtml(p.label)}</span><span class="dim">—</span></div>`;
        }
        const b = p.best;
        return `<div class="pr-row">
          <span class="pr-label">${escapeHtml(p.label)}</span>
          <span><strong>${formatLoad(b.weight)}×${b.reps}</strong> <span class="dim">(~${formatLoad(b.e1rm)} e1RM)</span><br/><span class="tiny">${escapeHtml(b.name)} · ${b.day}</span></span>
        </div>`;
      })
      .join("");
  }
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
      ${foldHtml(
        "Details",
        `${claims ? `<ul class="claim-list">${claims}</ul>` : ""}
        <p class="sup-meta"><strong>Dose:</strong> ${escapeHtml(s.medDose)}</p>
        <p class="sup-meta"><strong>When:</strong> ${escapeHtml(s.when)} · ${escapeHtml(s.window)}</p>
        <p class="sup-why">${escapeHtml(s.why)}</p>
        <div class="sup-science">${escapeHtml(s.science)}</div>
        ${
          interactions
            ? `<div class="sup-ix"><strong>Cautions:</strong><ul class="ix-list">${interactions}</ul></div>`
            : ""
        }
        <p class="sup-meta"><strong>Skip if:</strong> ${escapeHtml(s.skipIf)}</p>
        <p class="dim">${escapeHtml(s.wastedEffortNote)}</p>`
      )}
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
  const { n, q, stage, caps } = getCoach();
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
  const timeBox = document.getElementById("set-timebox");
  if (timeBox) timeBox.value = String(s.timeBoxMinutes || 0);
  const bw = document.getElementById("set-bw");
  if (bw) bw.value = s.bodyweightKg || "";
  const warm = document.getElementById("set-warmups");
  if (warm) warm.checked = s.showWarmups !== false;
  const qg = document.getElementById("set-quality-gates");
  if (qg) qg.checked = s.coachQualityGates !== false;
  const sessionsLabel = document.getElementById("sessions-done-label");
  if (sessionsLabel) {
    sessionsLabel.textContent = `${n} completed · ${q} quality (logged) · stage: ${stage.label}`;
  }
  const stageDetail = document.getElementById("coach-stage-detail");
  if (stageDetail) {
    stageDetail.innerHTML = `${escapeHtml(stage.blurb)} Auto path: <strong>Guided</strong> (0–5) → <strong>Building</strong> (6–14) → <strong>Custom</strong> (15+). Quality gates use sessions with logged hard sets when available.`;
  }
  const deloadLbl = document.getElementById("deload-status");
  if (deloadLbl) {
    deloadLbl.textContent = state.deloadUntil
      ? `Deload active through ${state.deloadUntil}`
      : "No deload scheduled";
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

  const backupAge = document.getElementById("backup-age");
  if (backupAge) {
    const age = formatBackupAge(state.lastBackupAt);
    const nag = needsBackupReminder(state);
    backupAge.textContent = nag ? `${age} · export recommended` : age;
    backupAge.classList.toggle("backup-warn", nag);
  }
  const verNote = document.getElementById("data-version-note");
  if (verNote) {
    verNote.textContent = `v${APP_VERSION} · field ops UI · set logs + backups`;
  }

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
  const nameEl = document.getElementById("set-name");
  if (nameEl) state.settings.displayName = nameEl.value.trim();
  state.settings.sessionMinutes = +document.getElementById("set-minutes").value || 55;
  const coachSel = document.getElementById("set-coach");
  if (coachSel) state.settings.coachMode = coachSel.value;
  const doseSel = document.getElementById("set-default-dose");
  if (doseSel) state.settings.defaultDose = doseSel.value || "med";
  const timeBox = document.getElementById("set-timebox");
  if (timeBox) state.settings.timeBoxMinutes = +timeBox.value || 0;
  const bw = document.getElementById("set-bw");
  if (bw) {
    const v = +bw.value;
    state.settings.bodyweightKg = v >= 30 ? v : null;
  }
  const warm = document.getElementById("set-warmups");
  if (warm) state.settings.showWarmups = warm.checked;
  const qg = document.getElementById("set-quality-gates");
  if (qg) state.settings.coachQualityGates = qg.checked;

  // Recompute caps after mode change
  const { caps: newCaps } = getCoach();

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

function startDeloadWeek() {
  const d = parseISO(todayISO());
  d.setDate(d.getDate() + 6);
  state.deloadUntil = toISO(d);
  persist();
  rebuild();
  toast(`Deload through ${state.deloadUntil} — sessions Low`);
  renderSettingsForm();
}

function clearDeload() {
  state.deloadUntil = null;
  persist();
  rebuild();
  toast("Deload cleared");
  renderSettingsForm();
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
        <span class="dim">${s.sets} × ${escapeHtml(s.reps)} · ${escapeHtml(s.jobLine || s.primary.map(muscleName).join(", "))}</span>
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
      <p class="dim" style="margin-top:0.75rem">Path: Guided (0–5) → Building (6–14) → Custom (15+). Log weights on Today so unlocks track real work. Science notes under lifts + Supps.</p>
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
  document.getElementById("btn-deload")?.addEventListener("click", () => {
    if (!confirm("Start a 7-day deload? Train days will use Low (Rough) dose until it ends.")) return;
    startDeloadWeek();
  });
  document.getElementById("btn-deload-clear")?.addEventListener("click", clearDeload);
  document.getElementById("set-theme")?.addEventListener("change", (e) => {
    applyTheme(e.target.value);
    toast(
      e.target.value === "midnight"
        ? "Field dark"
        : e.target.value === "light"
          ? "Field day"
          : "System theme"
    );
  });
  document.getElementById("export-btn").onclick = () => exportBackupFile();
  document.getElementById("share-backup-btn")?.addEventListener("click", () => shareBackup());
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
      renderSettingsForm();
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

function backupBlob() {
  return new Blob([exportJson(state)], { type: "application/json" });
}

function backupFilename() {
  return `iron-ledger-backup-${todayISO()}.json`;
}

function noteBackupSuccess(msg) {
  markBackupDone(state);
  renderSettingsForm();
  toast(msg || "Backup saved");
}

function exportBackupFile() {
  const blob = backupBlob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = backupFilename();
  a.click();
  URL.revokeObjectURL(a.href);
  noteBackupSuccess("Backup exported");
}

async function shareBackup() {
  const blob = backupBlob();
  const name = backupFilename();
  const file = new File([blob], name, { type: "application/json" });
  try {
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: "Iron Ledger backup",
        text: "Local training data backup — keep private.",
      });
      noteBackupSuccess("Backup shared");
      return;
    }
  } catch (e) {
    if (e?.name === "AbortError") return;
  }
  // Fallback: download
  exportBackupFile();
}

function maybeNagBackup() {
  if (backupNagShown) return;
  if (!needsBackupReminder(state)) return;
  backupNagShown = true;
  setTimeout(() => {
    toast("Reminder: export a backup (Settings → Data)");
  }, 1800);
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
  maybeNagBackup();
  // Re-request wake lock if rest timer still running after tab return
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && restTimer.endsAt) {
      requestWakeLock();
    }
  });
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
