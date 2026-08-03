# StrengthLedger

**Live:** https://natesaninja.github.io/strengthledger/

iPhone: Safari → that URL → Share → **Add to Home Screen**.

**Updates** apply automatically when you’re online (same model as MacroLedger).  
**Never delete the Home Screen icon** to force an update — that can erase local data on iPhone. Use **Settings → Refresh app** if needed.

---

## What it is

Minimum effective dose **commercial-gym** planner with a progressive coach:

| Stage | Sessions completed | Experience |
|-------|--------------------|------------|
| **Guided** | 0–5 | App picks full-body MED plan; why open by default; no swaps |
| **Building** | 6–14 | Still coached; can swap / exclude exercises |
| **Custom** | 15+ (or force in Settings) | Split, volume, exclusions — keep what works |

- Recovery-aware coverage debt  
- **Why this lift?** + coach script with evidence angle  
- MED supplements (creatine, protein, optional caffeine; conditional Vit D / omega)  
- Offline PWA · light/dark · share link (each phone has private data)

Sibling diet app: [MacroLedger](https://natesaninja.github.io/macroledger/)

## Local dev

```powershell
cd $env:USERPROFILE\strengthledger
.\run.bat
```

## Deploy

Push to `main` on `natesaninja/strengthledger` with GitHub Pages from `/` (root).  
`.nojekyll` is included so assets serve correctly.

## Disclaimer

Educational training and supplement information — **not medical advice**.
