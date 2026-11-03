from rest_framework import serializers
from apps.shifts.models import ShiftAssignment
from apps.attendance.models import Attendance
from apps.shifts.serializers import ShiftAssignmentSerializer


class AttendanceSerializer(serializers.ModelSerializer):
    shift_details = ShiftAssignmentSerializer(source='shift_assignment', read_only=True)
    employee_name = serializers.SerializerMethodField()
    customer_name = serializers.SerializerMethodField()
    shift_name = serializers.SerializerMethodField()

    class Meta:
        model = Attendance
        fields = [
            'id',
            'shift_assignment',
            'shift_details',
            'employee_name',
            'customer_name',
            'shift_name',
            'check_in',
            'check_out',
            'attendance_status',
            'duration_hours',
            'notes',
            'location_verified',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'duration_hours', 'created_at', 'updated_at']

    def get_employee_name(self, obj):
        try:
            return obj.shift_assignment.employee_customer_assignment.employee.user.get_full_name()
        except Exception:
            return None

    def get_customer_name(self, obj):
        try:
            return obj.shift_assignment.employee_customer_assignment.customer.company_name
        except Exception:
            return None

    def get_shift_name(self, obj):
        try:
            return obj.shift_assignment.shift.name
        except Exception:
            return None


class CheckInSerializer(serializers.Serializer):
    shift_assignment_id = serializers.UUIDField(required=True)
    notes = serializers.CharField(required=False, allow_blank=True, default='')
    location_verified = serializers.BooleanField(required=False, default=True)


class CheckOutSerializer(serializers.Serializer):
    shift_assignment_id = serializers.UUIDField(required=True)
    notes = serializers.CharField(required=False, allow_blank=True, default='')

