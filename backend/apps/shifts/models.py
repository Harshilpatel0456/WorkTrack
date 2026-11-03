import uuid
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from apps.assignments.models import EmployeeCustomerAssignment


def all_weekdays():
    return list(range(7))


class Shift(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    start_time = models.TimeField()
    end_time = models.TimeField()
    description = models.TextField(blank=True, null=True)
    is_overnight = models.BooleanField(default=False)
    working_days = models.JSONField(default=all_weekdays)
    is_active = models.BooleanField(default=True, db_index=True)
    color_tag = models.CharField(max_length=10, default='#3B82F6')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('Shift Template')
        verbose_name_plural = _('Shift Templates')
        ordering = ['start_time']

    def __str__(self):
        return f"{self.name} ({self.start_time.strftime('%H:%M')} - {self.end_time.strftime('%H:%M')})"


class ShiftAssignment(models.Model):
    class Status(models.TextChoices):
        SCHEDULED = 'SCHEDULED', _('Scheduled')
        IN_PROGRESS = 'IN_PROGRESS', _('In Progress')
        COMPLETED = 'COMPLETED', _('Completed')
        CANCELLED = 'CANCELLED', _('Cancelled')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee_customer_assignment = models.ForeignKey(
        EmployeeCustomerAssignment,
        on_delete=models.CASCADE,
        related_name='shift_schedules'
    )
    shift = models.ForeignKey(
        Shift,
        on_delete=models.PROTECT,
        related_name='scheduled_shifts'
    )
    shift_date = models.DateField(db_index=True)
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='created_shift_assignments'
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.SCHEDULED,
        db_index=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('Shift Assignment')
        verbose_name_plural = _('Shift Assignments')
        ordering = ['-shift_date', 'shift__start_time']
        constraints = [
            models.UniqueConstraint(
                fields=['employee_customer_assignment', 'shift', 'shift_date'],
                condition=models.Q(status__in=['SCHEDULED', 'IN_PROGRESS']),
                name='unique_emp_shift_per_date'
            )
        ]

    def __str__(self):
        emp = self.employee_customer_assignment.employee.employee_code
        cust = self.employee_customer_assignment.customer.company_name
        return f"{emp} @ {cust} on {self.shift_date} ({self.shift.name})"
