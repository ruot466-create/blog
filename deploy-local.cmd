@echo off
cd /d "%~dp0"
title Deploy Blog (local build)
echo ================================
echo    Local build + deploy
echo ================================
echo.
echo [1/3] Building (about 1 min)...
call pnpm build
if errorlevel 1 goto error
echo.
echo [2/3] Deploying to Cloudflare...
call npx --yes wrangler@latest deploy
if errorlevel 1 goto error
echo.
echo [3/3] Syncing source to GitHub...
git add -A
git commit -m "update: site content" >nul 2>&1
git push
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
