from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.accounts.permissions import IsAdmin, IsAdminOrReadOnly
from .models import EmployeeCustomerAssignment
from .serializers import EmployeeCustomerAssignmentSerializer


class AssignmentViewSet(viewsets.ModelViewSet):
    queryset = EmployeeCustomerAssignment.objects.select_related(
        'employee__user',
        'customer__user',
        'assigned_by'
    ).all()
    serializer_class = EmployeeCustomerAssignmentSerializer
    permission_classes = [IsAdminOrReadOnly]
    filterset_fields = ['status', 'employee', 'customer']
    search_fields = [
        'employee__user__first_name',
        'employee__user__last_name',
        'employee__employee_code',
        'customer__company_name',
        'customer__customer_code'
    ]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return EmployeeCustomerAssignment.objects.none()
        if user.is_admin_role or user.is_staff or user.is_superuser:
            return self.queryset
        if user.is_employee_role and hasattr(user, 'employee_profile'):
            return self.queryset.filter(employee=user.employee_profile)
        if user.is_customer_role and hasattr(user, 'customer_profile'):
            return self.queryset.filter(customer=user.customer_profile)
        return self.queryset

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def approve(self, request, pk=None):
        assignment = self.get_object()
        if assignment.employee.status != 'ACTIVE' or not assignment.employee.user.is_active:
            return Response(
                {'detail': 'Only active employees can be assigned.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if assignment.customer.account_status == 'SUSPENDED' or not assignment.customer.user.is_active:
            return Response(
                {'detail': 'Suspended customers cannot receive assignments.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        duplicate = self.queryset.filter(
            employee=assignment.employee,
            customer=assignment.customer,
            status='ACTIVE',
        ).exclude(pk=assignment.pk).exists()
        if duplicate:
            return Response(
                {'detail': 'This employee is already actively assigned to this customer.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        assignment.status = EmployeeCustomerAssignment.Status.ACTIVE
        assignment.save()
        return Response({'id': str(assignment.id), 'status': assignment.status})

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def revoke(self, request, pk=None):
        assignment = self.get_object()
        assignment.status = EmployeeCustomerAssignment.Status.REVOKED
        assignment.save()
        return Response({'id': str(assignment.id), 'status': assignment.status})
