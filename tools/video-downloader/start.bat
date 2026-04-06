@echo off
title Video Downloader - Camera Dahua
echo.
echo  Starting Video Downloader...
echo.
cd /d "%~dp0"
node server.js
pause
