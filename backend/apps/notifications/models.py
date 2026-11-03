import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from apps.customers.models import CustomerProfile
from apps.reports.models import DailyReport


class Notification(models.Model):
    class EventType(models.TextChoices):
        REPORT_SUBMITTED = 'REPORT_SUBMITTED', _('Report Submitted')
        REPORT_UPDATED = 'REPORT_UPDATED', _('Report Updated')
        FEEDBACK_RECEIVED = 'FEEDBACK_RECEIVED', _('Feedback Received')
        REPLY_RECEIVED = 'REPLY_RECEIVED', _('Reply Received')
        ASSIGNMENT_CHANGED = 'ASSIGNMENT_CHANGED', _('Assignment Changed')
        SHIFT_SCHEDULED = 'SHIFT_SCHEDULED', _('Shift Scheduled')
        ATTENDANCE_EVENT = 'ATTENDANCE_EVENT', _('Attendance Event')
        ROBBERY_HOTSPOT_ALERT = 'ROBBERY_HOTSPOT_ALERT', _('Robbery Hotspot Alert')

    class Channel(models.TextChoices):
        IN_APP = 'IN_APP', _('In-App')
        EMAIL = 'EMAIL', _('Email')
        PUSH = 'PUSH', _('Push')

    class DeliveryStatus(models.TextChoices):
        PENDING = 'PENDING', _('Pending')
        SENT = 'SENT', _('Sent')
        FAILED = 'FAILED', _('Failed')
        READ = 'READ', _('Read')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    customer = models.ForeignKey(
        CustomerProfile,
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    daily_report = models.ForeignKey(
        DailyReport,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    event_type = models.CharField(max_length=50, choices=EventType.choices)
    title = models.CharField(max_length=255)
    message = models.TextField()
    channel = models.CharField(max_length=20, choices=Channel.choices, default=Channel.IN_APP)
    delivery_status = models.CharField(max_length=20, choices=DeliveryStatus.choices, default=DeliveryStatus.PENDING)
    scheduled_at = models.DateTimeField(default=timezone.now)
    sent_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('Notification')
        verbose_name_plural = _('Notifications')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} -> {self.recipient.email} ({self.delivery_status})"


class NotificationPreference(models.Model):
    class Frequency(models.TextChoices):
        INSTANT = 'INSTANT', _('Instant / Once in an hour')
        HOURLY = 'HOURLY', _('Hourly Digest')
        SIX_HOURS = '6HOURS', _('Every 6 Hours')
        DAILY = 'DAILY', _('At the Day End')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.OneToOneField(
        CustomerProfile,
        on_delete=models.CASCADE,
        related_name='notification_preference'
    )
    frequency = models.CharField(
        max_length=20,
        choices=Frequency.choices,
        default=Frequency.HOURLY
    )
    immediate_alert_on_suspicious = models.BooleanField(
        default=True,
        help_text=_('Emergency Robbery / Safe Area override alert')
    )
    in_app_enabled = models.BooleanField(default=True)
    email_enabled = models.BooleanField(default=True)
    push_enabled = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('Notification Preference')
        verbose_name_plural = _('Notification Preferences')

    def __str__(self):
        return f"Preferences for {self.customer.company_name} ({self.frequency})"


class PushDevice(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='push_devices'
    )
    device_token = models.CharField(max_length=255)
    device_type = models.CharField(max_length=20, default='web')
    created_at = models.DateTimeField(auto_now_add=True)
    last_active_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('Push Device')
        verbose_name_plural = _('Push Devices')
