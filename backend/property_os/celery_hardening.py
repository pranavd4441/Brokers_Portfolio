import logging
from functools import wraps

from django.core.cache import cache

logger = logging.getLogger(__name__)


def idempotent_task(lock_key_prefix, expire=600):
    """
    Decorator to enforce idempotency on Celery tasks.
    Uses Django's caching framework (which connects to Redis in production/staging)
    to achieve distributed lock synchronization.
    """

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            import hashlib

            # Build unique key from arguments to distinguish execution payloads
            payload_str = f"{args}:{kwargs}"
            payload_hash = hashlib.sha256(payload_str.encode()).hexdigest()
            lock_key = f"celery_lock:{lock_key_prefix}:{payload_hash}"

            # Acquire lock via atomic cache write
            acquired = cache.add(lock_key, "LOCKED", expire)
            if not acquired:
                logger.warning(
                    f"[Celery Idempotency] Ignored duplicate task trigger: prefix={lock_key_prefix}. "
                    f"Args={args}, Kwargs={kwargs}"
                )
                return None

            try:
                return func(*args, **kwargs)
            finally:
                # Release lock upon completion to allow future runs
                cache.delete(lock_key)

        return wrapper

    return decorator


import json
import time

from celery import Task


class BaseHardenedTask(Task):
    """
    Enterprise base task class for Celery.
    - Handles automatic error logging and metrics logging.
    - Routes max-failed/poison tasks to a Redis Dead Letter Queue.
    """

    abstract = True

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        logger = logging.getLogger("celery")
        logger.error(
            f"Celery task failed: {self.name} (ID: {task_id}). Error: {str(exc)}",
            exc_info=exc,
            extra={
                "extra_fields": {
                    "task_id": task_id,
                    "task_name": self.name,
                    "args": str(args),
                    "kwargs": str(kwargs),
                    "traceback": str(einfo),
                }
            },
        )

        # Route task details to the platform DLQ list
        try:
            dlq_key = "celery_dlq:failed_tasks"
            task_payload = {
                "task_id": task_id,
                "task_name": self.name,
                "args": args,
                "kwargs": kwargs,
                "error": str(exc),
                "timestamp": time.time(),
            }

            # Write directly to Redis ZSET/LIST if available
            redis_client = None
            if hasattr(cache, "client") and hasattr(cache.client, "get_client"):
                redis_client = cache.client.get_client()

            if redis_client:
                redis_client.rpush(dlq_key, json.dumps(task_payload))
            else:
                failed_list = cache.get(dlq_key, [])
                failed_list.append(task_payload)
                cache.set(dlq_key, failed_list, 86400)
        except Exception as e:
            logger.error(f"Failed to push task {task_id} to DLQ: {str(e)}")
