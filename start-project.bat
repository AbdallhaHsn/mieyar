@echo off
setlocal
cd /d "%~dp0"
title Al-Roban ERP

set PATH=C:\Program Files\dotnet;%PATH%
set DOTNET_ROOT=C:\Program Files\dotnet

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-all.ps1" %*
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Encountered an issue while running startup script.
    pause
)