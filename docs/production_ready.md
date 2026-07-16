# PropertyOS Production Hardening & Operations Guide

This document describes the Phase A production-hardening changes implemented in the PropertyOS platform backend, including environment configuration, structured logging, request ID propagation, rate limits, security policies, Sentry integration, and monitoring.

---

## 1. Environment Variables

All settings are configured using environment variables conforming to 12-Factor App design. 

### Critical Security Credentials (Required in Staging/Production)
| Name | Description | Default / Dev Fallback | Validation Rule |
|------|-------------|------------------------|-----------------|
| `DJANGO_SECRET_KEY` | Core Django security secret | Insecure dev key | Must be set & not start with `django-insecure` |
| `DATABASE_URL` | PostgreSQL database connection string | Sqlite fallback | Must be valid DB connection string |
| `JWT_SECRET_KEY` | Secret key for signing JSON Web Tokens | SECRET_KEY | Must be set in production |
| `SENTRY_DSN` | Sentry DSN endpoint for logs & error tracing | None (Disabled) | Must be set in production |
| `REDIS_URL` | Redis server URL for Celery and caching | Memory fallback | Must be set in production |
| `AWS_ACCESS_KEY_ID` | AWS Access Key for S3/R2 storage | None (Local storage) | Must be set in production |
| `AWS_SECRET_ACCESS_KEY` | AWS Secret Access Key for S3/R2 storage | None (Local storage) | Must be set in production |
| `AWS_STORAGE_BUCKET_NAME`| Target S3/R2 bucket name | None (Local storage) | Must be set in production |
| `WHATSAPP_ACCESS_TOKEN` | Meta Graph API WhatsApp token | None | Must be set in production |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta WhatsApp phone number ID | None | Must be set in production |
| `GEMINI_API_KEY` | Google Gemini API key for AI generation | None | Must be set in production |

---

## 2. Structured JSON Logging

Logs are formatted as structured JSON object strings output exclusively to `stdout`.

### JSON Fields Matrix
Every log entry contains the following fields. If a field is unavailable, it is logged as `null` rather than being omitted:
```json
{
  "timestamp": "ISO-8601 UTC timestamp",
  "level": "INFO / WARNING / ERROR / DEBUG",
  "logger": "Logger name (e.g. application, celery, security)",
  "message": "The log message",
  "request_id": "Unique UUID4 string tracing the HTTP request",
  "tenant_id": "UUID of the active tenant workspace",
  "user_id": "UUID of the authenticated user",
  "username": "Email of the authenticated user",
  "path": "HTTP request path",
  "method": "HTTP request method (e.g. GET, POST)",
  "status_code": "HTTP response status code",
  "duration": "Time taken to complete request in seconds",
  "IP": "Client IP address",
  "user_agent": "Client user agent string",
  "environment": "production / staging / development",
  "service": "backend",
  "version": "Release version string",
  "worker_pid": "PID of the worker process handling the request"
}
```

---

## 3. Request ID Propagation

- The `RequestIDMiddleware` checks for incoming `X-Request-ID` headers.
- If present, the ID is reused; if absent, a unique `UUID4` is generated.
- The Request ID is bound to the thread-local context and automatically injected into all log outputs.
- Responses contain the `X-Request-ID` header.

---

## 4. DRF Throttling (Rate Limits)

Throttling rates are configurable from environment variables:
- **Anonymous Requests**: `THROTTLE_ANON_RATE` (Default: `100/day`)
- **Authenticated Requests**: `THROTTLE_USER_RATE` (Default: `1000/day`)
- **Webhooks**: `THROTTLE_WEBHOOK_RATE` (Default: `100/minute`)
- **Public Share Pages/Analytics**: `THROTTLE_PUBLIC_RATE` (Default: `60/minute`)
- **Admin Accounts**: `THROTTLE_ADMIN_RATE` (Default: `5000/day`)

### Throttling Response
When a client exceeds the limit:
- Status Code: `429 Too Many Requests`
- Header: `Retry-After` (wait time in seconds)
- An entry is logged to the `security` logger with details of the throttled IP and path.

---

## 5. Security Headers (OWASP Rules)

The backend returns the following security headers:
- `Content-Security-Policy`: Restricts resource domains to self, Sentry, Cloudflare R2, and WhatsApp.
- `Strict-Transport-Security` (HSTS): Enabled in production (31536000s duration).
- `Referrer-Policy`: Set to `strict-origin-when-cross-origin`.
- `Permissions-Policy`: Restricts access to client hardware like camera/mic.
- `Cross-Origin-Opener-Policy`: Set to `same-origin`.
- `Cross-Origin-Embedder-Policy`: Set to `require-corp`.
- `Cross-Origin-Resource-Policy`: Set to `same-origin`.

---

## 6. Sentry Configuration

### Configuration Settings
Set `SENTRY_DSN` in the environment to activate.
- Integrations: Django, Celery
- Samples Rate: Configurable via `SENTRY_TRACES_SAMPLE_RATE` (Default: `0.1`)

### PII Data Scrubber
To prevent data leaks, Sentry is configured to run a client-side scrubber that redacts:
- Authorization tokens (JWT and Bearer headers)
- Cookie headers
- Input fields containing passwords, tokens, secrets, or credential strings.

---

## 7. Feature Flags

Feature flags are queried through `property_os.feature_flags.FeatureFlagService`.

### Current Flags
- `ENABLE_WHATSAPP`: Toggle WhatsApp inbound/outbound features.
- `ENABLE_ANALYTICS`: Toggle public analytics logger and metric dashboards.
- `ENABLE_AI`: Toggle Gemini-based description/pitch generator features.
- `ENABLE_PUBLIC_SHARING`: Toggle short-link public property view resolvers.
- `ENABLE_REGISTRATION`: Toggle user self-registration API.
- `ENABLE_CELERY`: Toggle background task offloading (falls back to synchronous execution if disabled).

---

## 8. Troubleshooting & Diagnostics

### Common Errors

#### 1. Configuration Validation Failure (`ImproperlyConfigured`)
- **Symptoms**: Gunicorn/Django fails to start with `django.core.exceptions.ImproperlyConfigured`.
- **Cause**: Missing mandatory environment variables in production mode.
- **Fix**: Check that `DJANGO_ENVIRONMENT=production` is accompanied by all required settings (refer to Section 1).

#### 2. Throttling Errors (`429 Too Many Requests`)
- **Symptoms**: Third-party webhooks fail or clients see 429 errors.
- **Fix**: Adjust `THROTTLE_WEBHOOK_RATE` or `THROTTLE_PUBLIC_RATE` upwards in the hosting dashboard (e.g. Render).

---

## 9. Enterprise Authentication & Security

### Refresh Token Rotation & Blacklist
- Simple-JWT's token blacklist is active. Refresh tokens are rotated (`ROTATE_REFRESH_TOKENS: True`) and immediately blacklisted after single-use (`BLACKLIST_AFTER_ROTATION: True`) to protect against replay attacks.

### Device Sessions Tracking
- Active device logins are tracked in the database via the `UserSession` model, recording IP, browser, OS, and client city (extracted from proxy headers like `X-Render-Geo-City` or `CF-IPCity`).
- **Endpoints**:
  - `GET /api/v1/auth/sessions/`: Retrieve list of active user sessions.
  - `POST /api/v1/auth/sessions/{id}/logout/`: Terminate a specific session.
  - `POST /api/v1/auth/sessions/logout-other/`: Terminate all other sessions.
  - `POST /api/v1/auth/sessions/logout-all/`: Terminate all sessions.

### Password Security & Complexity
- Standard validators are configured in Django's settings:
  - Minimum length enforced at **10 characters**.
  - **ComplexityValidator**: Enforces at least 1 uppercase, 1 lowercase, 1 number, and 1 special character.
- **Password History**: Users cannot reuse any of their last 5 passwords (checked automatically via `PasswordHistory` logging in the overridden `User.save()` method).

### Extensible MFA Verification
- Login view returns `{"mfa_required": true, "ticket": "<uuid>"}` if the user enables MFA.
- Verification endpoint: `POST /api/v1/auth/mfa/verify/` validates the temporary ticket along with a TOTP code (Authenticator App) or an active backup recovery code.

---

## 10. API Security & Versioning

- All API endpoints are pre-routed under the versioned path `/api/v1/` to separate API lifecycles.
- Root `/api/` paths are retained as fallbacks to ensure complete backward compatibility.
- **Payload Limits**: `ApiPayloadLimitMiddleware` rejects bodies exceeding 10MB (20MB for image uploads) returning `413 Payload Too Large`.
- **Media Checks**: `ContentTypeValidationMiddleware` enforces valid `application/json` or `multipart/form-data` types for write requests, returning `415 Unsupported Media Type` for anomalous content-types.

---

## 11. Database Hardening & Diagnostics

- **Connection Pooling**: Configured for Render PgBouncer (`POOL_MODE=transaction`) with a default size of 20 connections.
- **Command**: `python manage.py audit_db`
  Executes database health audits, checking table sizes, index scans, dead tuples, and active connection queries (SQLite tables/indexes in dev, PostgreSQL statistics catalog tables in production).

---

## 12. Redis & Celery Resilience

- **Queue Prioritization**: Workloads are routed to targeted queues:
  - `media`: Heavy image cropping tasks.
  - `whatsapp`: Real-time conversation syncs.
  - `default`: Miscellaneous light workflows.
- **Limits**:
  - Worker prefetch multiplier is locked to `1` to prevent starvation.
  - Time limits (Soft: 4 minutes, Hard: 5 minutes) abort hanging processes.
- **Idempotency**: Decorator `@idempotent_task(lock_key_prefix="...")` enforces task deduplication using cache locks.

---

## 13. File Storage Hardening

- **Access Protection**: Signed URLs are generated for S3/R2 storage, expiring in 15 minutes.
- **Signature Checks**: Uploaded files are validated using magic byte headers (checking JPEG `\xff\xd8`, PNG `\x89PNG`, GIF `GIF8`, and WEBP `RIFF...WEBP`) to block masked executables.

---

## 14. Observability & Prometheus

- Prometheus metrics are exposed at `/api/v1/metrics/` returning OpenMetrics format:
  - `django_db_connections_active` (Active connection count)
  - `process_max_rss_kb` (Resident memory footprint)
  - `propertyos_properties_total` (Global property count)
  - `propertyos_leads_total` (Global prospective lead count)
  - `propertyos_active_sessions` (Active device session count)

---

## 15. Disaster Recovery Runbook

### Target Metrics
- **Recovery Point Objective (RPO)**: 1 Hour (maximum data loss window).
- **Recovery Time Objective (RTO)**: 4 Hours (maximum downtime for restore).

### Runbook Protocols
1. **Daily Backup Verification**: Check automated Render S3 backups.
2. **Database Recovery**: Restore from snapshot using pg_restore.
3. **Media Recovery**: Synchronize target S3 buckets.
4. **Health Audit**: Execute `python manage.py audit_db` post-recovery.

