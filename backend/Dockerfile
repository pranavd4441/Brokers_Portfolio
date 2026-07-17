FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . /app/

# Note: collectstatic is intentionally NOT run here.
# It requires runtime env vars (SECRET_KEY, etc.) which are unavailable during
# Docker build. It is instead run in docker-entrypoint.sh at container startup.

# Copy and set up the entrypoint startup script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Register the entrypoint
ENTRYPOINT ["docker-entrypoint.sh"]

# Expose Django port
EXPOSE 8000

# Execute Gunicorn dynamically binding to PORT, replacing the shell process (PID 1)
CMD ["sh", "-c", "exec gunicorn property_os.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 2 --timeout 120"]
