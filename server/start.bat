@echo off
title O'Apps POS - Backend Server
cd /d "%~dp0"
echo.
echo ========================================
echo   Backend API - port 3001
echo   Biarkan jendela ini tetap terbuka.
echo ========================================
echo.
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
  echo Port 3001 masih dipakai PID %%a, menghentikan...
  taskkill /PID %%a /F >nul 2>&1
)
echo.
npm run dev
pause
