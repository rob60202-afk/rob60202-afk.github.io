@echo off
cd /d "%~dp0"
title Chair Bot

if not exist "%~dp0package.json" goto notextracted
where node >nul 2>nul
if errorlevel 1 goto nonode
if not exist "%~dp0node_modules\playwright" goto install
goto run

:notextracted
echo.
echo [ERROR] Please EXTRACT the ZIP file first.
echo Right-click the ZIP file, choose "Extract All", then open the
echo extracted tools\chair-bot folder and double-click start.bat there.
echo.
pause
exit /b

:nonode
echo.
echo [ERROR] Node.js not found. Install the LTS version from https://nodejs.org
echo then restart the PC and double-click start.bat again.
echo.
pause
exit /b

:install
echo First run: installing components, please wait 2-5 minutes...
call npm install
if errorlevel 1 goto installfail
goto run

:installfail
echo.
echo [ERROR] Install failed. Please send a screenshot of this window to Claude.
echo.
pause
exit /b

:run
node menu.js
pause
