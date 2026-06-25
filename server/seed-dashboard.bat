@echo off
title O'Apps POS - Seed Dashboard Demo
cd /d "%~dp0"
echo.
echo Memasukkan data demo untuk dashboard karyawan...
echo.
node scripts/seed-dashboard-demo.mjs %*
echo.
pause
