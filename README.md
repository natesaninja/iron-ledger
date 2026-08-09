# Iron Ledger

**Live:** https://natesaninja.github.io/iron-ledger/  
Open freely (invite gate is off). Repo can stay private so source isn’t public.

iPhone: Safari → URL → Share → **Add to Home Screen**.

To turn invites back on: set `INVITE_REQUIRED = true` in `js/invite-config.js`.

**Updates** apply automatically when online. Never delete the Home Screen icon to “update.”

## Features (v20)

- Invite-only unlock per device (optional)  
- Progressive coach: Guided → Building → Custom (coaching tone; exclude / swap / split always open)  
- **Equipment** — commercial gym or home presets (barbell / dumbbells / minimal); filters planner, swaps, and excludes  
- **Training modes** — MED Auto (coverage-driven), Programs (fixed templates), Custom (weekly muscle targets)  
- **Programs** — educational templates: 5/3/1 BBB, PPL hypertrophy, Upper/Lower, classic bro split  
- **Custom targets** — emphasize push/pull/legs/arms; planner rebuilds sessions around your map  
- MED / OED / rough dose by feel  
- **Set log** — weight × reps × RPE, +/− steppers, same-as-last, Done→rest, plate hint  
- Rest timer with wake lock + stronger vibrate · skip reasons · time-box · 7-day deload  
- **Session summary** on complete → MacroLedger handoff (sets, dose, muscles, bodyweight)  
- **Cover** — planned vs logged · insights (volume, stagnation, push/pull, deload suggest) · history · PR board  
- **Supps** — evidence browser + personal stack + daily check-in  
- Onboarding: where you train → how you train → mark Plan days  
- Offline · local-only · export / share backup · weekly backup reminder · versioned store  

## Local

```powershell
cd $env:USERPROFILE\strengthledger
.\run.bat
```

```powershell
npm test
```

Use an invite code from `INVITE.md` on first load if the invite gate is on.

## Disclaimer

Educational — not medical advice.
