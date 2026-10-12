#!/usr/bin/env bash
# Build script (Linux/macOS): frontend + backend -> single JAR
set -e
cd "$(dirname "$0")"

echo "[1/3] Building frontend..."
cd frontend
npm install --no-audit --no-fund
npm run build
cd ..

echo "[2/3] Copying frontend dist into Spring static..."
rm -rf src/main/resources/static
mkdir -p src/main/resources/static
cp -r frontend/dist/* src/main/resources/static/

echo "[3/3] Building backend JAR (incl. tests)..."
mvn -q -DskipTests=false package

echo
echo "BUILD OK. Run with: ./run.sh  (or java -jar target/network-software-management-1.0.0.jar)"
