@echo off
title Video Downloader - Camera Dahua
echo.
echo Kiem tra port 3456...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3456 "') do taskkill /F /PID %%a ^>nul 2^>^&1
timeout /t 1 /nobreak ^>nul
cd /d "%~dp0"
echo Dang khoi dong server...
echo.
node server.js
echo.
echo Server da tat! Nhan phim bat ky de dong.
pause