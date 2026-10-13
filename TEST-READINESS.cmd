@echo off
setlocal
title IELTS Lab - Local Readiness Test
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\test-readiness.ps1" %*
set "readiness_exit=%ERRORLEVEL%"
echo.
if not "%readiness_exit%"=="0" echo The test did not start or finish successfully. Read the error above.
if /i not "%~1"=="-Smoke" pause
exit /b %readiness_exit%
