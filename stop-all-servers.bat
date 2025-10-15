@echo off
echo.
echo ========================================
echo   Stopping MediaKeepa...
echo ========================================
echo.

REM Stop Backend
taskkill /FI "WindowTitle eq MediaKeepa-Backend*" /T /F 2>nul
if %errorlevel% equ 0 (echo ✓ Backend stopped) else (echo ✗ Backend not running)

REM Stop Frontend
taskkill /FI "WindowTitle eq MediaKeepa-Frontend*" /T /F 2>nul
if %errorlevel% equ 0 (echo ✓ Frontend stopped) else (echo ✗ Frontend not running)

echo.
echo All servers stopped!
echo.
