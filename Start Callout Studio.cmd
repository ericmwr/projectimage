@echo off
title Callout Studio - close this window to stop
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install the LTS version from https://nodejs.org and try again.
  pause
  exit /b 1
)

if not exist node_modules (
  echo First start: installing the parts Callout Studio needs. This takes a few minutes...
  call npm install
  if errorlevel 1 (
    echo Installing failed. See the messages above.
    pause
    exit /b 1
  )
)

echo Starting Callout Studio...
call npm run page --silent
echo.
echo Callout Studio has stopped.
pause
