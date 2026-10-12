@echo off
REM Run script (Windows). Env overrides: SERVER_PORT, STORAGE_PATH, DATA_PATH, MAIL_* , APP_JWT_SECRET
setlocal
if "%SERVER_PORT%"=="" set SERVER_PORT=8099
if "%STORAGE_PATH%"=="" set STORAGE_PATH=%CD%\data\storage
if "%DATA_PATH%"=="" set DATA_PATH=%CD%\data
if not exist "%STORAGE_PATH%" mkdir "%STORAGE_PATH%"
echo Starting Network Software Hub on port %SERVER_PORT% ...
echo Open http://localhost:%SERVER_PORT%  (LAN: http://^<this-PC-IP^>:%SERVER_PORT%)
java -jar target\network-software-management-1.0.0.jar
