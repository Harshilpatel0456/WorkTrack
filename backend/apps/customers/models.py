import uuid
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _


class CustomerProfile(models.Model):
    class AccountStatus(models.TextChoices):
        ACTIVE = 'ACTIVE', _('Active')
        SUSPENDED = 'SUSPENDED', _('Suspended')
        TRIAL = 'TRIAL', _('Trial')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='customer_profile'
    )
    customer_code = models.CharField(max_length=30, unique=True, db_index=True)
    company_name = models.CharField(max_length=200, db_index=True)
    industry = models.CharField(max_length=100, blank=True, default='Retail Superstore')
    contact_person = models.CharField(max_length=150)
    phone = models.CharField(max_length=30, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    timezone = models.CharField(max_length=50, default='America/Chicago')
    account_status = models.CharField(
        max_length=20,
        choices=AccountStatus.choices,
        default=AccountStatus.ACTIVE,
        db_index=True
    )
    brand_color = models.CharField(max_length=10, default='#245CE2')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('Customer Profile')
        verbose_name_plural = _('Customer Profiles')
        ordering = ['company_name']

    def __str__(self):
        return f"{self.company_name} ({self.customer_code})"
