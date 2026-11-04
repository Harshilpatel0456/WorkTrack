import uuid
from django.db import models
from django.db.models import F, Q
from django.utils.translation import gettext_lazy as _
from apps.shifts.models import ShiftAssignment


class Attendance(models.Model):
    class Status(models.TextChoices):
        PRESENT = 'PRESENT', _('Present')
        LATE = 'LATE', _('Late')
        ABSENT = 'ABSENT', _('Absent')
        INCOMPLETE = 'INCOMPLETE', _('Incomplete')
        HALF_DAY = 'HALF_DAY', _('Half Day')
        OVERTIME = 'OVERTIME', _('Overtime')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    shift_assignment = models.OneToOneField(
        ShiftAssignment,
        on_delete=models.CASCADE,
        related_name='attendance_record'
    )
    check_in = models.DateTimeField(blank=True, null=True, db_index=True)
    check_out = models.DateTimeField(blank=True, null=True)
    attendance_status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ABSENT,
        db_index=True
    )
    duration_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    notes = models.TextField(blank=True, null=True)
    location_verified = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('Attendance Record')
        verbose_name_plural = _('Attendance Records')
        ordering = ['-created_at']
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(check_out__isnull=True)
                    | Q(check_in__isnull=False, check_out__gte=F('check_in'))
                ),
                name='attendance_checkout_after_checkin',
            ),
            models.CheckConstraint(
                condition=Q(duration_hours__gte=0),
                name='attendance_duration_nonnegative',
            ),
        ]
        indexes = [
            models.Index(fields=['attendance_status', 'check_in']),
        ]

    def __str__(self):
        return f"Attendance: {self.shift_assignment} ({self.attendance_status})"
