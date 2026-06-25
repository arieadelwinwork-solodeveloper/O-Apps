@echo off
title O'Apps POS - Seed Inventori Demo
cd /d "%~dp0"
echo.
echo Memasukkan data demo inventori untuk dashboard...
echo.
node scripts/seed-inventory-demo.mjs %*
echo.
pause
