#!/bin/bash
# Reset demo data daily
# Add to crontab: 0 0 * * * /path/to/reset-demo-data.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DATA_DIR="${SCRIPT_DIR}/../data"
DB_FILE="${DATA_DIR}/escar.db"

echo "[$(date)] Resetting demo data..."

# Remove the database file
if [ -f "$DB_FILE" ]; then
  rm "$DB_FILE"
  echo "[$(date)] Database deleted: $DB_FILE"
else
  echo "[$(date)] Database not found: $DB_FILE"
fi

# Restart the backend to reinitialize the database
# Adjust this command based on your deployment method
if command -v docker &> /dev/null; then
  docker compose restart backend 2>/dev/null || true
fi

echo "[$(date)] Demo data reset complete"
