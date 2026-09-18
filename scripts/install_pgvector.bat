@echo off
echo ========================================================
echo Installing pgvector into PostgreSQL 18...
echo ========================================================

set "SRC=C:\Users\CSE\.gemini\antigravity-ide\brain\fd71b2e2-a4c9-4b16-9bc0-53a060e03806\scratch\pgvector"
set "DEST=C:\Program Files\PostgreSQL\18"

copy /Y "%SRC%\vector.dll" "%DEST%\lib\"
if errorlevel 1 goto error

copy /Y "%SRC%\vector.control" "%DEST%\share\extension\"
if errorlevel 1 goto error

copy /Y "%SRC%\sql\vector--*.sql" "%DEST%\share\extension\"
if errorlevel 1 goto error

if not exist "%DEST%\include\server\extension\vector" mkdir "%DEST%\include\server\extension\vector"
copy /Y "%SRC%\src\halfvec.h" "%DEST%\include\server\extension\vector\"
copy /Y "%SRC%\src\sparsevec.h" "%DEST%\include\server\extension\vector\"
copy /Y "%SRC%\src\vector.h" "%DEST%\include\server\extension\vector\"

echo ========================================================
echo [SUCCESS] pgvector files successfully installed!
echo ========================================================
goto end

:error
echo.
echo [ERROR] Failed to copy files. Please ensure you ran this as Administrator!
echo.

:end
