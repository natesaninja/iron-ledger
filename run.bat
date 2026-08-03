@echo off
cd /d "%~dp0"
echo.
echo  StrengthLedger — open in browser
echo  http://127.0.0.1:8765
echo.
echo  Phone: use your PC IP on the same Wi‑Fi, or deploy like MacroLedger.
echo  iPhone: Safari → Share → Add to Home Screen
echo.
where py >nul 2>&1 && (
  start http://127.0.0.1:8765/
  py -3 -m http.server 8765
  goto :eof
)
where python >nul 2>&1 && (
  start http://127.0.0.1:8765/
  python -m http.server 8765
  goto :eof
)
echo Python not found. Open index.html in a browser, or install Python.
pause
