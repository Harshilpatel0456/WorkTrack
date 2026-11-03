from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.accounts.permissions import IsAdmin, IsAdminOrReadOnly
from .models import EmployeeProfile
from .serializers import EmployeeProfileSerializer


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = EmployeeProfile.objects.select_related('user').all()
    serializer_class = EmployeeProfileSerializer
    permission_classes = [IsAdminOrReadOnly]
    search_fields = ['employee_code', 'user__first_name', 'user__last_name', 'user__email', 'department']
    filterset_fields = ['status', 'department']
    ordering_fields = ['employee_code', 'user__first_name', 'joining_date']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return EmployeeProfile.objects.none()
        if user.role == 'ADMIN' or user.is_staff or user.is_superuser:
            return self.queryset
        if user.role == 'EMPLOYEE' and hasattr(user, 'employee_profile'):
            return self.queryset.filter(pk=user.employee_profile.pk)
        return EmployeeProfile.objects.none()

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        if not hasattr(request.user, 'employee_profile'):
            return Response({'error': 'User has no employee profile.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = self.get_serializer(request.user.employee_profile)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def toggle_status(self, request, pk=None):
        employee = self.get_object()
        employee.status = (
            EmployeeProfile.Status.INACTIVE
            if employee.status == EmployeeProfile.Status.ACTIVE
            else EmployeeProfile.Status.ACTIVE
        )
        employee.save()
        employee.user.is_active = employee.status == EmployeeProfile.Status.ACTIVE
        employee.user.save(update_fields=['is_active'])
        return Response({'id': str(employee.id), 'status': employee.status})

    def destroy(self, request, *args, **kwargs):
        employee = self.get_object()
        employee.status = EmployeeProfile.Status.INACTIVE
        employee.save(update_fields=['status', 'updated_at'])
        employee.user.is_active = False
        employee.user.save(update_fields=['is_active'])
        return Response(status=status.HTTP_204_NO_CONTENT)
