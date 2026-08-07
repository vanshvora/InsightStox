from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    """Custom manager for User model using email as the unique identifier."""

    def create_user(self, email, name, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, name=name, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, name, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, name, password, **extra_fields)


class User(AbstractBaseUser):
    """Custom user model with email as the unique identifier."""

    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    registration_method = models.CharField(max_length=50, default='email')
    investment_experience = models.CharField(max_length=255, blank=True, null=True)
    risk_profile = models.CharField(max_length=255, blank=True, null=True)
    financial_goals = models.CharField(max_length=255, blank=True, null=True)
    investment_horizon = models.CharField(max_length=255, blank=True, null=True)
    profile_image = models.URLField(max_length=2000, blank=True, null=True)
    theme = models.CharField(max_length=50, default='dark')
    dashboard_layout = models.CharField(max_length=50, blank=True, null=True)
    is_ai_suggestion_on = models.BooleanField(default=True)

    # Required for Django admin compatibility
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name']

    objects = UserManager()

    def __str__(self):
        return self.email

    def has_perm(self, perm, obj=None):
        return self.is_superuser

    def has_module_perms(self, app_label):
        return self.is_superuser


class ActiveSession(models.Model):
    """Tracks active login sessions per user (max 5)."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sessions')
    token = models.TextField(unique=True)
    browser_type = models.CharField(max_length=255, blank=True, default='Unknown')
    os_type = models.CharField(max_length=255, blank=True, default='Unknown')
    login_time = models.DateTimeField(auto_now_add=True)
    last_active_time = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.email} - {self.browser_type}/{self.os_type}"


class SecurityAlert(models.Model):
    """Login security alerts (new device logins, logouts, etc.)."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='security_alerts')
    os_type = models.CharField(max_length=255)
    browser_type = models.CharField(max_length=255)
    alert_type = models.CharField(max_length=255)
    message = models.CharField(max_length=500)
    token = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} - {self.alert_type}"


class ActivityHistory(models.Model):
    """User activity log entries."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activity_history')
    os_type = models.CharField(max_length=255)
    browser_type = models.CharField(max_length=255)
    activity_type = models.CharField(max_length=255)
    message = models.CharField(max_length=500)
    token = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} - {self.activity_type}"
