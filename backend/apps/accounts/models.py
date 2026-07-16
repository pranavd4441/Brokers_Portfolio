import uuid

from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)
from django.db import models


class Tenant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    logo_url = models.CharField(max_length=512, blank=True, null=True)
    brand_color = models.CharField(max_length=7, default="#0F172A")  # Hex code
    whatsapp_default_number = models.CharField(max_length=20, blank=True, null=True)
    subscription_plan = models.CharField(max_length=50, default="FREE")
    listing_expiry_days = models.IntegerField(default=30)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Users must have an email address")

        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", "OWNER")

        # Create a default system tenant for the superuser if none exists
        if "tenant" not in extra_fields or extra_fields["tenant"] is None:
            system_tenant, _ = Tenant.objects.get_or_create(
                name="System Admin Workspace"
            )
            extra_fields["tenant"] = system_tenant

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = (
        ("OWNER", "Owner / Founder"),
        ("ADMIN", "Agency Administrator"),
        ("BROKER", "Real Estate Broker"),
        ("ASSISTANT", "Assistant / Lister"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        Tenant, on_delete=models.CASCADE, related_name="users", null=True, blank=True
    )
    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, default="", blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="BROKER")
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    # MFA security features
    mfa_enabled = models.BooleanField(default=False)
    mfa_secret = models.CharField(max_length=32, blank=True, null=True)
    mfa_type = models.CharField(max_length=20, default="TOTP")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["name"]

    def __str__(self):
        return f"{self.name} ({self.email}) - {self.role}"

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        old_password = None
        if not is_new:
            try:
                # Fetch unhashed password from DB using direct query (bypass tenant manager)
                old_password = User.objects.only("password").get(pk=self.pk).password
            except User.DoesNotExist:
                pass

        super().save(*args, **kwargs)

        # Write the password to history if it is a new user or the hash has changed
        if is_new or old_password != self.password:
            PasswordHistory.objects.create(user=self, password_hash=self.password)


class UserSession(models.Model):
    """
    Model to track user device logins, active sessions, and metadata.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sessions")
    token_jti = models.CharField(max_length=255, unique=True, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=512, null=True, blank=True)
    browser = models.CharField(max_length=100, null=True, blank=True)
    os = models.CharField(max_length=100, null=True, blank=True)
    city = models.CharField(max_length=100, null=True, blank=True)
    login_time = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"Session for {self.user.email} ({self.browser}/{self.os}) from {self.ip_address}"


class PasswordHistory(models.Model):
    """
    Model to log previous password hashes to prevent quick password reuse.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="password_histories"
    )
    password_hash = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class MFARecoveryCode(models.Model):
    """
    Hashed backup recovery codes in case the user loses their MFA authenticator device.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="mfa_recovery_codes"
    )
    code_hash = models.CharField(max_length=255)
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)


class MFATicket(models.Model):
    """
    Short-lived ticket used in login workflow transitions when verification is required.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    def is_expired(self):
        from datetime import timedelta

        from django.utils import timezone

        return timezone.now() > self.created_at + timedelta(minutes=5)
