@echo off
setlocal
cd /d "%~dp0"

echo ===== [1/3] Sync with remote (pull --rebase) =====
git pull --rebase --autostash origin master
if %errorlevel% neq 0 (
    echo ERROR: pull/rebase failed - likely a conflict. Resolve manually, then rerun.
    pause
    exit /b %errorlevel%
)
echo.

echo ===== [2/3] Running brokerupdate.py =====
python brokerupdate.py
if %errorlevel% neq 0 (
    echo ERROR: brokerupdate.py failed!
    pause
    exit /b %errorlevel%
)
echo.
echo ----- Syncing to Supabase -----
python sync_brokers_to_supabase.py
if %errorlevel% neq 0 (
    echo ERROR: Supabase sync failed!
    pause
    exit /b %errorlevel%
)
echo.

echo ===== [3/3] Committing and pushing =====
git add brokers.json sync_brokers_to_supabase.py brokerupdate_push.bat
git diff --cached --quiet
if %errorlevel% equ 0 (
    echo No changes to commit.
) else (
    git commit -m "update brokers from sheet"
)

git push origin master
if %errorlevel% neq 0 (
    echo Push rejected - someone pushed first. Re-syncing and retrying once...
    git pull --rebase --autostash origin master
    if %errorlevel% neq 0 (
        echo ERROR: re-sync failed - resolve conflict manually, then rerun.
        pause
        exit /b %errorlevel%
    )
    git push origin master
    if %errorlevel% neq 0 (
        echo ERROR: push still failing. Check remote manually.
        pause
        exit /b %errorlevel%
    )
)
echo.
echo Done!
pause
