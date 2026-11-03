from rest_framework import serializers
from .models import Shift, ShiftAssignment
from apps.assignments.models import EmployeeCustomerAssignment


class ShiftSerializer(serializers.ModelSerializer):
    startTime = serializers.TimeField(source='start_time')
    endTime = serializers.TimeField(source='end_time')
    isOvernight = serializers.BooleanField(source='is_overnight', default=False)
    colorTag = serializers.CharField(source='color_tag', default='#3B82F6')

    class Meta:
        model = Shift
        fields = [
            'id',
            'name',
            'startTime',
            'endTime',
            'description',
            'isOvernight',
            'colorTag',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ShiftAssignmentSerializer(serializers.ModelSerializer):
    assignmentId = serializers.PrimaryKeyRelatedField(
        queryset=EmployeeCustomerAssignment.objects.all(),
        source='employee_customer_assignment'
    )
    shiftId = serializers.PrimaryKeyRelatedField(
        queryset=Shift.objects.all(),
        source='shift'
    )
    shiftName = serializers.CharField(source='shift.name', read_only=True)
    shiftStartTime = serializers.TimeField(source='shift.start_time', read_only=True)
    shiftEndTime = serializers.TimeField(source='shift.end_time', read_only=True)
    employeeName = serializers.CharField(
        source='employee_customer_assignment.employee.user.get_full_name',
        read_only=True
    )
    employeeCode = serializers.CharField(
        source='employee_customer_assignment.employee.employee_code',
        read_only=True
    )
    customerName = serializers.CharField(
        source='employee_customer_assignment.customer.company_name',
        read_only=True
    )
    shiftDate = serializers.DateField(source='shift_date')

    class Meta:
        model = ShiftAssignment
        fields = [
            'id',
            'assignmentId',
            'shiftId',
            'shiftName',
            'shiftStartTime',
            'shiftEndTime',
            'employeeName',
            'employeeCode',
            'customerName',
            'shiftDate',
            'status',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def create(self, validated_data):
        validated_data['assigned_by'] = self.context['request'].user
        return super().create(validated_data)

