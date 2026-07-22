@echo off
rem ReimburseMe launcher — installs/builds on first run, then starts the server.
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Get it from https://nodejs.org first.
  pause
  exit /b 1
)

if not exist node_modules (
  echo First run: installing dependencies ^(a few minutes^)...
  call npm install
  if errorlevel 1 ( echo npm install failed. & pause & exit /b 1 )
)

if not exist .next (
  echo First run: building the app...
  call npm run build
  if errorlevel 1 ( echo Build failed. & pause & exit /b 1 )
)

set IP=
for /f %%i in ('powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 -PrefixOrigin Dhcp | Select-Object -First 1).IPAddress"') do set IP=%%i

echo.
echo ============================================
echo  ReimburseMe is starting.
echo  On this PC:    http://localhost:3000
if defined IP echo  On your phone: http://%IP%:3000  ^(same Wi-Fi^)
echo  Keep this window open. Close it to stop.
echo ============================================
echo.
call npm run start
pause
