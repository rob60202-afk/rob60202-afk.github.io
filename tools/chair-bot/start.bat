@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 椅子搶購小幫手

where node >nul 2>nul
if errorlevel 1 goto nonode
if not exist node_modules goto install
goto menu

:nonode
echo 找不到 Node.js，請先到 https://nodejs.org 下載 LTS 版安裝，裝完重新開機後再雙擊一次 start.bat。
pause
exit /b

:install
echo 第一次使用，正在安裝必要元件，約 2 到 5 分鐘，請稍候...
call npm install
if errorlevel 1 goto installfail
goto menu

:installfail
echo 安裝失敗，請把這個視窗截圖給 Claude。
pause
exit /b

:menu
echo.
echo ========== 選擇場次 ==========
echo  1. 11/2   11:00  B100 岩霧灰
echo  2. 11/2   23:00  B100 曜石黑
echo  3. 11/9   11:00  S100 沐雲白
echo  4. 11/9   23:00  S100 曜石黑
echo  5. 11/11  11:00  C300 二代 Pro 沐雲白
echo  6. 11/11  23:00  C300 二代 Pro 曜石黑
echo  0. 離開
set "T="
set /p T=請輸入編號後按 Enter：
if "%T%"=="0" exit /b
set "F="
if "%T%"=="1" set "F=1102-1100-b100-gray"
if "%T%"=="2" set "F=1102-2300-b100-black"
if "%T%"=="3" set "F=1109-1100-s100-white"
if "%T%"=="4" set "F=1109-2300-s100-black"
if "%T%"=="5" set "F=1111-1100-c300-white"
if "%T%"=="6" set "F=1111-2300-c300-black"
if not defined F goto menu

echo.
echo ========== 選擇動作 ==========
echo  L. 登入會員：第一次必做，登入完成後關掉瀏覽器
echo  C. 檢查：確認按鈕抓不抓得到，不會下單
echo  R. 開始搶購：開賣前 10 分鐘執行
set "A="
set /p A=請輸入 L / C / R 後按 Enter：
set "CMD="
if /i "%A%"=="L" set "CMD=login"
if /i "%A%"=="C" set "CMD=check"
if /i "%A%"=="R" set "CMD=run"
if not defined CMD goto menu

node bot.js %CMD% "targets\%F%.json"
echo.
pause
goto menu
