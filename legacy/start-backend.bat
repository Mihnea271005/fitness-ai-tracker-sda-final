@echo off
title Fitness App - Server (Step 1)
cd /d D:\Projects\fitness-ai-tracker-sda-final
echo.
echo Starting the fitness app server...
echo Please wait until you see a line that says "Application startup complete".
echo.
echo IMPORTANT: Leave this window open while using the app.
echo You can minimize it, but do not close it.
echo.
python -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
echo.
echo The server has stopped. Press any key to close this window.
pause >nul
