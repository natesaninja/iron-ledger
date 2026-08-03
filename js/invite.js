/**
 * Invite-only unlock (localStorage after success).
 */
import { INVITE_REQUIRED, INVITE_HASHES } from "./invite-config.js";

const LS_KEY = "il_invite_ok_v1";
const LS_CODE_HINT = "il_invite_hint_v1";

export function inviteRequired() {
  return INVITE_REQUIRED !== false && (INVITE_HASHES?.length || 0) > 0;
}

export function isInviteUnlocked() {
  if (!inviteRequired()) return true;
  try {
    return localStorage.getItem(LS_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearInviteUnlock() {
  try {
    localStorage.removeItem(LS_KEY);
    localStorage.removeItem(LS_CODE_HINT);
  } catch {
    /* ok */
  }
}

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function normalizeCode(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

/**
 * @returns {Promise<{ok:boolean, error?:string}>}
 */
export async function tryUnlockInvite(rawCode) {
  if (!inviteRequired()) return { ok: true };
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, error: "Enter your invite code" };

  let hash;
  try {
    hash = await sha256Hex(code);
  } catch {
    return { ok: false, error: "This browser can’t verify invites" };
  }

  const allowed = new Set(INVITE_HASHES.map((h) => h.toLowerCase()));
  if (!allowed.has(hash)) {
    return { ok: false, error: "Invalid invite code" };
  }

  try {
    localStorage.setItem(LS_KEY, "1");
    // Store only last 4 chars as a non-secret reminder
    localStorage.setItem(LS_CODE_HINT, code.slice(-4));
  } catch {
    return { ok: false, error: "Could not save unlock on this device" };
  }
  return { ok: true };
}

export function showInviteGate() {
  const el = document.getElementById("invite-gate");
  const app = document.querySelector(".app");
  const nav = document.querySelector(".bottom-nav");
  if (el) el.hidden = false;
  if (app) app.hidden = true;
  if (nav) nav.hidden = true;
  document.getElementById("onboard")?.setAttribute("hidden", "");
}

export function hideInviteGate() {
  const el = document.getElementById("invite-gate");
  const app = document.querySelector(".app");
  const nav = document.querySelector(".bottom-nav");
  if (el) el.hidden = true;
  if (app) app.hidden = false;
  if (nav) nav.hidden = false;
}
