import logging
from celery.signals import before_task_publish, task_prerun, task_postrun
from property_os.logging import get_log_context, set_log_context, clear_log_context

@before_task_publish.connect
def on_task_publish(sender=None, headers=None, body=None, **kwargs):
    if headers is None:
        return
    ctx = get_log_context()
    # Inject request_id and tenant_id into task headers
    if ctx.get('request_id'):
        headers['request_id'] = ctx.get('request_id')
    if ctx.get('tenant_id'):
        headers['tenant_id'] = ctx.get('tenant_id')

@task_prerun.connect
def on_task_prerun(sender=None, task=None, task_id=None, args=None, kwargs=None, **extra):
    request_id = None
    tenant_id = None
    
    # Try to extract from request context headers
    if task and hasattr(task, 'request') and task.request:
        headers = getattr(task.request, 'headers', None) or {}
        request_id = headers.get('request_id')
        tenant_id = headers.get('tenant_id')
        
    if request_id:
        set_log_context('request_id', request_id)
    else:
        # Fall back to task ID
        set_log_context('request_id', f"celery-{task_id}")
        
    if tenant_id:
        set_log_context('tenant_id', tenant_id)
        
    set_log_context('path', f"celery-task:{task.name if task else 'unknown'}")
    set_log_context('method', 'CELERY')

@task_postrun.connect
def on_task_postrun(sender=None, task_id=None, task=None, retval=None, state=None, **kwargs):
    clear_log_context()
