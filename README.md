# Iron Ledger

**Live:** https://natesaninja.github.io/iron-ledger/  
Open freely (invite gate is off). Repo can stay private so source isn’t public.

**Install (no store):** this is a home-screen app.

- **iPhone:** Safari (not Chrome) → Share → **Add to Home Screen**. Launch from the icon.
- **Android:** Chrome → menu → **Install app** / Add to Home Screen.
- Updates apply automatically when online. Never delete the Home Screen icon to “update.”

To turn invites back on: set `INVITE_REQUIRED = true` in `js/invite-config.js`.

Tap **IL** in the header (or Setup → Field brief) for an in-app overview of every tab.

## Features (v24.10)

- Invite-only unlock per device (optional; off by default)  
- Progressive coach: Guided → Building → Custom (coaching tone; exclude / swap / split always open)  
- **Log coach** — Today shows one cue from your log (stagnation, missed days, push/pull skew, pain flags, deload). Cover still has the full list.  
- **Equipment** — commercial gym or home presets; expanded **home-gym** library (goblet, floor press, bands, BW)  
- **Training modes** — MED Auto (coverage-driven), Programs (fixed templates), Custom (weekly muscle targets)  
- **Programs** — educational templates: 5/3/1 BBB, PPL hypertrophy, Upper/Lower, classic bro split  
- **Program Cover** — adherence (days done/missed), slot mix, planned primary gaps  
- **Custom targets** — emphasize push/pull/legs/arms; planner rebuilds sessions around your map  
- MED / OED / rough dose by feel  
- **Set log** — weight × reps × RPE, +/− steppers, same-as-last, Done→rest, **skip a set** (or the whole lift), plate hint  
- **Feel adapt** — Easy / Right / Hard (+ RPE suggestion highlight)  
- **Next targets** — progression sheet from last hard sets (Today hero + per-lift)  
- **Training week strip** — Mon–Sun train/done/missed/rough at a glance  
- **Training journal** — per-lift pain/energy/joint; session energy/mood/sleep/fuel/stack; Cover pattern insights  
- **Session coverage check** — end-of-session muscle light list + feel adjustment recap  
- **TM from logs** — suggest 5/3/1 training maxes from recent hard sets  
- Rest timer with wake lock + stronger vibrate · skip reasons · time-box · 7-day deload  
- **Session summary** on complete → MacroLedger handoff (sets, dose, muscles, msets, mode/program, bodyweight; persisted `il_macro_handoff_v1`; iPhone open fallback)  
- **Cover** — planned vs logged · insights (volume, stagnation, push/pull, deload suggest) · history · PR board  
- **Supps** — evidence browser + personal stack + daily check-in  
- Onboarding: where you train → how you train → mark Plan days  
- **Gym card** — print today’s session (load / reps / RPE blanks) if the phone stays in the locker  
- Field HUD — boot plate once per version (no audio; gym music stays in control)  
- Auto-save of the previous write (quota retry) + copy/export/share backup · weekly reminder  
- Offline type (self-hosted fonts) · maskable home-screen icon · Sentry on the live build  
- Offline · local-only · export / share backup · weekly backup reminder · versioned store  
- CI: tests must pass before GitHub Pages deploy  

## Local

```powershell
cd $env:USERPROFILE\iron-ledger
.\run.bat
```

```powershell
npm test
```

Use an invite code from `INVITE.md` on first load if the invite gate is on.

## Disclaimer

Educational — not medical advice.
