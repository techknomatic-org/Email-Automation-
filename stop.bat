@echo off
TITLE OpenOutreach AI - Stop System
COLOR 0C
echo ======================================================================
echo                 OpenOutreach AI - Stopping System
echo ======================================================================
echo.

echo [*] Terminating Backend process on port 8000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do (
    taskkill /f /pid %%a >nul 2>&1
)

echo [*] Terminating Frontend process on port 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do (
    taskkill /f /pid %%a >nul 2>&1
)

REM Kill by window titles if present
taskkill /fi "WINDOWTITLE eq OpenOutreach Backend API*" /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq OpenOutreach React Frontend*" /f >nul 2>&1

echo.
echo ======================================================================
echo           All OpenOutreach AI Services Have Been Stopped.
echo ======================================================================
echo.
pause
