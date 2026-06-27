@echo off
echo Stopping AntiQuotar background processes...

rem Kill process on port 5173 (Vite CMS)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do (
    echo Killing process %%a on port 5173...
    taskkill /F /PID %%a >nul 2>&1
)

rem Kill process on port 5188 (Local Quota Bridge)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5188 ^| findstr LISTENING') do (
    echo Killing process %%a on port 5188...
    taskkill /F /PID %%a >nul 2>&1
)

echo Done! AntiQuotar background processes stopped.
timeout /t 3 >nul
