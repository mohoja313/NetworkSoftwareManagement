#!/usr/bin/env bash
# Run script (Linux/macOS). Env overrides: SERVER_PORT, STORAGE_PATH, DATA_PATH, MAIL_*, APP_JWT_SECRET
cd "$(dirname "$0")"
export SERVER_PORT="${SERVER_PORT:-8099}"
export STORAGE_PATH="${STORAGE_PATH:-$PWD/data/storage}"
export DATA_PATH="${DATA_PATH:-$PWD/data}"
mkdir -p "$STORAGE_PATH"
echo "Starting Network Software Hub on port $SERVER_PORT ..."
echo "Open http://localhost:$SERVER_PORT  (LAN: http://<this-machine-IP>:$SERVER_PORT)"
exec java -jar target/network-software-management-1.0.0.jar
