import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class EmployeeProfile(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', _('Active')
        INACTIVE = 'INACTIVE', _('Inactive')
        ON_LEAVE = 'ON_LEAVE', _('On Leave')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='employee_profile'
    )
    employee_code = models.CharField(max_length=30, unique=True, db_index=True)
    phone = models.CharField(max_length=30, blank=True, null=True)
    designation = models.CharField(max_length=100, default='Field Specialist')
    department = models.CharField(max_length=100, default='Operations')
    profile_image = models.ImageField(upload_to='employees/avatars/', blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    joining_date = models.DateField(default=timezone.localdate)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
        db_index=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('Employee Profile')
        verbose_name_plural = _('Employee Profiles')
        ordering = ['employee_code']

    def __str__(self):
        return f"{self.user.get_full_name()} ({self.employee_code}) - {self.designation}"
