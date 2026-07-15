#!/bin/sh
set -e

echo "[PropertyOS] Beginning production startup sequence..."

# 1. Collect static files (requires runtime env vars, cannot run at Docker build time)
echo "[PropertyOS] Collecting static files..."
python manage.py collectstatic --noinput

# 2. Execute database migrations
echo "[PropertyOS] Running database migrations..."
python manage.py migrate --noinput

echo "[PropertyOS] Migrations complete. Spawning application server..."

# 3. Hand over execution to CMD (Gunicorn)
exec "$@"
