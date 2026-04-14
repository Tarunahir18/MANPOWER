@echo off
cd /d "%~dp0backend"
if not exist node_modules (
  echo Installing backend packages...
  npm install
)
echo Starting server...
node server.js
pause
