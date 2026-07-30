@echo off
setlocal
cd /d "%~dp0"

start "Roy's V2" /min cmd /c "npm.cmd run dev -- --host 127.0.0.1 --port 4173 --strictPort"
ping 127.0.0.1 -n 4 >nul
start "" "http://127.0.0.1:4173/"

endlocal
