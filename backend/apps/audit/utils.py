from .models import AuditLog

def log_audit_event(user, action, instance, changes_payload=None):
    """
    Utility function to log a system action to the AuditLog table.
    Enforces tenant isolation by linking to the user's tenant.
    """
    if not user or not user.is_authenticated:
        return None
        
    tenant = user.tenant
    model_name = instance.__class__.__name__
    record_id = getattr(instance, 'id', None)

    if not record_id:
        return None

    # Save audit log
    audit_record = AuditLog.objects.create(
        tenant=tenant,
        actor=user,
        action=action,
        model_name=model_name,
        record_id=record_id,
        changes_payload=changes_payload or {}
    )
    return audit_record
