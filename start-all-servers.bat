@echo off
echo.
echo ========================================
echo   Starting MediaKeepa...
echo ========================================
echo.

REM Start Backend (Python Flask - Port 8000)
cd /d "%~dp0"
start "MediaKeepa-Backend" cmd /k "python server.py"

REM Wait 2 seconds for backend to initialize
timeout /t 2 /nobreak >nul

REM Start Frontend (Vite - Port 5000)
cd /d "%~dp0\spark-template"
start "MediaKeepa-Frontend" cmd /k "npm run dev"

echo.
echo ✓ Backend:  http://127.0.0.1:8000
echo ✓ Frontend: http://localhost:5000
echo.
echo Both servers are starting in separate windows!
echo.
