@echo off
cd /d "%~dp0"
title Publish Blog
echo ================================
echo    Publish Blog
echo ================================
echo.
echo [1/2] Saving changes...
git add -A
git commit -m "update: site content" >nul 2>&1
echo [2/2] Pushing to GitHub...
git push
if errorlevel 1 goto error
echo.
echo ================================
echo    Pushed!
echo.
echo    GitHub is building now (~40s).
echo    Refresh in a minute:
echo    https://ruoruo.ruot466.workers.dev
echo ================================
if not "%1"=="nopause" pause
exit /b 0
:error
echo.
echo *** PUSH FAILED ***
echo Check your network first. If it keeps failing,
echo run deploy-local.cmd instead.
if not "%1"=="nopause" pause
exit /b 1
