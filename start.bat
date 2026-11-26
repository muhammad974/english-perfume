@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Please install the LTS version from https://nodejs.org and run this file again.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Installing, please wait...
  call npm install --omit=dev
)
echo.
echo If this is your first start you will be asked to choose an admin password.
echo Forgot the password later? Run reset-admin-password.bat
echo Starting English Perfume...  (close this window to stop the server)
node server.js
pause
