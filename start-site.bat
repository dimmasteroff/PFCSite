@echo off
setlocal EnableDelayedExpansion

cd /d "%~dp0"

set PORT=8000
set ALT_PORT=8080

where python >nul 2>&1
if %errorlevel%==0 (
  set "PY_CMD=python"
) else (
  where py >nul 2>&1
  if %errorlevel%==0 (
    set "PY_CMD=py"
  ) else (
    echo [ERROR] Python launcher not found.
    echo Install Python from https://www.python.org/downloads/
    pause
    exit /b 1
  )
)

set "USE_PORT=%PORT%"
netstat -ano | findstr /R /C:":%PORT% .*LISTENING" >nul 2>&1
if %errorlevel%==0 (
  set "USE_PORT=%ALT_PORT%"
  netstat -ano | findstr /R /C:":%ALT_PORT% .*LISTENING" >nul 2>&1
  if %errorlevel%==0 (
    echo [ERROR] Ports %PORT% and %ALT_PORT% are busy. Close them and retry.
    pause
    exit /b 1
  )
)

set "SITE_URL=http://localhost:!USE_PORT!/public/index.html"
echo =====================================================
echo RFL local server will run at:
echo !SITE_URL!
echo Keep the "RFL Local Server" window open while using the site.
echo =====================================================

start "RFL Local Server" cmd /k "%PY_CMD% -m http.server !USE_PORT!"

for /L %%i in (1,1,10) do (
  timeout /t 1 /nobreak >nul
  powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:!USE_PORT!/' -TimeoutSec 1; if($r.StatusCode -ge 200){ exit 0 } else { exit 1 } } catch { exit 1 }"
  if !errorlevel! EQU 0 goto :open
)

echo [WARNING] Server did not respond in 10 seconds.
echo Open manually: !SITE_URL!
pause
exit /b 1

:open
start "" "!SITE_URL!"
echo Browser opened: !SITE_URL!
exit /b 0
