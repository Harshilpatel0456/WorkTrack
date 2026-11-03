from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.assignments.models import EmployeeCustomerAssignment
from apps.accounts.permissions import IsAdmin, IsAdminOrReadOnly
from .models import Shift, ShiftAssignment
from .serializers import ShiftSerializer, ShiftAssignmentSerializer


class ShiftViewSet(viewsets.ModelViewSet):
    queryset = Shift.objects.all()
    serializer_class = ShiftSerializer
    permission_classes = [IsAdminOrReadOnly]
    filterset_fields = ['is_active', 'is_overnight']
    search_fields = ['name', 'description']

    def destroy(self, request, *args, **kwargs):
        shift = self.get_object()
        if shift.scheduled_shifts.exists():
            return Response(
                {'detail': 'This shift is used by schedules. Deactivate it instead of deleting it.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)


class ShiftAssignmentViewSet(viewsets.ModelViewSet):
    queryset = ShiftAssignment.objects.select_related(
        'employee_customer_assignment__employee__user',
        'employee_customer_assignment__customer__user',
        'shift'
    ).all()
    serializer_class = ShiftAssignmentSerializer
    permission_classes = [IsAdminOrReadOnly]
    filterset_fields = ['status', 'shift_date', 'shift']
    search_fields = [
        'employee_customer_assignment__employee__user__first_name',
        'employee_customer_assignment__employee__user__last_name',
        'employee_customer_assignment__customer__company_name'
    ]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return ShiftAssignment.objects.none()
        if user.is_admin_role or user.is_staff or user.is_superuser:
            return self.queryset
        if user.is_employee_role and hasattr(user, 'employee_profile'):
            return self.queryset.filter(employee_customer_assignment__employee=user.employee_profile)
        if user.is_customer_role and hasattr(user, 'customer_profile'):
            return self.queryset.filter(employee_customer_assignment__customer=user.customer_profile)
        return ShiftAssignment.objects.none()

    def perform_create(self, serializer):
        serializer.save(assigned_by=self.request.user)

    @action(detail=False, methods=['get'])
    def my_shifts(self, request):
        if not hasattr(request.user, 'employee_profile'):
            return Response({'error': 'Employee profile required.'}, status=status.HTTP_403_FORBIDDEN)
        shifts = self.queryset.filter(
            employee_customer_assignment__employee=request.user.employee_profile
        ).order_by('-shift_date')
        serializer = self.get_serializer(shifts, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def cancel(self, request, pk=None):
        assignment = self.get_object()
        if assignment.status != ShiftAssignment.Status.SCHEDULED:
            return Response(
                {'detail': 'Only scheduled shifts can be cancelled.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        assignment.status = ShiftAssignment.Status.CANCELLED
        assignment.save()
        return Response({'id': str(assignment.id), 'status': assignment.status})

    def destroy(self, request, *args, **kwargs):
        assignment = self.get_object()
        if assignment.status != ShiftAssignment.Status.SCHEDULED:
            return Response(
                {'detail': 'Only scheduled shifts can be removed.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        assignment.status = ShiftAssignment.Status.CANCELLED
        assignment.save(update_fields=['status', 'updated_at'])
        return Response(status=status.HTTP_204_NO_CONTENT)
