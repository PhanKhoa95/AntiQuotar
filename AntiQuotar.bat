@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "ROOT=%~dp0"
for %%I in ("%ROOT%.") do set "ROOT=%%~fI"

set "TOOLS_DIR=%ROOT%\tools"
set "REPORT_DIR=%ROOT%\reports"
set "LS_REPO=%TOOLS_DIR%\Antigravity-Tools-LS"
set "USAGE_REPO=%TOOLS_DIR%\antigravity-usage"
set "WATCHER_REPO=%TOOLS_DIR%\AntigravityQuotaWatcher"
set "LS_PORT=5188"
set "CONTROL_PORT=5173"

if /I "%~1"=="help" (
  call :help_text
  exit /b 0
)
if /I "%~1"=="check" (
  call :check_deps
  exit /b 0
)
if /I "%~1"=="sync" (
  call :sync_repos
  exit /b 0
)
if /I "%~1"=="usage" (
  call :usage_menu
  exit /b 0
)
if /I "%~1"=="quota" (
  call :call_usage quota --all
  exit /b 0
)
if /I "%~1"=="cms" (
  call :start_control_panel
  exit /b 0
)
if /I "%~1"=="control" (
  call :start_control_panel
  exit /b 0
)
if /I "%~1"=="ls" (
  call :start_ls_source
  exit /b 0
)
if /I "%~1"=="probe" (
  call :probe_ls
  exit /b 0
)
if /I "%~1"=="watcher" (
  call :build_watcher
  exit /b 0
)
if /I "%~1"=="health" (
  call :health_report
  exit /b 0
)
if /I "%~1"=="resonate" (
  call :resonate
  exit /b 0
)
if not "%~1"=="" (
  echo Unknown command: %~1
  echo.
  call :help_text
  exit /b 1
)

:menu
cls
call :banner
echo Workspace : %ROOT%
echo Tools     : %TOOLS_DIR%
echo LS port   : %LS_PORT%
echo.
echo  1. Resonance flow: sync + doctor + quota + LS probe
echo  2. Sync/update upstream repos
echo  3. Install/update antigravity-usage CLI
echo  4. Run antigravity-usage commands
echo  5. Start Antigravity Tools LS from source
echo  6. Probe/open LS dashboard
echo  7. Build/install Quota Watcher VSIX
echo  8. Write health report
echo  9. Install Antigravity Tools LS release app
echo  C. Open AntiQuotar Control CMS
echo  Q. Quit
echo.
choice /C 123456789CQ /N /M "Select an action: "
if errorlevel 11 goto end
if errorlevel 10 goto action_control
if errorlevel 9 goto action_install_ls_release
if errorlevel 8 goto action_health
if errorlevel 7 goto action_watcher
if errorlevel 6 goto action_probe
if errorlevel 5 goto action_ls
if errorlevel 4 goto action_usage
if errorlevel 3 goto action_install_usage
if errorlevel 2 goto action_sync
if errorlevel 1 goto action_resonate

:action_resonate
call :resonate
call :pause_screen
goto menu

:action_sync
call :sync_repos
call :pause_screen
goto menu

:action_install_usage
call :install_usage_global
call :pause_screen
goto menu

:action_usage
call :usage_menu
goto menu

:action_ls
call :start_ls_source
call :pause_screen
goto menu

:action_probe
call :probe_ls
echo.
call :confirm "Open http://127.0.0.1:%LS_PORT% in browser" DO_OPEN
if /I "!DO_OPEN!"=="Y" start "" "http://127.0.0.1:%LS_PORT%"
call :pause_screen
goto menu

:action_watcher
call :build_watcher
call :pause_screen
goto menu

:action_health
call :health_report
call :pause_screen
goto menu

:action_install_ls_release
call :install_ls_release
call :pause_screen
goto menu

:action_control
call :start_control_panel
call :pause_screen
goto menu

:end
echo Bye.
exit /b 0

:banner
echo ============================================================
echo  AntiQuotar - Antigravity quota resonance console
echo ============================================================
exit /b 0

:help_text
call :banner
echo.
echo Usage:
echo   AntiQuotar.bat             Open interactive menu
echo   AntiQuotar.bat check       Check local dependencies
echo   AntiQuotar.bat sync        Clone/update the three upstream repos
echo   AntiQuotar.bat usage       Open antigravity-usage submenu
echo   AntiQuotar.bat quota       Run antigravity-usage quota --all
echo   AntiQuotar.bat cms         Open the local Control CMS panel
echo   AntiQuotar.bat ls          Start Antigravity-Tools-LS from source
echo   AntiQuotar.bat probe       Probe the LS gateway on port %LS_PORT%
echo   AntiQuotar.bat watcher     Build/package Quota Watcher VSIX
echo   AntiQuotar.bat health      Write a local health report
echo   AntiQuotar.bat resonate    Run the combined flow
echo.
echo Upstream roles:
echo   Antigravity-Tools-LS       Local LS gateway and dashboard
echo   antigravity-usage          Quota CLI and account doctor
echo   AntigravityQuotaWatcher    IDE status bar/dashboard extension
exit /b 0

:pause_screen
echo.
pause
exit /b 0

:confirm
set "%~2=N"
set "_CONFIRM="
set /p "_CONFIRM=%~1 [y/N]: "
if /I "%_CONFIRM%"=="Y" set "%~2=Y"
exit /b 0

:ensure_dirs
if not exist "%TOOLS_DIR%" mkdir "%TOOLS_DIR%"
if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
exit /b 0

:show_cmd
for /f "delims=" %%P in ('where %~1 2^>nul') do (
  echo [OK]   %~1: %%P
  exit /b 0
)
echo [MISS] %~1
exit /b 1

:check_deps
call :banner
echo.
echo Core dependencies:
call :show_cmd git
call :show_cmd node
call :show_cmd npm
call :show_cmd npx
call :show_cmd powershell
call :show_cmd curl.exe
echo.
echo Optional dependencies:
call :show_cmd cargo
call :show_cmd 7z
call :show_cmd antigravity-usage
call :show_cmd antigravity
call :show_cmd code
echo.
echo Notes:
echo   - cargo is needed only for running Antigravity-Tools-LS from source.
echo   - 7z is recommended by Antigravity-Tools-LS for Windows asset sync.
echo   - antigravity/code CLI is needed only for automatic VSIX installation.
exit /b 0

:sync_repos
call :ensure_dirs
where git >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Git is required to sync upstream repos.
  exit /b 1
)
set "SYNC_FAILED=0"
call :sync_one "Antigravity-Tools-LS" "https://github.com/lbjlaq/Antigravity-Tools-LS.git" "%LS_REPO%"
if errorlevel 1 set "SYNC_FAILED=1"
call :sync_one "antigravity-usage" "https://github.com/skainguyen1412/antigravity-usage.git" "%USAGE_REPO%"
if errorlevel 1 set "SYNC_FAILED=1"
call :sync_one "AntigravityQuotaWatcher" "https://github.com/wusimpl/AntigravityQuotaWatcher.git" "%WATCHER_REPO%"
if errorlevel 1 set "SYNC_FAILED=1"
if "%SYNC_FAILED%"=="1" (
  echo.
  echo [WARN] One or more repos did not sync cleanly.
  exit /b 1
)
echo.
echo [OK] Upstream repos are ready.
exit /b 0

:sync_one
set "REPO_NAME=%~1"
set "REPO_URL=%~2"
set "REPO_PATH=%~3"
echo.
echo === %REPO_NAME% ===
if exist "%REPO_PATH%\.git" (
  git -C "%REPO_PATH%" pull --ff-only
  exit /b %ERRORLEVEL%
)
if exist "%REPO_PATH%" (
  echo [WARN] Path exists but is not a git repo:
  echo        %REPO_PATH%
  echo        Rename or remove it if you want this script to clone fresh.
  exit /b 1
)
git clone --depth 1 "%REPO_URL%" "%REPO_PATH%"
exit /b %ERRORLEVEL%

:resolve_usage_cmd
where antigravity-usage >nul 2>nul
if not errorlevel 1 (
  set "USAGE_CMD=antigravity-usage"
  exit /b 0
)
where npx >nul 2>nul
if not errorlevel 1 (
  set "USAGE_CMD=npx -y antigravity-usage@latest"
  exit /b 0
)
echo [ERROR] antigravity-usage is not installed and npx was not found.
echo         Install Node.js 18+ and run option 3.
exit /b 1

:call_usage
call :resolve_usage_cmd
if errorlevel 1 exit /b 1
echo.
echo ^> %USAGE_CMD% %*
%USAGE_CMD% %*
exit /b %ERRORLEVEL%

:install_usage_global
where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm was not found. Install Node.js 18+ first.
  exit /b 1
)
call :confirm "Install/update antigravity-usage globally with npm" DO_NPM
if /I not "%DO_NPM%"=="Y" (
  echo Skipped.
  exit /b 0
)
npm install -g antigravity-usage@latest
if errorlevel 1 exit /b %ERRORLEVEL%
echo.
antigravity-usage --version
exit /b 0

:usage_menu
cls
call :banner
echo.
echo antigravity-usage commands
echo.
echo  1. quota
echo  2. quota --all
echo  3. quota --all --refresh
echo  4. doctor
echo  5. status
echo  6. accounts list
echo  7. login
echo  B. Back
echo.
choice /C 1234567B /N /M "Select a command: "
if errorlevel 8 exit /b 0
if errorlevel 7 goto usage_login
if errorlevel 6 goto usage_accounts
if errorlevel 5 goto usage_status
if errorlevel 4 goto usage_doctor
if errorlevel 3 goto usage_quota_refresh
if errorlevel 2 goto usage_quota_all
if errorlevel 1 goto usage_quota

:usage_login
call :call_usage login
call :pause_screen
goto usage_menu

:usage_accounts
call :call_usage accounts list
call :pause_screen
goto usage_menu

:usage_status
call :call_usage status
call :pause_screen
goto usage_menu

:usage_doctor
call :call_usage doctor
call :pause_screen
goto usage_menu

:usage_quota_refresh
call :call_usage quota --all --refresh
call :pause_screen
goto usage_menu

:usage_quota_all
call :call_usage quota --all
call :pause_screen
goto usage_menu

:usage_quota
call :call_usage quota
call :pause_screen
goto usage_menu

:start_ls_source
if not exist "%LS_REPO%\Cargo.toml" (
  echo [INFO] Antigravity-Tools-LS repo is missing. Syncing first.
  call :sync_repos
)
if not exist "%LS_REPO%\Cargo.toml" (
  echo [ERROR] Antigravity-Tools-LS source is not available.
  exit /b 1
)
where cargo >nul 2>nul
if errorlevel 1 (
  echo [ERROR] cargo was not found. Install Rust, or use option 9 to install the release app.
  exit /b 1
)
if /I not "%~1"=="no-prompt" (
  call :confirm "Start Antigravity-Tools-LS from source on port %LS_PORT%" DO_START_LS
  if /I not "!DO_START_LS!"=="Y" (
    echo Skipped.
    exit /b 0
  )
)
echo.
echo Starting LS gateway in a new terminal window...
start "Antigravity Tools LS :%LS_PORT%" cmd /k "cd /d ""%LS_REPO%"" && set ""PORT=%LS_PORT%"" && set ""RUST_LOG=info"" && cargo run --bin cli-server"
echo Give it a moment, then use option 6 to probe the dashboard.
exit /b 0

:install_ls_release
if not exist "%LS_REPO%\install.ps1" (
  echo [INFO] Antigravity-Tools-LS repo is missing. Syncing first.
  call :sync_repos
)
if not exist "%LS_REPO%\install.ps1" (
  echo [ERROR] install.ps1 was not found.
  exit /b 1
)
call :confirm "Run Antigravity-Tools-LS install.ps1 release installer" DO_INSTALL_LS
if /I not "%DO_INSTALL_LS%"=="Y" (
  echo Skipped.
  exit /b 0
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%LS_REPO%\install.ps1"
exit /b %ERRORLEVEL%

:start_control_panel
if not exist "%ROOT%\package.json" (
  echo [ERROR] package.json was not found. Control CMS app is not available.
  exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm was not found. Install Node.js 18+ first.
  exit /b 1
)
if not exist "%ROOT%\node_modules" (
  call :confirm "Install Control CMS dependencies with npm install" DO_CONTROL_NPM
  if /I not "!DO_CONTROL_NPM!"=="Y" (
    echo Skipped.
    exit /b 0
  )
  npm install
  if errorlevel 1 exit /b %ERRORLEVEL%
)
echo.
echo Starting AntiQuotar Control CMS on http://127.0.0.1:%CONTROL_PORT% ...
start "AntiQuotar Control CMS :%CONTROL_PORT%" cmd /k "cd /d ""%ROOT%"" && npm run dev -- --host 127.0.0.1 --port %CONTROL_PORT%"
echo Starting Quota Bridge Server on http://127.0.0.1:5188 ...
start "AntiQuotar Quota Bridge :5188" cmd /k "cd /d ""%ROOT%"" && node tools/local-bridge.js"
timeout /t 3 /nobreak >nul
start "" "http://127.0.0.1:%CONTROL_PORT%"
exit /b 0

:probe_ls
echo.
echo Probing Antigravity-Tools-LS on http://127.0.0.1:%LS_PORT% ...
where curl.exe >nul 2>nul
if errorlevel 1 (
  echo [ERROR] curl.exe was not found.
  exit /b 1
)
echo.
echo GET /v1/provision/status
curl.exe -m 8 -fsS "http://127.0.0.1:%LS_PORT%/v1/provision/status"
if errorlevel 1 (
  echo.
  echo [WARN] LS gateway did not respond on port %LS_PORT%.
  echo        Start it with option 5, or change LS_PORT near the top of this file.
  exit /b 1
)
echo.
echo.
echo [OK] LS gateway is reachable.
exit /b 0

:build_watcher
if not exist "%WATCHER_REPO%\package.json" (
  echo [INFO] Quota Watcher repo is missing. Syncing first.
  call :sync_repos
)
if not exist "%WATCHER_REPO%\package.json" (
  echo [ERROR] Quota Watcher source is not available.
  exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm was not found. Install Node.js first.
  exit /b 1
)
call :confirm "Build Quota Watcher VSIX (runs npm install/compile/package)" DO_WATCHER
if /I not "%DO_WATCHER%"=="Y" (
  echo Skipped.
  exit /b 0
)
pushd "%WATCHER_REPO%"
powershell -NoProfile -ExecutionPolicy Bypass -File ".\build.ps1"
set "WATCHER_BUILD_RC=%ERRORLEVEL%"
popd
if not "%WATCHER_BUILD_RC%"=="0" (
  echo [ERROR] Watcher build failed.
  exit /b %WATCHER_BUILD_RC%
)
call :find_latest_vsix
if not defined LATEST_VSIX (
  echo [WARN] Build finished, but no VSIX file was found.
  exit /b 0
)
echo.
echo Latest VSIX:
echo   %LATEST_VSIX%
echo.
echo IDE CLI candidates found on PATH:
for %%C in (antigravity code code-insiders codium cursor windsurf) do (
  where %%C >nul 2>nul
  if not errorlevel 1 echo   %%C
)
echo.
set "IDE_CLI="
set /p "IDE_CLI=Type an IDE CLI to install the VSIX, or press Enter to skip: "
if "%IDE_CLI%"=="" (
  echo Skipped VSIX installation.
  exit /b 0
)
%IDE_CLI% --install-extension "%LATEST_VSIX%"
exit /b %ERRORLEVEL%

:find_latest_vsix
set "LATEST_VSIX="
for /f "delims=" %%F in ('dir /b /a:-d /o:-d "%WATCHER_REPO%\*.vsix" 2^>nul') do (
  if not defined LATEST_VSIX set "LATEST_VSIX=%WATCHER_REPO%\%%F"
)
exit /b 0

:health_report
call :ensure_dirs
for /f "delims=" %%T in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss" 2^>nul') do set "STAMP=%%T"
if not defined STAMP set "STAMP=%RANDOM%"
set "REPORT=%REPORT_DIR%\antiquotar-health-%STAMP%.txt"
echo Writing health report:
echo   %REPORT%
(
  echo AntiQuotar health report
  echo Date: %DATE% %TIME%
  echo Workspace: %ROOT%
  echo Tools: %TOOLS_DIR%
  echo LS port: %LS_PORT%
) > "%REPORT%"
echo.>> "%REPORT%"
echo [Dependencies]>> "%REPORT%"
for %%C in (git node npm npx powershell curl.exe cargo 7z antigravity-usage antigravity code) do (
  echo.>> "%REPORT%"
  echo $ where %%C>> "%REPORT%"
  where %%C >> "%REPORT%" 2>&1
)
echo.>> "%REPORT%"
echo [Upstream repo status]>> "%REPORT%"
for %%R in ("%LS_REPO%" "%USAGE_REPO%" "%WATCHER_REPO%") do (
  echo.>> "%REPORT%"
  echo %%~fR>> "%REPORT%"
  if exist "%%~fR\.git" (
    git -C "%%~fR" status --short >> "%REPORT%" 2>&1
    git -C "%%~fR" log -1 --oneline >> "%REPORT%" 2>&1
  ) else (
    echo Missing or not a git repo.>> "%REPORT%"
  )
)
echo.>> "%REPORT%"
echo [antigravity-usage]>> "%REPORT%"
where antigravity-usage >nul 2>nul
if errorlevel 1 (
  echo antigravity-usage is not globally installed.>> "%REPORT%"
) else (
  antigravity-usage --version >> "%REPORT%" 2>&1
  antigravity-usage doctor >> "%REPORT%" 2>&1
  antigravity-usage quota --all --json >> "%REPORT%" 2>&1
)
echo.>> "%REPORT%"
echo [LS probe]>> "%REPORT%"
where curl.exe >nul 2>nul
if errorlevel 1 (
  echo curl.exe not found.>> "%REPORT%"
) else (
  curl.exe -m 8 -fsS "http://127.0.0.1:%LS_PORT%/v1/provision/status" >> "%REPORT%" 2>&1
)
echo.
echo [OK] Report written.
exit /b 0

:resonate
call :banner
echo.
echo Resonance flow:
echo   1. Sync upstream repos
echo   2. Check local dependency surface
echo   3. Run antigravity-usage doctor and quota
echo   4. Probe Antigravity-Tools-LS
echo   5. Write a health report
echo.
call :sync_repos
echo.
call :check_deps
echo.
call :call_usage doctor
echo.
call :call_usage quota --all
echo.
call :probe_ls
if errorlevel 1 (
  echo.
  call :confirm "LS is not reachable. Start source server in a new terminal" DO_RESONATE_LS
  if /I "!DO_RESONATE_LS!"=="Y" (
    call :start_ls_source no-prompt
    echo Waiting for server startup...
    timeout /t 8 /nobreak >nul
    call :probe_ls
  )
)
echo.
call :health_report
echo.
call :confirm "Open LS dashboard in browser" DO_RESONATE_OPEN
if /I "!DO_RESONATE_OPEN!"=="Y" start "" "http://127.0.0.1:%LS_PORT%"
exit /b 0
