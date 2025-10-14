@echo off
title Flask Server - Martmake.com (Auto-Restart)
color 0A
echo ========================================
echo  FLASK SERVER - AUTO RESTART ENABLED
echo  Site: https://martmake.com
echo  Local: http://localhost:5000
echo ========================================
echo.
echo Starting server... Press Ctrl+C to stop
echo.

:start
python server.py
echo.
echo [WARNING] Server crashed! Restarting in 3 seconds...
echo Press Ctrl+C now to stop auto-restart
timeout /t 3 /nobreak >nul
goto start
