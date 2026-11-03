import uuid
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _


class ActivityLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='activity_logs'
    )
    action = models.CharField(max_length=100, db_index=True)
    entity_type = models.CharField(max_length=50, db_index=True)
    entity_id = models.CharField(max_length=100)
    description = models.TextField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = _('Activity Log')
        verbose_name_plural = _('Activity Logs')
        ordering = ['-created_at']

    def __str__(self):
        actor = self.user.email if self.user else 'System'
        return f"{self.created_at.strftime('%Y-%m-%d %H:%M')} [{self.action}] {actor}: {self.description}"
