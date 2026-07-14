#!/bin/sh
set -e

echo "[PropertyOS] Beginning production startup sequence..."

# 1. Execute database migrations
echo "[PropertyOS] Running database migrations..."
python manage.py migrate --noinput

echo "[PropertyOS] Migrations complete. Spawning application server..."

# 2. Hand over execution to CMD (Gunicorn)
exec "$@"
