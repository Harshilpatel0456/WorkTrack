import uuid
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from apps.employees.models import EmployeeProfile
from apps.customers.models import CustomerProfile


class EmployeeCustomerAssignment(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', _('Pending')
        ACTIVE = 'ACTIVE', _('Active')
        REVOKED = 'REVOKED', _('Revoked')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(
        EmployeeProfile,
        on_delete=models.PROTECT,
        related_name='customer_assignments'
    )
    customer = models.ForeignKey(
        CustomerProfile,
        on_delete=models.PROTECT,
        related_name='employee_assignments'
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='created_assignments'
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
        db_index=True
    )
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('Employee Customer Assignment')
        verbose_name_plural = _('Employee Customer Assignments')
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['employee', 'customer'],
                condition=models.Q(status='ACTIVE'),
                name='unique_active_employee_customer_assignment'
            )
        ]

    def __str__(self):
        return f"{self.employee.employee_code} -> {self.customer.company_name} ({self.status})"
