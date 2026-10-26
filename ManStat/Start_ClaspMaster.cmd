@echo off
title ClaspMaster Control Center
cd /d "%~dp0"

if not exist "%~dp0ClaspMaster.ps1" (
    echo [ERROR] Cannot find ClaspMaster.ps1 in: %~dp0
    echo Please check the file name!
    pause
    exit /b
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0ClaspMaster.ps1"

if %errorLevel% neq 0 (
    echo.
    echo [CRASH DETECTED] PowerShell exited with error code %errorLevel%.
    pause
)