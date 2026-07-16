import logging
import os
import sys
import time
import traceback
import uuid

import sentry_sdk
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import UntypedToken

from .logging import clear_log_context, set_log_context

logger = logging.getLogger("middleware")
security_logger = logging.getLogger("security")


class RequestIDMiddleware(MiddlewareMixin):
    """
    Middleware to assign a unique Request ID (X-Request-ID) to each request.
    If the client sends X-Request-ID, it is reused; otherwise, a UUID4 is generated.
    """

    def process_request(self, request):
        request_id = request.headers.get("X-Request-ID") or request.META.get(
            "HTTP_X_REQUEST_ID"
        )
        if not request_id:
            request_id = str(uuid.uuid4())

        request.request_id = request_id
        set_log_context("request_id", request_id)

    def process_response(self, request, response):
        request_id = getattr(request, "request_id", None)
        if request_id:
            response["X-Request-ID"] = request_id
        return response


class TenantContextLoggingMiddleware(MiddlewareMixin):
    """
    Middleware to enrich structured logs with user and tenant context details.
    """

    def process_request(self, request):
        # Decode tenant ID early from JWT token if present, similar to TenantMiddleware
        tenant_id = None
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            try:
                token = auth_header.split(" ")[1]
                decoded_token = UntypedToken(token)
                tenant_id = decoded_token.get("tenant_id")
            except (InvalidToken, TokenError):
                pass

        if not tenant_id and request.user and request.user.is_authenticated:
            if hasattr(request.user, "tenant_id") and request.user.tenant_id:
                tenant_id = str(request.user.tenant_id)

        set_log_context("tenant_id", tenant_id)

    def process_response(self, request, response):
        user = getattr(request, "user", None)
        tenant_id = getattr(request, "tenant_id", None) or (
            user.tenant_id if user and hasattr(user, "tenant_id") else None
        )

        if user and user.is_authenticated:
            set_log_context("user_id", str(user.id))
            set_log_context("username", user.email)

            # Enrich context with role
            role = getattr(user, "role", None)

            # Retrieve tenant details if associated
            tenant = getattr(user, "tenant", None)
            if tenant:
                set_log_context("tenant_id", str(tenant.id))
                set_log_context("tenant_name", tenant.name)
            elif tenant_id:
                set_log_context("tenant_id", str(tenant_id))
            else:
                # User authenticated but tenant is missing, log warning
                security_logger.warning(
                    f"Tenant context missing for authenticated user: {user.email}",
                    extra={
                        "extra_fields": {"user_id": str(user.id), "email": user.email}
                    },
                )
        else:
            # Set default null fields for unauthenticated requests
            set_log_context("user_id", None)
            set_log_context("username", None)
            set_log_context("tenant_id", None)

        return response


class StructuredLoggingMiddleware(MiddlewareMixin):
    """
    Middleware that records HTTP access metrics and writes structured logs to stdout.
    """

    def process_request(self, request):
        request._start_time = time.time()

        # Populate path and HTTP method in logging context
        set_log_context("path", request.path)
        set_log_context("method", request.method)
        set_log_context("IP", request.META.get("REMOTE_ADDR"))
        set_log_context("user_agent", request.headers.get("User-Agent"))

    def process_response(self, request, response):
        # Update metrics in response
        duration = None
        if hasattr(request, "_start_time"):
            duration = time.time() - request._start_time

        set_log_context("status_code", response.status_code)
        set_log_context("duration", duration)

        # Record structured log entry for request completion
        msg = f"HTTP {request.method} {request.path} returned {response.status_code} in {f'{duration:.4f}s' if duration else 'N/A'}"

        # Log to the request logger
        logging.getLogger("django.request").info(msg)

        # Clear log context to prevent memory leak/thread pool contamination
        clear_log_context()

        return response


class GlobalExceptionMiddleware:
    """
    Middleware to catch all unhandled exceptions, log them with traceback & metadata,
    and return a clean JSON 500 response to clients.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            response = self.get_response(request)
            return response
        except Exception as e:
            return self.handle_exception(request, e)

    def process_exception(self, request, exception):
        """
        Called by Django when a view raises an exception.
        """
        return self.handle_exception(request, exception)

    def handle_exception(self, request, exception):
        # Calculate duration
        duration = None
        if hasattr(request, "_start_time"):
            duration = time.time() - request._start_time

        request_id = getattr(request, "request_id", None)

        # Parse payload size securely
        content_length = request.headers.get("Content-Length") or request.META.get(
            "CONTENT_LENGTH"
        )
        payload_size = (
            int(content_length) if content_length and content_length.isdigit() else 0
        )

        # Scrub sensitive headers
        safe_headers = {}
        sensitive = {
            "authorization",
            "cookie",
            "set-cookie",
            "x-api-key",
            "x-csrf-token",
        }
        for key, val in request.headers.items():
            if key.lower() in sensitive:
                safe_headers[key] = "[REDACTED]"
            else:
                safe_headers[key] = val

        # Gather context details
        user = getattr(request, "user", None)
        user_info = (
            f"{user.email} (ID: {user.id})"
            if user and user.is_authenticated
            else "Anonymous"
        )
        tenant_id = getattr(request, "tenant_id", None) or (
            str(user.tenant_id) if user and getattr(user, "tenant_id", None) else None
        )

        # Capture error traceback
        exc_type, exc_value, exc_traceback = sys.exc_info()
        tb_str = "".join(traceback.format_exception(exc_type, exc_value, exc_traceback))

        # Log detailed warning/error
        extra_fields = {
            "request_id": request_id,
            "tenant_id": tenant_id,
            "user": user_info,
            "endpoint": request.path,
            "payload_size": payload_size,
            "headers": safe_headers,
            "duration": duration,
            "environment": os.getenv("DJANGO_ENVIRONMENT", "development"),
            "traceback": tb_str,
        }

        # Send failure to Sentry explicitly (Sentry middleware handles uncaught exceptions,
        # but manually calling it ensures context tags are attached)
        with sentry_sdk.configure_scope() as scope:
            scope.set_tag("request_id", request_id)
            if tenant_id:
                scope.set_tag("tenant_id", tenant_id)
            if user and user.is_authenticated:
                scope.set_user({"id": str(user.id), "email": user.email})
            sentry_sdk.capture_exception(exception)

        # Log the exception in structured JSON formatter
        logger.error(
            f"Unhandled exception during request processing: {str(exception)}",
            exc_info=True,
            extra={"extra_fields": extra_fields},
        )

        # Return generic error payload to client
        from property_os.errors import format_error_payload

        err_msg = format_error_payload(
            code="INTERNAL_SERVER_ERROR",
            message="An unexpected internal server error occurred. Please contact support.",
            details={},
            request_id=request_id,
        )
        response = JsonResponse(err_msg, status=500)

        # Ensure request ID header is returned
        if request_id:
            response["X-Request-ID"] = request_id

        # Ensure security headers are still appended
        security_middleware = SecurityHeadersMiddleware(None)
        response = security_middleware.add_security_headers(response)

        # Clean logging context
        clear_log_context()

        return response


class SecurityHeadersMiddleware:
    """
    Middleware that appends standard security headers to all responses.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        return self.add_security_headers(response)

    def add_security_headers(self, response):
        # 1. Referrer Policy
        response["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # 2. Permissions Policy (restrict access to sensitive browser features)
        response["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), interest-cohort=()"
        )

        # 3. Cross-Origin Policies
        response["Cross-Origin-Opener-Policy"] = "same-origin"
        response["Cross-Origin-Embedder-Policy"] = "require-corp"
        response["Cross-Origin-Resource-Policy"] = "same-origin"

        # 4. Content Security Policy (CSP)
        # Detailed Directive Explanations:
        # - default-src 'self': Restrict assets to same origin by default.
        # - script-src 'self' ...: Allow scripts from same-origin and Sentry CDN.
        # - img-src 'self' data: ...: Allow images from self, base64 data URIs, Cloudflare R2/S3, and WhatsApp domains.
        # - style-src 'self' ... 'unsafe-inline': Allow fonts css from Google Fonts and inline styles for React/Next.js hydration.
        # - font-src 'self' ...: Allow fonts from self and Google Fonts CDN.
        # - connect-src 'self' ...: Allow fetch API/Websockets to self and Sentry ingest.
        # - frame-ancestors 'none': Prevent clickjacking by disabling embedding in iframe.
        # - upgrade-insecure-requests: Upgrade mixed http content requests to https.
        csp_directives = [
            "default-src 'self'",
            "script-src 'self' https://browser.sentry-cdn.com",
            "img-src 'self' data: https://*.cloudflare.storage.com https://*.r2.cloudflarestorage.com https://*.s3.amazonaws.com https://pps.whatsapp.net https://*.whatsapp.com https://*.whatsapp.net",
            "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'",
            "font-src 'self' https://fonts.gstatic.com",
            "connect-src 'self' https://*.sentry.io",
            "frame-ancestors 'none'",
            "upgrade-insecure-requests",
        ]
        response["Content-Security-Policy"] = "; ".join(csp_directives)

        return response


class ApiPayloadLimitMiddleware(MiddlewareMixin):
    """
    Middleware to limit the size of HTTP request bodies to protect against DDoS.
    - Limits standard API endpoints to 10MB.
    - Limits multipart image uploads to 20MB.
    """

    def process_request(self, request):
        if request.path.startswith("/api/"):
            content_length_str = request.headers.get(
                "Content-Length"
            ) or request.META.get("CONTENT_LENGTH")
            if content_length_str:
                try:
                    content_length = int(content_length_str)
                except ValueError:
                    return JsonResponse(
                        {"detail": "Invalid Content-Length header."}, status=400
                    )

                # Determine limit based on endpoint path
                limit = 10 * 1024 * 1024  # Default: 10MB
                if "images" in request.path or "upload" in request.path:
                    limit = 20 * 1024 * 1024  # File uploads: 20MB

                if content_length > limit:
                    return JsonResponse(
                        {
                            "detail": f"Payload too large. Limit is {limit // (1024 * 1024)}MB."
                        },
                        status=413,
                    )


class ContentTypeValidationMiddleware(MiddlewareMixin):
    """
    Middleware to enforce valid Content-Type headers for modifying API requests (POST/PUT/PATCH).
    """

    def process_request(self, request):
        if request.method in ("POST", "PUT", "PATCH") and request.path.startswith(
            "/api/"
        ):
            # Bypass specific integration endpoints (like WhatsApp webhook verification)
            if "whatsapp/webhook" in request.path:
                return None

            # If request body is empty, Content-Type is not required
            content_length = request.headers.get("Content-Length") or request.META.get(
                "CONTENT_LENGTH"
            )
            if content_length and content_length.isdigit() and int(content_length) == 0:
                return None
            if not content_length:  # No body present
                return None

            content_type = request.META.get("CONTENT_TYPE", "")
            if not content_type:
                return JsonResponse(
                    {"detail": "Content-Type header is required."}, status=415
                )

            allowed_types = (
                "application/json",
                "multipart/form-data",
                "application/x-www-form-urlencoded",
            )
            if not any(t in content_type for t in allowed_types):
                return JsonResponse(
                    {
                        "detail": f"Unsupported media type. Allowed types are: {', '.join(allowed_types)}."
                    },
                    status=415,
                )
