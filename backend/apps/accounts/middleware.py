from django.utils.deprecation import MiddlewareMixin
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from .tenant_context import set_current_tenant_id, clear_current_tenant_id

class TenantMiddleware(MiddlewareMixin):
    """
    Middleware to extract tenant_id from the authenticated user's JWT
    or session, and set it in the thread-safe tenant context.
    """
    def process_request(self, request):
        tenant_id = None
        
        # 1. Try to extract tenant_id from JWT Authorization header
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            try:
                token = auth_header.split(' ')[1]
                # UntypedToken validates the signature and decodes the token
                decoded_token = UntypedToken(token)
                tenant_id = decoded_token.get('tenant_id')
            except (InvalidToken, TokenError):
                # Token is invalid or expired; let DRF's authentication handler deal with it
                pass

        # 2. Fallback to request.user if already authenticated via sessions/admin
        if not tenant_id and request.user and request.user.is_authenticated:
            if hasattr(request.user, 'tenant_id') and request.user.tenant_id:
                tenant_id = str(request.user.tenant_id)

        # 3. Bind the tenant_id to the thread-local context
        # Store the token returned by set_current_tenant_id so we can reset it in process_response
        request._tenant_context_token = set_current_tenant_id(tenant_id)
        
        from .tenant_context import set_tenant_enforcement_active
        request._tenant_enforcement_token = set_tenant_enforcement_active(True)
        
        # Expose tenant_id on the request object for convenience
        request.tenant_id = tenant_id

    def process_response(self, request, response):
        # Clear the tenant context after the request is processed to prevent leakage
        from .tenant_context import set_tenant_enforcement_active
        
        token = getattr(request, '_tenant_context_token', None)
        if token:
            clear_current_tenant_id(token)
            request._tenant_context_token = None
            
        enforce_token = getattr(request, '_tenant_enforcement_token', None)
        if enforce_token:
            try:
                import contextvars
                # Reset enforcement token
                set_tenant_enforcement_active(False)
            except Exception:
                pass
            request._tenant_enforcement_token = None
            
        return response

    def process_exception(self, request, exception):
        # Clear the tenant context if an exception occurs
        from .tenant_context import set_tenant_enforcement_active
        
        token = getattr(request, '_tenant_context_token', None)
        if token:
            clear_current_tenant_id(token)
            request._tenant_context_token = None
            
        enforce_token = getattr(request, '_tenant_enforcement_token', None)
        if enforce_token:
            try:
                set_tenant_enforcement_active(False)
            except Exception:
                pass
            request._tenant_enforcement_token = None
            
        return None


class ApiSlashMiddleware(MiddlewareMixin):
    """
    Middleware to automatically append a trailing slash to all /api/ requests
    that do not have one, to avoid Django's APPEND_SLASH redirects and 500 errors
    on POST/PUT/DELETE requests.
    """
    def process_request(self, request):
        if request.path_info.startswith('/api/') and not request.path_info.endswith('/'):
            # Append trailing slash internally for routing
            request.path_info += '/'
            if hasattr(request, 'path') and request.path:
                request.path += '/'

