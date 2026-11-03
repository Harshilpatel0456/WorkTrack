from rest_framework import serializers
from .models import EmployeeCustomerAssignment
from apps.employees.models import EmployeeProfile
from apps.customers.models import CustomerProfile


class EmployeeCustomerAssignmentSerializer(serializers.ModelSerializer):
    employeeId = serializers.PrimaryKeyRelatedField(
        queryset=EmployeeProfile.objects.all(),
        source='employee'
    )
    customerId = serializers.PrimaryKeyRelatedField(
        queryset=CustomerProfile.objects.all(),
        source='customer'
    )
    employeeName = serializers.CharField(source='employee.user.get_full_name', read_only=True)
    employeeCode = serializers.CharField(source='employee.employee_code', read_only=True)
    customerName = serializers.CharField(source='customer.company_name', read_only=True)
    customerCode = serializers.CharField(source='customer.customer_code', read_only=True)
    assignedByName = serializers.CharField(source='assigned_by.get_full_name', read_only=True)

    class Meta:
        model = EmployeeCustomerAssignment
        fields = [
            'id',
            'employeeId',
            'customerId',
            'employeeName',
            'employeeCode',
            'customerName',
            'customerCode',
            'assignedByName',
            'status',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'assignedByName', 'created_at', 'updated_at']

    def validate(self, attrs):
        employee = attrs.get('employee', getattr(self.instance, 'employee', None))
        customer = attrs.get('customer', getattr(self.instance, 'customer', None))
        status_value = attrs.get(
            'status',
            getattr(self.instance, 'status', EmployeeCustomerAssignment.Status.ACTIVE),
        )

        if status_value == EmployeeCustomerAssignment.Status.ACTIVE:
            if employee and (
                employee.status != EmployeeProfile.Status.ACTIVE or not employee.user.is_active
            ):
                raise serializers.ValidationError({'employeeId': 'Only active employees can be assigned.'})
            if customer and (
                customer.account_status == CustomerProfile.AccountStatus.SUSPENDED or not customer.user.is_active
            ):
                raise serializers.ValidationError({'customerId': 'Suspended customers cannot receive assignments.'})

            duplicates = EmployeeCustomerAssignment.objects.filter(
                employee=employee,
                customer=customer,
                status=EmployeeCustomerAssignment.Status.ACTIVE,
            )
            if self.instance:
                duplicates = duplicates.exclude(pk=self.instance.pk)
            if employee and customer and duplicates.exists():
                raise serializers.ValidationError('This employee is already actively assigned to this customer.')

        return attrs

    def create(self, validated_data):
        validated_data['assigned_by'] = self.context['request'].user
        return super().create(validated_data)
