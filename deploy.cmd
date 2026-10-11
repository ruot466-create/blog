@echo off
cd /d "%~dp0"
title Update Blog
echo ================================
echo    Build and deploy blog
echo ================================
echo.
echo [1/2] Building (about 1 min)...
call pnpm build
if errorlevel 1 goto error
echo.
echo [2/2] Deploying to Cloudflare...
call npx --yes wrangler@latest deploy
if errorlevel 1 goto error
echo.
echo ================================
echo    DONE: https://ruoruo.ruot466.workers.dev
echo ================================
if not "%1"=="nopause" pause
exit /b 0
:error
echo.
echo *** FAILED ***
echo Send the error above to the AI.
if not "%1"=="nopause" pause
exit /b 1
