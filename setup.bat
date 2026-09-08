@echo off
TITLE OpenOutreach AI - Setup Environment
COLOR 0A
echo ======================================================================
echo                 OpenOutreach AI - Setup & Installation
echo ======================================================================
echo.

REM 1. Check if .env exists, if not create from .env.example
if not exist ".env" (
    if exist ".env.example" (
        echo [*] Creating .env from .env.example...
        copy .env.example .env
    ) else (
        echo [*] Creating default .env configuration file...
        (
            echo DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/openoutreach
            echo DB_HOST=localhost
            echo DB_PORT=5432
            echo DB_NAME=openoutreach
            echo DB_USER=postgres
            echo DB_PASSWORD=postgres
            echo.
            echo AI_API_KEY=
            echo AI_MODEL=openai:gpt-4o-mini
            echo VITE_API_BASE_URL=http://localhost:8000
            echo.
            echo APOLLO_API_KEY=
            echo APOLLO_BASE_URL=https://api.apollo.io/v1
            echo APOLLO_ENABLED=true
            echo LEAD_PROVIDER=apollo
            echo LEAD_DISCOVERY_PAGE_SIZE=25
            echo LEAD_DISCOVERY_MAX_RESULTS=100
        ) > .env
    )
    echo [v] Environment configuration file .env ready.
) else (
    echo [v] Found existing .env file.
)
echo.

REM 2. Check Python virtual environment
if not exist ".venv\Scripts\python.exe" (
    echo [*] Creating Python virtual environment in .venv...
    python -m venv .venv
    if errorlevel 1 (
        echo [X] ERROR: Failed to create Python virtual environment. Ensure Python 3.10+ is installed.
        pause
        exit /b 1
    )
    echo [v] Virtual environment created successfully.
) else (
    echo [v] Virtual environment .venv exists.
)
echo.

REM 3. Install Backend Dependencies
echo [*] Installing Python backend dependencies...
.venv\Scripts\python.exe -m pip install --upgrade pip
if exist "requirements.txt" (
    .venv\Scripts\python.exe -m pip install -r requirements.txt
)
if exist "requirements\dev.txt" (
    .venv\Scripts\python.exe -m pip install -r requirements\dev.txt
)
echo [v] Backend dependencies installed.
echo.

REM 4. Install Frontend Dependencies
echo [*] Installing Frontend npm packages...
if exist "frontend\package.json" (
    call npm --prefix frontend install
    echo [v] Frontend dependencies installed.
) else (
    echo [!] Warning: frontend\package.json not found.
)
echo.

REM 5. Initialize PostgreSQL Database & Tables
echo [*] Initializing PostgreSQL database schema...
.venv\Scripts\python.exe -c "try: from backend.app.core.database import init_db; init_db(); print('[v] Database tables and schema migrations applied successfully.'); except Exception as e: print('[!] Database init note:', e)"
echo.

echo ======================================================================
echo            Setup Completed Successfully!
echo ======================================================================
echo You can now run 'start.bat' to launch OpenOutreach AI.
echo.
pause
