@echo off
TITLE OpenOutreach AI - Launch Services
COLOR 0B
echo ======================================================================
echo                 OpenOutreach AI - Starting System
echo ======================================================================
echo.

REM 1. Validate Setup
if not exist ".venv\Scripts\python.exe" (
    echo [X] ERROR: Python virtual environment not found. Please run 'setup.bat' first.
    pause
    exit /b 1
)

if not exist ".env" (
    echo [X] ERROR: .env configuration file not found. Please run 'setup.bat' first.
    pause
    exit /b 1
)

REM 2. Ensure PostgreSQL Database is running on port 5432
echo [*] Checking PostgreSQL Database status...
powershell -Command "$s = New-Object System.Net.Sockets.TcpClient; try { $s.Connect('127.0.0.1', 5432); exit 0 } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
    echo [*] Starting PostgreSQL 18 database server...
    start "PostgreSQL 18 Database" cmd /k "set PATH=C:\Program Files\PostgreSQL\18\bin;C:\Program Files\PostgreSQL\18\pgAdmin 4\runtime;%%PATH%% && ""C:\Program Files\PostgreSQL\18\bin\postgres.exe"" -D ""C:\Program Files\PostgreSQL\18\data"""
    timeout /t 3 >nul
) else (
    echo [v] PostgreSQL database server is active on port 5432.
)
echo.

REM 3. Launch Backend FastAPI Server
echo [*] Launching FastAPI Backend Server on port 8000...
start "OpenOutreach Backend API (Port 8000)" cmd /k ".venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload"

REM 4. Launch Frontend React Server
echo [*] Launching React Vite Frontend UI on port 5173...
start "OpenOutreach React Frontend (Port 5173)" cmd /k "npm --prefix frontend run dev"

echo.
echo ======================================================================
echo           OpenOutreach AI Services Launched Successfully!
echo ======================================================================
echo.
echo  [+] Web UI Dashboard:      http://localhost:5173
echo  [+] Backend API Root:      http://127.0.0.1:8000
echo  [+] Interactive API Docs:  http://127.0.0.1:8000/docs
echo  [+] Provider Health Check: http://127.0.0.1:8000/api/v1/lead-provider/health
echo.
echo  To stop all services cleanly, run 'stop.bat' or close the terminal windows.
echo ======================================================================
echo.
pause
