@echo off
cd /d "%~dp0"
echo Starting HandForge dev server (first start can take a few minutes)...
call npx iwsdk dev down > dev-log.txt 2>&1
call npx iwsdk dev restart --open --foreground --timeout 300000 >> dev-log.txt 2>&1
echo. >> dev-log.txt
echo EXITED %ERRORLEVEL% >> dev-log.txt
type dev-log.txt
pause
