import uuid
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from apps.reports.models import DailyReport


class ReportComment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    daily_report = models.ForeignKey(
        DailyReport,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    parent_comment = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='replies'
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='report_comments'
    )
    content = models.TextField()
    is_edited = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('Report Comment')
        verbose_name_plural = _('Report Comments')
        ordering = ['created_at']

    def __str__(self):
        return f"Comment by {self.author.get_full_name()} on {self.daily_report.title}"
