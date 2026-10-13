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
echo ===== Syncing to Supabase =====
python sync_brokers_to_supabase.py
if %errorlevel% neq 0 (
    echo ERROR: Supabase sync failed!
    pause
    exit /b %errorlevel%
)
echo.
echo ===== Committing and pushing =====
git add brokers.json sync_brokers_to_supabase.py brokerupdate_push.bat
git diff --cached --quiet || git commit -m "update brokers from sheet"
git push
echo.
echo Done!
pause
