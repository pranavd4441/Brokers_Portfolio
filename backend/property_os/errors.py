import datetime
from django.utils.timezone import now
from rest_framework.exceptions import ValidationError, Throttled, NotAuthenticated, PermissionDenied, NotFound, AuthenticationFailed
from django.http import Http404
from django.core.exceptions import PermissionDenied as DjangoPermissionDenied

def format_error_payload(code="INTERNAL_SERVER_ERROR", message="An unexpected error occurred.", details=None, request_id=None):
    if details is None:
        details = {}
    return {
        "success": False,
        "code": code,
        "message": message,
        "detail": message,  # Backward compatibility key
        "details": details,
        "request_id": request_id or "",
        "timestamp": now().isoformat(),
        "documentation": f"https://docs.propertyos.com/errors/{code.lower()}"
    }

def resolve_exception_details(exc, request=None):
    request_id = getattr(request, 'request_id', '') if request else ''
    
    # 1. Validation Errors
    if isinstance(exc, ValidationError):
        details = exc.detail if hasattr(exc, 'detail') else {}
        # Format list/dict structure cleanly for details
        return "VALIDATION_ERROR", "The request payload contains validation errors.", details
        
    # 2. Throttled / Rate limits
    elif isinstance(exc, Throttled):
        wait = getattr(exc, 'wait', 0)
        return "RATE_LIMIT_EXCEEDED", f"Too many requests. Please try again in {wait} seconds.", {"wait": wait}
        
    # 3. Authentication
    elif isinstance(exc, (NotAuthenticated, AuthenticationFailed)):
        return "UNAUTHENTICATED", "Authentication credentials were not provided or are invalid.", {}
        
    # 4. Permissions / Access
    elif isinstance(exc, (PermissionDenied, DjangoPermissionDenied)):
        return "PERMISSION_DENIED", "You do not have permission to access this resource or perform this action.", {}
        
    # 5. Resource Not Found
    elif isinstance(exc, (NotFound, Http404)):
        return "RESOURCE_NOT_FOUND", "The requested resource could not be found.", {}
        
    # 6. Fallback
    return "INTERNAL_SERVER_ERROR", "An unexpected internal server error occurred. Please contact support.", {}
