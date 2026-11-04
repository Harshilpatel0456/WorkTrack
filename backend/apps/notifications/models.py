import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from apps.customers.models import CustomerProfile
from apps.reports.models import DailyReport


def default_notification_categories():
    return ['ATTENDANCE', 'REPORTS', 'FEEDBACK', 'SHIFTS', 'SYSTEM']


class Notification(models.Model):
    class EventType(models.TextChoices):
        CHECK_IN = 'CHECK_IN', _('Employee Checked In')
        CHECK_OUT = 'CHECK_OUT', _('Employee Checked Out')
        LATE_ARRIVAL = 'LATE_ARRIVAL', _('Late Arrival')
        ABSENCE = 'ABSENCE', _('Absence')
        REPORT_SUBMITTED = 'REPORT_SUBMITTED', _('Report Submitted')
        REPORT_UPDATED = 'REPORT_UPDATED', _('Report Updated')
        FEEDBACK_RECEIVED = 'FEEDBACK_RECEIVED', _('Feedback Received')
        REPLY_RECEIVED = 'REPLY_RECEIVED', _('Reply Received')
        ASSIGNMENT_CHANGED = 'ASSIGNMENT_CHANGED', _('Assignment Changed')
        SHIFT_SCHEDULED = 'SHIFT_SCHEDULED', _('Shift Scheduled')
        SHIFT_CHANGED = 'SHIFT_CHANGED', _('Shift Changed')
        ATTENDANCE_EVENT = 'ATTENDANCE_EVENT', _('Attendance Event')
        ADMIN_ACTION = 'ADMIN_ACTION', _('Administrative Action')
        ROBBERY_HOTSPOT_ALERT = 'ROBBERY_HOTSPOT_ALERT', _('Robbery Hotspot Alert')

    class Category(models.TextChoices):
        ATTENDANCE = 'ATTENDANCE', _('Attendance')
        REPORTS = 'REPORTS', _('Reports')
        FEEDBACK = 'FEEDBACK', _('Feedback')
        SHIFTS = 'SHIFTS', _('Shifts')
        SYSTEM = 'SYSTEM', _('System')

    class Channel(models.TextChoices):
        IN_APP = 'IN_APP', _('In-App')
        EMAIL = 'EMAIL', _('Email')
        PUSH = 'PUSH', _('Push')

    class DeliveryStatus(models.TextChoices):
        PENDING = 'PENDING', _('Pending')
        SENT = 'SENT', _('Sent')
        FAILED = 'FAILED', _('Failed')
        READ = 'READ', _('Read')

    class EmailDeliveryStatus(models.TextChoices):
        SKIPPED = 'SKIPPED', _('Skipped')
        PENDING = 'PENDING', _('Pending')
        QUEUED = 'QUEUED', _('Queued')
        SENDING = 'SENDING', _('Sending')
        SENT = 'SENT', _('Sent')
        FAILED = 'FAILED', _('Failed')

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
        blank=True,
    )
    daily_report = models.ForeignKey(
        DailyReport,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    event_type = models.CharField(max_length=50, choices=EventType.choices)
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.SYSTEM)
    event_key = models.CharField(max_length=255, unique=True, default=uuid.uuid4)
    title = models.CharField(max_length=255)
    message = models.TextField()
    channel = models.CharField(max_length=20, choices=Channel.choices, default=Channel.IN_APP)
    delivery_status = models.CharField(max_length=20, choices=DeliveryStatus.choices, default=DeliveryStatus.PENDING)
    email_delivery_status = models.CharField(
        max_length=20,
        choices=EmailDeliveryStatus.choices,
        default=EmailDeliveryStatus.SKIPPED,
    )
    email_attempts = models.PositiveSmallIntegerField(default=0)
    email_error = models.TextField(blank=True)
    scheduled_at = models.DateTimeField(default=timezone.now)
    sent_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('Notification')
        verbose_name_plural = _('Notifications')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'read_at']),
            models.Index(fields=['email_delivery_status', 'scheduled_at']),
        ]

    def __str__(self):
        return f"{self.title} -> {self.recipient.email} ({self.delivery_status})"


class NotificationPreference(models.Model):
    class Frequency(models.TextChoices):
        INSTANT = 'INSTANT', _('Instant')
        HOURLY = 'HOURLY', _('Hourly Digest')
        DAILY = 'DAILY', _('Daily Digest')
        WEEKLY = 'WEEKLY', _('Weekly Digest')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notification_preference',
    )
    frequency = models.CharField(
        max_length=20,
        choices=Frequency.choices,
        default=Frequency.INSTANT
    )
    enabled_categories = models.JSONField(default=default_notification_categories)
    in_app_enabled = models.BooleanField(default=True)
    email_enabled = models.BooleanField(default=True)
    timezone = models.CharField(max_length=64, default='UTC')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('Notification Preference')
        verbose_name_plural = _('Notification Preferences')

    def __str__(self):
        return f"Preferences for {self.user.email} ({self.frequency})"


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
