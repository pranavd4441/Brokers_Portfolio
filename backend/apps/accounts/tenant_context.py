import contextvars

# Context variable to hold the active tenant ID for the thread/request lifetime
_active_tenant_id = contextvars.ContextVar("active_tenant_id", default=None)
_tenant_enforcement_active = contextvars.ContextVar(
    "tenant_enforcement_active", default=False
)


def get_current_tenant_id():
    """Retrieve the active tenant ID from the current context."""
    return _active_tenant_id.get()


def set_current_tenant_id(tenant_id):
    """Set the active tenant ID for the current context. Returns a token to reset it."""
    return _active_tenant_id.set(tenant_id)


def clear_current_tenant_id(token=None):
    """Clear the tenant ID or reset it using a token."""
    if token:
        try:
            _active_tenant_id.reset(token)
        except RuntimeError:
            _active_tenant_id.set(None)
    else:
        _active_tenant_id.set(None)


def is_tenant_enforcement_active():
    """Check if tenant context enforcement is active for this thread/request."""
    return _tenant_enforcement_active.get()


def set_tenant_enforcement_active(active: bool):
    """Enable or disable tenant context enforcement for this thread/request."""
    return _tenant_enforcement_active.set(active)
