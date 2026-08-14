@echo off
setlocal
cd /d "%~dp0"

echo Abrindo a versao estavel da Roy's V2...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-stable-preview.ps1"
if errorlevel 1 (
  echo.
  echo Nao foi possivel abrir o app. Veja a mensagem acima.
  pause
  exit /b 1
)

endlocal