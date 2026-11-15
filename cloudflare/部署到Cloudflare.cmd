@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
where.exe node.exe >nul 2>nul
if errorlevel 1 goto missing_node
where.exe npm.cmd >nul 2>nul
if errorlevel 1 goto missing_node
node.exe -e "process.exit(Number(process.versions.node.split('.')[0]) >= 22 ? 0 : 1)"
if errorlevel 1 goto missing_node
if not exist "node_modules\wrangler\package.json" (
  call npm.cmd ci --include=dev
  if errorlevel 1 goto failed
)
call npm.cmd run deploy:cloudflare
if errorlevel 1 goto failed
goto done
:missing_node
echo.
echo Please install Node.js 22 LTS or newer, then run this file again.
echo Download: https://nodejs.org/
goto failed
:failed
echo.
echo The operation failed. Please keep this window open to read the error above.
pause
exit /b 1
:done
pause
exit /b 0
