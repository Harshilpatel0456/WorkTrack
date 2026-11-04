from datetime import datetime, timedelta

from django.db import transaction
from rest_framework import serializers
from .models import Shift, ShiftAssignment
from apps.assignments.models import EmployeeCustomerAssignment
from apps.employees.models import EmployeeProfile


class ShiftSerializer(serializers.ModelSerializer):
    startTime = serializers.TimeField(source='start_time')
    endTime = serializers.TimeField(source='end_time')
    gracePeriodMinutes = serializers.IntegerField(
        source='grace_period_minutes',
        min_value=0,
        default=15,
    )
    isOvernight = serializers.BooleanField(source='is_overnight', default=False)
    workingDays = serializers.ListField(
        source='working_days',
        child=serializers.IntegerField(min_value=0, max_value=6),
        allow_empty=False,
        default=list(range(7)),
    )
    colorTag = serializers.CharField(source='color_tag', default='#3B82F6')

    class Meta:
        model = Shift
        fields = [
            'id',
            'name',
            'startTime',
            'endTime',
            'gracePeriodMinutes',
            'description',
            'isOvernight',
            'workingDays',
            'colorTag',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, attrs):
        start_time = attrs.get('start_time', getattr(self.instance, 'start_time', None))
        end_time = attrs.get('end_time', getattr(self.instance, 'end_time', None))
        is_overnight = attrs.get('is_overnight', getattr(self.instance, 'is_overnight', False))
        working_days = attrs.get('working_days', getattr(self.instance, 'working_days', list(range(7))))

        if start_time and end_time:
            if start_time == end_time:
                raise serializers.ValidationError({'endTime': 'Start and end times must be different.'})
            if is_overnight != (end_time < start_time):
                raise serializers.ValidationError({
                    'isOvernight': 'Enable overnight only when the end time is earlier than the start time.'
                })
        if len(working_days) != len(set(working_days)):
            raise serializers.ValidationError({'workingDays': 'Working days must not contain duplicates.'})
        if self.instance:
            active_schedules = self.instance.scheduled_shifts.filter(
                status__in=[ShiftAssignment.Status.SCHEDULED, ShiftAssignment.Status.IN_PROGRESS]
            ).select_related('employee_customer_assignment__employee', 'shift')
            for schedule in active_schedules:
                if schedule.shift_date.weekday() not in working_days:
                    raise serializers.ValidationError({
                        'workingDays': 'Cannot remove a day used by an active scheduled shift.'
                    })
                start = datetime.combine(schedule.shift_date, start_time)
                end = datetime.combine(
                    schedule.shift_date + (timedelta(days=1) if is_overnight else timedelta()),
                    end_time,
                )
                peers = ShiftAssignment.objects.filter(
                    employee_customer_assignment__employee=schedule.employee_customer_assignment.employee,
                    shift_date__gte=schedule.shift_date - timedelta(days=1),
                    shift_date__lte=schedule.shift_date + timedelta(days=1),
                    status__in=[ShiftAssignment.Status.SCHEDULED, ShiftAssignment.Status.IN_PROGRESS],
                ).exclude(pk=schedule.pk).select_related('shift')
                for peer in peers:
                    peer_start = datetime.combine(peer.shift_date, peer.shift.start_time)
                    peer_end = datetime.combine(
                        peer.shift_date + (timedelta(days=1) if peer.shift.is_overnight else timedelta()),
                        peer.shift.end_time,
                    )
                    if start < peer_end and peer_start < end:
                        raise serializers.ValidationError({
                            'startTime': 'This change would make an existing employee schedule overlap.'
                        })
        return attrs


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
    employeeId = serializers.CharField(
        source='employee_customer_assignment.employee.id',
        read_only=True
    )
    customerId = serializers.CharField(
        source='employee_customer_assignment.customer.id',
        read_only=True
    )
    customerIndustry = serializers.CharField(
        source='employee_customer_assignment.customer.industry',
        read_only=True
    )
    customerAddress = serializers.CharField(
        source='employee_customer_assignment.customer.address',
        read_only=True
    )
    customerContactPerson = serializers.CharField(
        source='employee_customer_assignment.customer.contact_person',
        read_only=True
    )
    customerPhone = serializers.CharField(
        source='employee_customer_assignment.customer.phone',
        read_only=True
    )
    notes = serializers.CharField(
        source='employee_customer_assignment.notes',
        read_only=True,
    )
    workingDays = serializers.ListField(source='shift.working_days', read_only=True)
    isOvernight = serializers.BooleanField(source='shift.is_overnight', read_only=True)

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
            'employeeId',
            'customerName',
            'customerId',
            'customerIndustry',
            'customerAddress',
            'customerContactPerson',
            'customerPhone',
            'shiftDate',
            'notes',
            'workingDays',
            'isOvernight',
            'status',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'status']

    def validate(self, attrs):
        assignment = attrs.get(
            'employee_customer_assignment',
            getattr(self.instance, 'employee_customer_assignment', None),
        )
        shift = attrs.get('shift', getattr(self.instance, 'shift', None))
        shift_date = attrs.get('shift_date', getattr(self.instance, 'shift_date', None))
        status_value = attrs.get('status', getattr(self.instance, 'status', ShiftAssignment.Status.SCHEDULED))

        if status_value in (ShiftAssignment.Status.SCHEDULED, ShiftAssignment.Status.IN_PROGRESS):
            if not assignment or assignment.status != EmployeeCustomerAssignment.Status.ACTIVE:
                raise serializers.ValidationError({
                    'assignmentId': 'An active employee-customer assignment is required.'
                })
            employee = assignment.employee
            customer = assignment.customer
            if employee.status != EmployeeProfile.Status.ACTIVE or not employee.user.is_active:
                raise serializers.ValidationError({'assignmentId': 'The employee account is inactive.'})
            if customer.account_status == 'SUSPENDED' or not customer.user.is_active:
                raise serializers.ValidationError({'assignmentId': 'The customer account is inactive.'})
            if not shift or not shift.is_active:
                raise serializers.ValidationError({'shiftId': 'An active shift template is required.'})
            if shift_date and shift_date.weekday() not in shift.working_days:
                raise serializers.ValidationError({
                    'shiftDate': 'The selected date is not a working day for this shift.'
                })
            if shift_date:
                self._validate_no_overlap(employee, shift, shift_date)
        return attrs

    def _validate_no_overlap(self, employee, shift, shift_date):
        candidate_start = datetime.combine(shift_date, shift.start_time)
        candidate_end = datetime.combine(
            shift_date + (timedelta(days=1) if shift.is_overnight else timedelta()),
            shift.end_time,
        )
        schedules = ShiftAssignment.objects.filter(
            employee_customer_assignment__employee=employee,
            shift_date__gte=shift_date - timedelta(days=1),
            shift_date__lte=shift_date + timedelta(days=1),
            status__in=[ShiftAssignment.Status.SCHEDULED, ShiftAssignment.Status.IN_PROGRESS],
        ).select_related('shift')
        if self.instance:
            schedules = schedules.exclude(pk=self.instance.pk)
        for schedule in schedules:
            existing_start = datetime.combine(schedule.shift_date, schedule.shift.start_time)
            existing_end = datetime.combine(
                schedule.shift_date + (timedelta(days=1) if schedule.shift.is_overnight else timedelta()),
                schedule.shift.end_time,
            )
            if candidate_start < existing_end and existing_start < candidate_end:
                raise serializers.ValidationError({
                    'shiftDate': 'This employee already has an overlapping shift assignment.'
                })

    @transaction.atomic
    def create(self, validated_data):
        assignment = validated_data['employee_customer_assignment']
        EmployeeProfile.objects.select_for_update().get(pk=assignment.employee_id)
        self.validate(validated_data)
        validated_data['assigned_by'] = self.context['request'].user
        return super().create(validated_data)

    @transaction.atomic
    def update(self, instance, validated_data):
        assignment = validated_data.get(
            'employee_customer_assignment',
            instance.employee_customer_assignment,
        )
        EmployeeProfile.objects.select_for_update().get(pk=assignment.employee_id)
        self.validate(validated_data)
        return super().update(instance, validated_data)
