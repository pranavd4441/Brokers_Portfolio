import contextvars

# Context variable to hold the active tenant ID for the thread/request lifetime
_active_tenant_id = contextvars.ContextVar('active_tenant_id', default=None)

def get_current_tenant_id():
    """Retrieve the active tenant ID from the current context."""
    return _active_tenant_id.get()

def set_current_tenant_id(tenant_id):
    """Set the active tenant ID for the current context. Returns a token to reset it."""
    if tenant_id is not None:
        # Convert UUID objects to string or keep as UUID. Standardize to UUID or string.
        # We will keep it as the raw UUID or string depending on what is passed.
        # Let's ensure it's converted to a string or UUID object.
        pass
    return _active_tenant_id.set(tenant_id)

def clear_current_tenant_id(token=None):
    """Clear the tenant ID or reset it using a token."""
    if token:
        _active_tenant_id.reset(token)
    else:
        _active_tenant_id.set(None)
