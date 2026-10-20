@echo off
chcp 65001 >nul
title Tom and Jerry: Katta Uy
cd /d "%~dp0"
where python >nul 2>nul
if errorlevel 1 (
  echo Python topilmadi. https://www.python.org/downloads/ dan o'rnating.
  pause
  exit /b
)
echo O'yin ochilmoqda: http://localhost:8765
echo Yopish uchun shu oynani yoping.
python server.py 8765 --open
pause
