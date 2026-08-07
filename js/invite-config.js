/**
 * Invite gate is OFF so the app opens freely.
 * Set INVITE_REQUIRED = true only when you want a private pilot again
 * (and host somewhere that supports private access — free GitHub Pages needs a public repo).
 */
export const INVITE_REQUIRED = false;

export const INVITE_TOKENS = {
  pilot: "3a2ea3a30f9b4348699cd6d44adb05f583d615bef1a509259ed14392a1f3d3e2",
  crew1: "a212fab718503f6a5fabdfde521c30a0ef47e23f83c48c91ed362510ce908b4b",
  crew2: "a33bc9b6b0531e5e5a49215fe1c10d989cb0d72ffd76e6e5363c50dab073c263",
  crew3: "cab97c5c56a78b2fb8f1264f141ac53d7d988d6e687f916b2fa750713ac88c8d",
};

export const INVITE_HASHES = [...new Set(Object.values(INVITE_TOKENS))];

export const INVITE_SHARE_SLOTS = [
  { token: "pilot", label: "You (pilot)", blurb: "Your link" },
  { token: "crew1", label: "Coworker 1", blurb: "Tap copy → text them" },
  { token: "crew2", label: "Coworker 2", blurb: "Tap copy → text them" },
  { token: "crew3", label: "Coworker 3", blurb: "Tap copy → text them" },
];

export const APP_PUBLIC_URL = "https://natesaninja.github.io/iron-ledger/";
