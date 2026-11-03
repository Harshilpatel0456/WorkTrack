from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.accounts.permissions import IsAdmin, IsAdminOrReadOnly
from apps.employees.serializers import EmployeeProfileSerializer
from .models import CustomerProfile
from .serializers import CustomerProfileSerializer


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = CustomerProfile.objects.select_related('user').all()
    serializer_class = CustomerProfileSerializer
    permission_classes = [IsAdminOrReadOnly]
    search_fields = ['company_name', 'customer_code', 'contact_person', 'user__email', 'industry']
    filterset_fields = ['account_status', 'industry']
    ordering_fields = ['company_name', 'customer_code', 'created_at']

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        if not hasattr(request.user, 'customer_profile'):
            return Response({'error': 'User has no customer profile.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = self.get_serializer(request.user.customer_profile)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def toggle_status(self, request, pk=None):
        customer = self.get_object()
        customer.account_status = CustomerProfile.AccountStatus.SUSPENDED if customer.account_status == CustomerProfile.AccountStatus.ACTIVE else CustomerProfile.AccountStatus.ACTIVE
        customer.save()
        return Response({'id': str(customer.id), 'accountStatus': customer.account_status})

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def my_employees(self, request):
        customer = getattr(request.user, 'customer_profile', None)
        if not customer:
            return Response({'error': 'Customer account required.'}, status=status.HTTP_403_FORBIDDEN)
        assignments = customer.employee_assignments.filter(status='ACTIVE').select_related('employee__user')
        employees = [a.employee for a in assignments]
        serializer = EmployeeProfileSerializer(employees, many=True)
        return Response(serializer.data)
