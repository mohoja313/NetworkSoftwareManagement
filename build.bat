@echo off
REM Build script (Windows): frontend + backend -> single JAR
setlocal

set NODE_DIR=C:\Program Files\nodejs
if exist "%NODE_DIR%\node.exe" set "PATH=%NODE_DIR%;%PATH%"

echo [1/3] Building frontend...
cd frontend
call npm.cmd install --no-audit --no-fund || exit /b 1
call npm.cmd run build || exit /b 1
cd ..

echo [2/3] Copying frontend dist into Spring static...
if exist src\main\resources\static rmdir /s /q src\main\resources\static
mkdir src\main\resources\static
xcopy /e /y frontend\dist\* src\main\resources\static\ || exit /b 1

echo [3/3] Building backend JAR (incl. tests)...
call mvn -q -DskipTests=false package || exit /b 1

echo.
echo BUILD OK. Run with: run.bat  (or java -jar target\network-software-management-1.0.0.jar)
