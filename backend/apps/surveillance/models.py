import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.customers.models import CustomerProfile
from apps.employees.models import EmployeeProfile


class SurveillanceBatch(models.Model):
    class Status(models.TextChoices):
        READY_FOR_REVIEW = 'Ready for Review', _('Ready for Review')
        SUBMITTED = 'Submitted', _('Submitted')

    id = models.CharField(max_length=50, primary_key=True)
    customer = models.ForeignKey(
        CustomerProfile,
        on_delete=models.CASCADE,
        related_name='surveillance_batches'
    )
    employee = models.ForeignKey(
        EmployeeProfile,
        on_delete=models.PROTECT,
        related_name='audited_surveillance_batches'
    )
    date = models.DateField(db_index=True)
    hour_slot = models.CharField(max_length=20)
    hour24 = models.CharField(max_length=10)
    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.READY_FOR_REVIEW,
        db_index=True
    )
    total_cameras = models.IntegerField(default=10)
    flagged_suspicious_count = models.IntegerField(default=0)
    overall_assessment = models.TextField(blank=True)
    actions_taken = models.TextField(blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    customer_notified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('Surveillance Batch')
        verbose_name_plural = _('Surveillance Batches')
        ordering = ['-date', '-hour24']

    def __str__(self):
        return f"{self.customer.company_name} - {self.hour_slot} ({self.status})"


class CameraSnapshot(models.Model):
    class AIStatus(models.TextChoices):
        OK = 'OK', _('OK / Normal')
        SUSPICIOUS = 'Suspicious', _('Suspicious')

    class VerificationStatus(models.TextChoices):
        VERIFIED_OK = 'Verified OK', _('Verified OK')
        FLAGGED_SUSPICIOUS = 'Flagged Suspicious', _('Flagged Suspicious')
        PENDING = 'Pending', _('Pending')

    id = models.CharField(max_length=50, primary_key=True)
    batch = models.ForeignKey(
        SurveillanceBatch,
        on_delete=models.CASCADE,
        related_name='snapshots'
    )
    camera_id = models.CharField(max_length=20)
    camera_name = models.CharField(max_length=100)
    zone = models.CharField(max_length=100)
    is_high_risk = models.BooleanField(default=False)
    capture_time = models.CharField(max_length=20)
    human_detected = models.BooleanField(default=False)
    human_count = models.IntegerField(default=0)
    ai_status = models.CharField(max_length=20, choices=AIStatus.choices, default=AIStatus.OK)
    ai_confidence = models.CharField(max_length=10, default='95%')
    ai_analysis = models.TextField()
    employee_verification = models.CharField(
        max_length=30,
        choices=VerificationStatus.choices,
        default=VerificationStatus.VERIFIED_OK
    )
    employee_notes = models.TextField(blank=True)
    simulated_visual = models.CharField(max_length=50, default='normal')

    class Meta:
        verbose_name = _('Camera Snapshot')
        verbose_name_plural = _('Camera Snapshots')
        ordering = ['camera_id']

    def __str__(self):
        return f"{self.camera_id} ({self.camera_name}) - {self.ai_status}"
