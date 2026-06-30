@echo off
title O'Apps POS - Frontend Dev Server
cd /d "%~dp0"
echo.
echo ========================================
echo   Frontend Vite - port 5181
echo   Buka http://localhost:5181 di browser
echo   Biarkan jendela ini tetap terbuka.
echo ========================================
echo.
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5181 ^| findstr LISTENING') do (
  echo Port 5181 masih dipakai PID %%a, menghentikan...
  taskkill /PID %%a /F >nul 2>&1
)
echo.
if not exist "node_modules\" (
  echo node_modules belum ada, menjalankan npm install...
  call npm install
  if errorlevel 1 (
    echo npm install gagal.
    pause
    exit /b 1
  )
  echo.
)
npm run dev
pause
