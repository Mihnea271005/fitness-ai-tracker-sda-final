@echo off
title Fitness App - Phone App (Step 2)
cd /d D:\Projects\fitness-ai-tracker-sda-final\mobile
echo.
echo Starting the fitness app for your phone...
echo In a moment, a QR code (a square barcode) will appear below.
echo.
echo On your phone: open the "Expo Go" app (or your Camera app),
echo then point it at the QR code on this screen.
echo.
echo IMPORTANT: Leave this window open while using the app.
echo.
call npx.cmd expo start
echo.
echo The app has stopped. Press any key to close this window.
pause >nul
