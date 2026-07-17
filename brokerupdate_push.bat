@echo off
cd /d "%~dp0"
echo ===== Running brokerupdate.py =====
python brokerupdate.py
if %errorlevel% neq 0 (
    echo ERROR: brokerupdate.py failed!
    pause
    exit /b %errorlevel%
)
echo.
echo ===== Committing and pushing =====
git add brokers.json
git commit -m update_brokers
git push
echo.
echo Done!
pause
