"""Identity. Organisation, Membership and Address arrive with SM-F-01.

The custom user exists from the first migration because Django cannot swap
AUTH_USER_MODEL safely once migrations have run.
"""

import uuid
from typing import ClassVar

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager["User"]):
    def create_user(self, email: str, password: str | None = None, **extra) -> "User":
        if not email:
            raise ValueError("An email address is required.")
        user = self.model(email=self.normalize_email(email.strip()).lower(), **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email: str, password: str, **extra) -> "User":
        extra.update(is_staff=True, is_superuser=True)
        return self.create_user(email, password, **extra)


# Both bases declare an abstract Meta; Django merges them correctly.
class User(AbstractBaseUser, PermissionsMixin):  # pyright: ignore[reportIncompatibleVariableOverride]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    display_name = models.CharField(max_length=150, blank=True)
    email_verified_at = models.DateTimeField(null=True, blank=True)
    phone_verified_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)
    avatar_id: uuid.UUID | None  # foreign-key columns, declared for the type checker
    avatar_dark_id: uuid.UUID | None
    # Profile photo. Seeded people carry a second version prepared for the dark theme; an uploaded
    # photo is used in both themes.
    avatar = models.ForeignKey("media.FileAsset", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    avatar_dark = models.ForeignKey(
        "media.FileAsset", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )

    objects = UserManager()
    USERNAME_FIELD = "email"
    EMAIL_FIELD = "email"
    REQUIRED_FIELDS: ClassVar[list[str]] = []

    def __str__(self) -> str:
        return self.display_name or self.email


class EmailVerification(models.Model):
    """A six-digit code sent to confirm an address. Only its hash is stored; it expires and counts tries."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="verifications")
    email = models.EmailField()
    code_hash = models.CharField(max_length=64)
    attempts = models.PositiveSmallIntegerField(default=0)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return f"Verification for {self.email}"
