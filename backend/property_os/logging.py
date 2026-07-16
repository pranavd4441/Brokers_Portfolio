import contextvars
import logging
import json
import os
from datetime import datetime

# Context variable containing request-specific log fields
_request_context = contextvars.ContextVar('request_context', default=None)

def get_log_context():
    ctx = _request_context.get()
    if ctx is None:
        ctx = {}
        _request_context.set(ctx)
    return ctx

def set_log_context(key, value):
    ctx = get_log_context()
    ctx[key] = value

def clear_log_context():
    _request_context.set(None)

class JSONFormatter(logging.Formatter):
    def format(self, record):
        ctx = _request_context.get() or {}
        
        # Build structured JSON log payload
        log_data = {
            "timestamp": datetime.utcfromtimestamp(record.created).isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": ctx.get("request_id"),
            "tenant_id": ctx.get("tenant_id"),
            "user_id": ctx.get("user_id"),
            "username": ctx.get("username"),
            "path": ctx.get("path"),
            "method": ctx.get("method"),
            "status_code": ctx.get("status_code"),
            "duration": ctx.get("duration"),
            "IP": ctx.get("IP"),
            "user_agent": ctx.get("user_agent"),
            "environment": os.getenv("DJANGO_ENVIRONMENT", "development"),
            "service": "backend",
            "version": os.getenv("RELEASE_VERSION", "1.0.0"),
            "worker_pid": os.getpid(),
        }
        
        # Include exception tracebacks if present
        if record.exc_info:
            log_data["traceback"] = self.formatException(record.exc_info)
            
        # Ensure any extra properties passed via logging extra are included
        if hasattr(record, "extra_fields"):
            log_data.update(record.extra_fields)
            
        return json.dumps(log_data)
