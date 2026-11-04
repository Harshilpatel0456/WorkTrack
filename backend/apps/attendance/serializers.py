from rest_framework import serializers
from apps.shifts.models import ShiftAssignment
from apps.attendance.models import Attendance
from apps.shifts.serializers import ShiftAssignmentSerializer


class AttendanceSerializer(serializers.ModelSerializer):
    shift_details = ShiftAssignmentSerializer(source='shift_assignment', read_only=True)
    employee_name = serializers.SerializerMethodField()
    customer_name = serializers.SerializerMethodField()
    shift_name = serializers.SerializerMethodField()
    employee_id = serializers.UUIDField(
        source='shift_assignment.employee_customer_assignment.employee_id',
        read_only=True,
    )
    customer_id = serializers.UUIDField(
        source='shift_assignment.employee_customer_assignment.customer_id',
        read_only=True,
    )
    shift_id = serializers.UUIDField(source='shift_assignment.shift_id', read_only=True)
    shift_date = serializers.DateField(source='shift_assignment.shift_date', read_only=True)
    shift_start = serializers.TimeField(source='shift_assignment.shift.start_time', read_only=True)
    shift_end = serializers.TimeField(source='shift_assignment.shift.end_time', read_only=True)
    customer_timezone = serializers.CharField(
        source='shift_assignment.employee_customer_assignment.customer.timezone',
        read_only=True,
    )

    class Meta:
        model = Attendance
        fields = [
            'id',
            'shift_assignment',
            'shift_details',
            'employee_name',
            'customer_name',
            'shift_name',
            'employee_id',
            'customer_id',
            'shift_id',
            'shift_date',
            'shift_start',
            'shift_end',
            'customer_timezone',
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
        return obj.shift_assignment.employee_customer_assignment.employee.user.get_full_name()

    def get_customer_name(self, obj):
        return obj.shift_assignment.employee_customer_assignment.customer.company_name

    def get_shift_name(self, obj):
        return obj.shift_assignment.shift.name


class CheckInSerializer(serializers.Serializer):
    shift_assignment_id = serializers.UUIDField(required=True)
    notes = serializers.CharField(required=False, allow_blank=True, default='')
    location_verified = serializers.BooleanField(required=False, default=True)


class CheckOutSerializer(serializers.Serializer):
    shift_assignment_id = serializers.UUIDField(required=True)
    notes = serializers.CharField(required=False, allow_blank=True, default='')


class AttendanceCorrectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendance
        fields = ['check_in', 'check_out', 'attendance_status', 'notes']

    def validate(self, attrs):
        check_in = attrs.get('check_in', self.instance.check_in)
        check_out = attrs.get('check_out', self.instance.check_out)
        attendance_status = attrs.get(
            'attendance_status',
            self.instance.attendance_status,
        )

        if check_out and not check_in:
            raise serializers.ValidationError({
                'check_out': 'A check-in is required before recording a check-out.'
            })
        if check_in and check_out and check_out < check_in:
            raise serializers.ValidationError({
                'check_out': 'Check-out cannot precede check-in.'
            })
        if attendance_status == Attendance.Status.ABSENT and (check_in or check_out):
            raise serializers.ValidationError({
                'attendance_status': 'Absent records cannot have punch timestamps.'
            })
        if attendance_status == Attendance.Status.INCOMPLETE and (not check_in or check_out):
            raise serializers.ValidationError({
                'attendance_status': 'Incomplete records require a check-in and no check-out.'
            })
        if attendance_status in (Attendance.Status.PRESENT, Attendance.Status.LATE) and not check_in:
            raise serializers.ValidationError({
                'attendance_status': 'Present and late records require a check-in.'
            })
        return attrs
