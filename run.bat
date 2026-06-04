@echo off
:: =====================================================================
:: RAG LLM Development Services Runner
:: Placed at c:\Work\rag-llm\run.bat
:: Runs both Backend (venv) and Frontend in separate windows
:: =====================================================================

title RAG LLM Startup Manager
color 0E
cls

echo =====================================================================
echo                 RAG LLM - Local Development Runner
echo =====================================================================
echo.
echo  [*] Preparing to launch services...
echo.

:: 1. Launch Backend Service
echo  [+] [1/2] Starting Backend in a new window...
echo      - Path: "%~dp0backend"
echo      - Env:  venv
echo      - Cmd:  python -m app.main
start "RAG LLM Backend Server" cmd /k "cd /d "%~dp0backend" && echo ========================================== && echo     RAG LLM Backend - Virtual Environment && echo ========================================== && echo. && echo [*] Activating venv... && call venv\Scripts\activate && echo [*] Starting Python app.main... && python -m app.main"

timeout /t 2 /nobreak >nul

:: 2. Launch Frontend Service
echo.
echo  [+] [2/2] Starting Frontend in a new window...
echo      - Path: "%~dp0frontend"
echo      - Cmd:  npm run dev
start "RAG LLM Frontend Dev Server" cmd /k "cd /d "%~dp0frontend" && echo ========================================== && echo     RAG LLM Frontend - Dev Server && echo ========================================== && echo. && echo [*] Starting npm run dev... && npm run dev"

echo.
echo =====================================================================
echo  [SUCCESS] Both Backend and Frontend have been launched!
echo          - Look at the new command prompt windows for logs.
echo =====================================================================
echo.
echo Press any key to close this manager window...
pause >nul
