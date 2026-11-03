import uuid
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from apps.shifts.models import ShiftAssignment


class DailyReport(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', _('Draft')
        SUBMITTED = 'SUBMITTED', _('Submitted')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    shift_assignment = models.OneToOneField(
        ShiftAssignment,
        on_delete=models.CASCADE,
        related_name='daily_report'
    )
    title = models.CharField(max_length=255)
    work_summary = models.TextField()
    tasks_completed = models.TextField(blank=True, null=True)
    pending_tasks = models.TextField(blank=True, null=True)
    issues_or_blockers = models.TextField(blank=True, null=True)
    additional_remarks = models.TextField(blank=True, null=True)
    version = models.IntegerField(default=1)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True
    )
    submitted_at = models.DateTimeField(blank=True, null=True, db_index=True)
    last_updated_at = models.DateTimeField(blank=True, null=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='authored_reports'
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='updated_reports',
        blank=True,
        null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('Daily Report')
        verbose_name_plural = _('Daily Reports')
        ordering = ['-submitted_at', '-created_at']

    def __str__(self):
        return f"Report v{self.version}: {self.title} ({self.status})"


class ReportVersion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    daily_report = models.ForeignKey(
        DailyReport,
        on_delete=models.CASCADE,
        related_name='versions'
    )
    version_number = models.IntegerField()
    title_snapshot = models.CharField(max_length=255)
    content_snapshot = models.JSONField()
    modified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT
    )
    modified_at = models.DateTimeField(auto_now_add=True)
    change_summary = models.TextField(blank=True)

    class Meta:
        verbose_name = _('Report Version')
        verbose_name_plural = _('Report Versions')
        ordering = ['-version_number']
        constraints = [
            models.UniqueConstraint(
                fields=['daily_report', 'version_number'],
                name='unique_report_version'
            )
        ]

    def __str__(self):
        return f"{self.daily_report.title} - v{self.version_number}"


class ReportAttachment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    daily_report = models.ForeignKey(
        DailyReport,
        on_delete=models.CASCADE,
        related_name='attachments'
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT
    )
    file = models.FileField(upload_to='reports/attachments/%Y/%m/')
    file_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=100)
    file_size = models.IntegerField(help_text=_('Size in bytes'))
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('Report Attachment')
        verbose_name_plural = _('Report Attachments')
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.file_name} ({self.file_size} bytes)"
