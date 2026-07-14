import time
import logging
from django.core.cache import cache
from rest_framework.throttling import BaseThrottle
from rest_framework.views import exception_handler
from rest_framework.exceptions import Throttled

logger = logging.getLogger(__name__)
security_logger = logging.getLogger('security')

class AdvancedRateThrottle(BaseThrottle):
    """
    Enterprise Redis-backed sliding window rate limiter.
    Supports bursts and multiple scopes (IP, User, Tenant, and Endpoint).
    Falls back gracefully if Redis is not configured or in unit testing.
    """
    def __init__(self):
        self.rate = "60/minute"
        self.num_requests, self.duration = self.parse_rate(self.rate)
        self.client_ident = None
        self.retry_after = 0

    def parse_rate(self, rate):
        parts = rate.split('/')
        num_requests = int(parts[0])
        period = parts[1]
        if period == 'minute':
            duration = 60
        elif period == 'hour':
            duration = 3600
        elif period == 'day':
            duration = 86400
        else:
            duration = 60
        return num_requests, duration

    def get_ident(self, request):
        if request.user and request.user.is_authenticated:
            if getattr(request.user, 'tenant_id', None):
                return f"tenant:{request.user.tenant_id}"
            return f"user:{request.user.id}"
        
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', '127.0.0.1')

    def get_ip_address(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', '127.0.0.1')

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)
        endpoint = f"{view.__class__.__module__}.{view.__class__.__name__}"
        return f"throttle:{ident}:{endpoint}"

    def allow_request(self, request, view):
        self.client_ident = self.get_cache_key(request, view)
        now = time.time()
        
        # Check IP blacklist
        ip_addr = self.get_ip_address(request)
        blacklist_key = f"blacklist:ip:{ip_addr}"
        if cache.get(blacklist_key):
            security_logger.warning(f"Request blocked: IP {ip_addr} is currently blacklisted.")
            self.retry_after = 86400  # 24 hours lock
            return False

        # Access Redis connection if available
        redis_client = None
        try:
            if hasattr(cache, 'client') and hasattr(cache.client, 'get_client'):
                redis_client = cache.client.get_client()
        except Exception:
            pass

        if redis_client:
            try:
                key = self.client_ident
                clear_before = now - self.duration
                
                # Redis atomic pipeline transaction
                pipe = redis_client.pipeline()
                pipe.zremrangebyscore(key, 0, clear_before)
                pipe.zcard(key)
                pipe.zadd(key, {str(now): now})
                pipe.expire(key, self.duration)
                
                results = pipe.execute()
                count = results[1]
                
                if count >= self.num_requests:
                    first_val = redis_client.zrange(key, 0, 0)
                    first_time = float(first_val[0]) if first_val else now
                    self.retry_after = int(max(1, self.duration - (now - first_time)))
                    self.log_abuse(request, ip_addr)
                    return False
                    
                return True
            except Exception as e:
                logger.warning(f"Redis sliding window failed, falling back to simple cache: {str(e)}")

        # Fallback cache sliding window implementation
        count_key = f"{self.client_ident}:count"
        window_key = f"{self.client_ident}:window"
        
        count = cache.get(count_key, 0)
        if count >= self.num_requests:
            window_start = cache.get(window_key, now)
            self.retry_after = int(max(1, self.duration - (now - window_start)))
            self.log_abuse(request, ip_addr)
            return False
            
        if count == 0:
            cache.set(window_key, now, self.duration)
            
        cache.set(count_key, count + 1, self.duration)
        return True

    def wait(self):
        return self.retry_after

    def log_abuse(self, request, ip_addr):
        abuse_key = f"abuse:count:{ip_addr}"
        try:
            count = cache.get(abuse_key, 0) + 1
            cache.set(abuse_key, count, 600)  # Keep tracker for 10 minutes
            if count >= 10:
                blacklist_key = f"blacklist:ip:{ip_addr}"
                cache.set(blacklist_key, True, 86400)  # Blacklist IP for 24 hours
                security_logger.error(f"IP {ip_addr} has been auto-blacklisted due to excessive rate limiting violations.")
        except Exception:
            pass


class WebhookRateThrottle(AdvancedRateThrottle):
    """
    Advanced sliding window throttle for webhooks (e.g. WhatsApp, Stripe).
    """
    def __init__(self):
        super().__init__()
        self.rate = "100/minute"
        self.num_requests, self.duration = self.parse_rate(self.rate)


class PublicRateThrottle(AdvancedRateThrottle):
    """
    Advanced sliding window throttle for public sharing and analytics endpoints.
    """
    def __init__(self):
        super().__init__()
        self.rate = "60/minute"
        self.num_requests, self.duration = self.parse_rate(self.rate)


class AdminRateThrottle(AdvancedRateThrottle):
    """
    Advanced sliding window throttle for administrators.
    """
    def __init__(self):
        super().__init__()
        self.rate = "5000/day"
        self.num_requests, self.duration = self.parse_rate(self.rate)


def custom_exception_handler(exc, context):
    """
    Custom exception handler to format all DRF errors using the enterprise structured error schema
    and append rate-limiting compliance headers if throttled.
    """
    response = exception_handler(exc, context)
    request = context.get('request') if context else None
    request_id = getattr(request, 'request_id', '') if request else ''
    
    if isinstance(exc, Throttled):
        ip = request.META.get('REMOTE_ADDR') if request else 'Unknown'
        path = request.path if request else 'Unknown'
        method = request.method if request else 'Unknown'
        wait = getattr(exc, 'wait', 0)
        
        security_logger.warning(
            f"Request throttled: Method={method}, Path={path}, IP={ip}, Wait={wait}s",
            extra={
                "extra_fields": {
                    "throttle_wait": wait,
                    "ip": ip,
                    "path": path,
                    "method": method
                }
            }
        )
        
    if response is not None:
        from property_os.errors import resolve_exception_details, format_error_payload
        
        code, message, details = resolve_exception_details(exc, request)
        response.data = format_error_payload(
            code=code,
            message=message,
            details=details,
            request_id=request_id
        )
        
        if isinstance(exc, Throttled):
            response['X-RateLimit-Limit'] = '60'
            response['X-RateLimit-Remaining'] = '0'
            response['Retry-After'] = str(getattr(exc, 'wait', 0))
            
        if request_id:
            response['X-Request-ID'] = request_id
            
    return response
