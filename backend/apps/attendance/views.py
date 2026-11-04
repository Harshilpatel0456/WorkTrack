import json
import uuid
from datetime import datetime, timedelta, timezone as dt_timezone
from decimal import Decimal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.db import transaction
from django.db.models import Count, Q, Sum
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.accounts.permissions import IsAdmin, IsCustomer, IsEmployee
from apps.attendance.models import Attendance
from apps.attendance.serializers import (
    AttendanceCorrectionSerializer,
    AttendanceSerializer,
    CheckInSerializer,
    CheckOutSerializer,
)
from apps.audit.models import ActivityLog
from apps.notifications.models import Notification
from apps.notifications.services import notify_assignment_recipients
from apps.shifts.models import ShiftAssignment
from apps.shifts.serializers import ShiftAssignmentSerializer


def _shift_bounds(assignment):
    customer = assignment.employee_customer_assignment.customer
    try:
        shift_timezone = ZoneInfo(customer.timezone)
    except ZoneInfoNotFoundError as exc:
        raise ValidationError({'timezone': f'Invalid customer timezone: {customer.timezone}.'}) from exc

    start = datetime.combine(assignment.shift_date, assignment.shift.start_time)
    end_date = assignment.shift_date + timedelta(days=1) if assignment.shift.is_overnight else assignment.shift_date
    end = datetime.combine(end_date, assignment.shift.end_time)
    return start.replace(tzinfo=shift_timezone).astimezone(dt_timezone.utc), end.replace(
        tzinfo=shift_timezone
    ).astimezone(dt_timezone.utc)


def _refresh_completed_attendance(assignments):
    now = timezone.now()
    for assignment in assignments:
        if assignment.status == ShiftAssignment.Status.CANCELLED:
            continue
        _, end = _shift_bounds(assignment)
        if end > now:
            continue

        attendance, created = Attendance.objects.get_or_create(
            shift_assignment=assignment,
            defaults={'attendance_status': Attendance.Status.ABSENT},
        )
        was_absent = attendance.attendance_status == Attendance.Status.ABSENT
        if not attendance.check_in and attendance.attendance_status != Attendance.Status.ABSENT:
            attendance.attendance_status = Attendance.Status.ABSENT
            attendance.duration_hours = Decimal('0.00')
            attendance.save(update_fields=['attendance_status', 'duration_hours', 'updated_at'])
        if not attendance.check_in and (created or not was_absent):
            notify_assignment_recipients(
                assignment,
                event_type=Notification.EventType.ABSENCE,
                source_key=f'attendance:{attendance.pk}:absence',
                title='Employee absence recorded',
                message=f'{assignment.employee_customer_assignment.employee.user.get_full_name()} did not check in for {assignment.shift.name} on {assignment.shift_date}.',
            )
        elif attendance.check_in and not attendance.check_out and attendance.attendance_status != Attendance.Status.INCOMPLETE:
            attendance.attendance_status = Attendance.Status.INCOMPLETE
            attendance.save(update_fields=['attendance_status', 'updated_at'])
        elif created:
            assignment.refresh_from_db(fields=['status'])


class AttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = [
        'shift_assignment__employee_customer_assignment__employee__employee_code',
        'shift_assignment__employee_customer_assignment__customer__company_name',
    ]
    ordering_fields = ['created_at', 'check_in', 'check_out', 'duration_hours']
    ordering = ['-created_at']

    def _base_queryset(self):
        user = self.request.user
        if getattr(self, 'swagger_fake_view', False) or not user.is_authenticated:
            return Attendance.objects.none()
        queryset = Attendance.objects.select_related(
            'shift_assignment__shift',
            'shift_assignment__employee_customer_assignment__employee__user',
            'shift_assignment__employee_customer_assignment__customer',
        )
        if user.is_staff or user.is_superuser or user.role == 'ADMIN':
            return queryset
        if user.role == 'EMPLOYEE':
            return queryset.filter(
                shift_assignment__employee_customer_assignment__employee__user=user
            )
        if user.role == 'CUSTOMER':
            return queryset.filter(
                shift_assignment__employee_customer_assignment__customer__user=user
            )
        return queryset.none()

    def _filtered_queryset(self, include_date=True):
        queryset = self._base_queryset()
        params = self.request.query_params
        id_filters = {
            'employee': 'shift_assignment__employee_customer_assignment__employee_id',
            'customer': 'shift_assignment__employee_customer_assignment__customer_id',
            'shift': 'shift_assignment__shift_id',
        }
        for param, field in id_filters.items():
            value = params.get(param)
            if value:
                try:
                    uuid.UUID(value)
                except ValueError as exc:
                    raise ValidationError({param: 'Enter a valid UUID.'}) from exc
                queryset = queryset.filter(**{field: value})

        attendance_status = params.get('status') or params.get('attendance_status')
        if attendance_status:
            queryset = queryset.filter(attendance_status=attendance_status.upper())

        if include_date:
            date_value = params.get('date')
            if date_value:
                date_filter = parse_date(date_value)
                if not date_filter:
                    raise ValidationError({'date': 'Enter a valid date in YYYY-MM-DD format.'})
                queryset = queryset.filter(shift_assignment__shift_date=date_filter)
            date_from = params.get('date_from')
            date_to = params.get('date_to')
            if date_from:
                parsed_from = parse_date(date_from)
                if not parsed_from:
                    raise ValidationError({'date_from': 'Enter a valid date in YYYY-MM-DD format.'})
                queryset = queryset.filter(shift_assignment__shift_date__gte=parsed_from)
            if date_to:
                parsed_to = parse_date(date_to)
                if not parsed_to:
                    raise ValidationError({'date_to': 'Enter a valid date in YYYY-MM-DD format.'})
                queryset = queryset.filter(shift_assignment__shift_date__lte=parsed_to)
        return queryset

    def _scoped_schedules(self):
        user = self.request.user
        schedules = ShiftAssignment.objects.filter(
            shift_date__lte=timezone.localdate(),
            status__in=[
                ShiftAssignment.Status.SCHEDULED,
                ShiftAssignment.Status.IN_PROGRESS,
                ShiftAssignment.Status.COMPLETED,
            ],
        ).select_related('shift', 'employee_customer_assignment__customer')
        if not (user.is_staff or user.is_superuser or user.role == 'ADMIN'):
            if user.role == 'EMPLOYEE':
                schedules = schedules.filter(
                    employee_customer_assignment__employee__user=user
                )
            elif user.role == 'CUSTOMER':
                schedules = schedules.filter(
                    employee_customer_assignment__customer__user=user
                )
            else:
                return schedules.none()

        params = self.request.query_params
        for param, field in {
            'employee': 'employee_customer_assignment__employee_id',
            'customer': 'employee_customer_assignment__customer_id',
            'shift': 'shift_id',
        }.items():
            value = params.get(param)
            if value:
                try:
                    uuid.UUID(value)
                except ValueError as exc:
                    raise ValidationError({param: 'Enter a valid UUID.'}) from exc
                schedules = schedules.filter(**{field: value})
        date_value = params.get('date')
        if date_value:
            parsed_date = parse_date(date_value)
            if not parsed_date:
                raise ValidationError({'date': 'Enter a valid date in YYYY-MM-DD format.'})
            schedules = schedules.filter(shift_date=parsed_date)
        for param, operator in (('date_from', 'gte'), ('date_to', 'lte')):
            value = params.get(param)
            if value:
                parsed_date = parse_date(value)
                if not parsed_date:
                    raise ValidationError({param: 'Enter a valid date in YYYY-MM-DD format.'})
                schedules = schedules.filter(**{f'shift_date__{operator}': parsed_date})
        return schedules

    def get_queryset(self):
        queryset = self._filtered_queryset()
        if self.action == 'list':
            _refresh_completed_attendance(self._scoped_schedules())
            queryset = self._filtered_queryset()
        return queryset

    def create(self, request, *args, **kwargs):
        return Response({'detail': 'Use the check-in endpoint to create attendance.'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    def update(self, request, *args, **kwargs):
        return Response({'detail': 'Use the admin correction endpoint to update attendance.'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    def partial_update(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        return Response({'detail': 'Attendance records cannot be deleted.'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsEmployee])
    @transaction.atomic
    def check_in(self, request):
        serializer = CheckInSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            assignment = ShiftAssignment.objects.select_for_update().select_related(
                'shift',
                'employee_customer_assignment__employee__user',
                'employee_customer_assignment__customer',
            ).get(id=serializer.validated_data['shift_assignment_id'])
        except ShiftAssignment.DoesNotExist:
            return Response({'detail': 'Shift assignment not found.'}, status=status.HTTP_404_NOT_FOUND)

        contract = assignment.employee_customer_assignment
        if contract.employee.user_id != request.user.id:
            return Response({'detail': 'You can only check into your own assigned shift.'}, status=status.HTTP_403_FORBIDDEN)
        if contract.status != 'ACTIVE':
            return Response({'detail': 'The employee-customer assignment is not active.'}, status=status.HTTP_400_BAD_REQUEST)
        if assignment.status not in (ShiftAssignment.Status.SCHEDULED, ShiftAssignment.Status.IN_PROGRESS):
            return Response({'detail': 'This shift is not available for check-in.'}, status=status.HTTP_400_BAD_REQUEST)

        start, end = _shift_bounds(assignment)
        now = timezone.now()
        if now < start:
            return Response({'detail': 'Check-in is available when the assigned shift begins.'}, status=status.HTTP_400_BAD_REQUEST)
        if now >= end:
            return Response({'detail': 'Check-in is not available after the assigned shift ends.'}, status=status.HTTP_400_BAD_REQUEST)

        attendance = Attendance.objects.select_for_update().filter(shift_assignment=assignment).first()
        if attendance and attendance.check_in:
            return Response({'detail': 'Duplicate check-in is not allowed. You have already checked in.'}, status=status.HTTP_400_BAD_REQUEST)

        if attendance is None:
            attendance = Attendance(shift_assignment=assignment)
        attendance.check_in = now
        attendance.check_out = None
        attendance.duration_hours = Decimal('0.00')
        attendance.notes = serializer.validated_data.get('notes', '')
        attendance.location_verified = serializer.validated_data.get('location_verified', True)
        grace_end = start + timedelta(minutes=assignment.shift.grace_period_minutes)
        attendance.attendance_status = Attendance.Status.LATE if now > grace_end else Attendance.Status.PRESENT
        attendance.save()

        assignment.status = ShiftAssignment.Status.IN_PROGRESS
        assignment.save(update_fields=['status', 'updated_at'])
        event_type = (
            Notification.EventType.LATE_ARRIVAL
            if attendance.attendance_status == Attendance.Status.LATE
            else Notification.EventType.CHECK_IN
        )
        notify_assignment_recipients(
            assignment,
            event_type=event_type,
            source_key=f'attendance:{attendance.pk}:check-in',
            title=(
                'Late arrival recorded'
                if event_type == Notification.EventType.LATE_ARRIVAL
                else 'Employee checked in'
            ),
            message=f'{request.user.get_full_name()} checked in for {assignment.shift.name} on {assignment.shift_date}.',
        )
        if event_type == Notification.EventType.LATE_ARRIVAL:
            notify_assignment_recipients(
                assignment,
                event_type=Notification.EventType.CHECK_IN,
                source_key=f'attendance:{attendance.pk}:check-in-confirmation',
                title='Employee checked in',
                message=f'{request.user.get_full_name()} checked in late for {assignment.shift.name} on {assignment.shift_date}.',
            )
        return Response(AttendanceSerializer(attendance).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsEmployee])
    @transaction.atomic
    def check_out(self, request):
        serializer = CheckOutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            assignment = ShiftAssignment.objects.select_for_update().select_related(
                'shift',
                'employee_customer_assignment__employee__user',
                'employee_customer_assignment__customer',
            ).get(id=serializer.validated_data['shift_assignment_id'])
        except ShiftAssignment.DoesNotExist:
            return Response({'detail': 'Shift assignment not found.'}, status=status.HTTP_404_NOT_FOUND)

        if assignment.employee_customer_assignment.employee.user_id != request.user.id:
            return Response({'detail': 'You can only check out of your own assigned shift.'}, status=status.HTTP_403_FORBIDDEN)
        attendance = Attendance.objects.select_for_update().filter(shift_assignment=assignment).first()
        if not attendance or not attendance.check_in:
            return Response({'detail': 'Cannot check out without an existing check-in.'}, status=status.HTTP_400_BAD_REQUEST)
        if attendance.check_out:
            return Response({'detail': 'You have already checked out for this shift.'}, status=status.HTTP_400_BAD_REQUEST)

        _, end = _shift_bounds(assignment)
        now = timezone.now()
        if now < end:
            return Response({'detail': 'Check-out is available when the assigned shift ends.'}, status=status.HTTP_400_BAD_REQUEST)
        if now < attendance.check_in:
            return Response({'detail': 'Check-out cannot precede check-in.'}, status=status.HTTP_400_BAD_REQUEST)

        attendance.check_out = now
        attendance.duration_hours = (
            Decimal(str((now - attendance.check_in).total_seconds())) / Decimal('3600')
        ).quantize(Decimal('0.01'))
        notes = serializer.validated_data.get('notes', '')
        if notes:
            attendance.notes = '\n'.join(filter(None, [attendance.notes, f'Checkout note: {notes}']))
        attendance.save()

        assignment.status = ShiftAssignment.Status.COMPLETED
        assignment.save(update_fields=['status', 'updated_at'])
        notify_assignment_recipients(
            assignment,
            event_type=Notification.EventType.CHECK_OUT,
            source_key=f'attendance:{attendance.pk}:check-out',
            title='Employee checked out',
            message=f'{request.user.get_full_name()} checked out from {assignment.shift.name} on {assignment.shift_date}.',
        )
        return Response(AttendanceSerializer(attendance).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated, IsEmployee], url_path='my-attendance')
    def my_attendance(self, request):
        queryset = self._filtered_queryset()
        _refresh_completed_attendance(
            ShiftAssignment.objects.filter(
                employee_customer_assignment__employee__user=request.user,
                shift_date__lte=timezone.localdate(),
                status__in=[
                    ShiftAssignment.Status.SCHEDULED,
                    ShiftAssignment.Status.IN_PROGRESS,
                    ShiftAssignment.Status.COMPLETED,
                ],
            ).select_related('shift', 'employee_customer_assignment__customer')
        )
        return self.list(request)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated, IsEmployee], url_path='my-shifts')
    def my_shifts(self, request):
        profile = getattr(request.user, 'employee_profile', None)
        if profile is None:
            return Response({'detail': 'Employee profile not found.'}, status=status.HTTP_403_FORBIDDEN)
        date_value = request.query_params.get('date') or timezone.localdate().isoformat()
        today = parse_date(date_value)
        if not today:
            raise ValidationError({'date': 'Enter a valid date in YYYY-MM-DD format.'})
        schedules = ShiftAssignment.objects.filter(
            employee_customer_assignment__employee=profile,
        ).filter(
            Q(shift_date=today)
            | Q(
                shift_date=today - timedelta(days=1),
                attendance_record__check_in__isnull=False,
                attendance_record__check_out__isnull=True,
            )
        ).exclude(status=ShiftAssignment.Status.CANCELLED).select_related(
            'shift',
            'employee_customer_assignment__employee__user',
            'employee_customer_assignment__customer',
        ).order_by('shift_date', 'shift__start_time')
        _refresh_completed_attendance(schedules)
        items = []
        for assignment in schedules:
            attendance = Attendance.objects.filter(shift_assignment=assignment).first()
            items.append({
                'shift_assignment_id': str(assignment.id),
                'shift_date': assignment.shift_date,
                'shift_details': ShiftAssignmentSerializer(assignment).data,
                'attendance': AttendanceSerializer(attendance).data if attendance else None,
                'attendance_status': attendance.attendance_status if attendance else 'SCHEDULED',
                'check_in': attendance.check_in if attendance else None,
                'check_out': attendance.check_out if attendance else None,
                'duration_hours': attendance.duration_hours if attendance else None,
            })
        return Response(items)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated, IsCustomer], url_path='customer-shifts')
    def customer_shifts(self, request):
        profile = getattr(request.user, 'customer_profile', None)
        if profile is None:
            return Response({'detail': 'Customer profile not found.'}, status=status.HTTP_403_FORBIDDEN)
        date_value = request.query_params.get('date') or timezone.localdate().isoformat()
        shift_date = parse_date(date_value)
        if not shift_date:
            raise ValidationError({'date': 'Enter a valid date in YYYY-MM-DD format.'})
        schedules = ShiftAssignment.objects.filter(
            employee_customer_assignment__customer=profile,
            shift_date=shift_date,
        ).exclude(status=ShiftAssignment.Status.CANCELLED).select_related(
            'shift',
            'employee_customer_assignment__employee__user',
            'employee_customer_assignment__customer',
        ).order_by('shift__start_time')
        _refresh_completed_attendance(schedules)
        items = []
        for assignment in schedules:
            attendance = Attendance.objects.filter(shift_assignment=assignment).first()
            items.append({
                'id': str(attendance.id) if attendance else str(assignment.id),
                'shift_assignment_id': str(assignment.id),
                'employee_id': str(assignment.employee_customer_assignment.employee_id),
                'employee_name': assignment.employee_customer_assignment.employee.user.get_full_name(),
                'customer_id': str(profile.id),
                'customer_name': profile.company_name,
                'shift_id': str(assignment.shift_id),
                'shift_name': assignment.shift.name,
                'shift_date': assignment.shift_date,
                'shift_start': assignment.shift.start_time,
                'shift_end': assignment.shift.end_time,
                'customer_timezone': profile.timezone,
                'attendance_status': attendance.attendance_status if attendance else 'SCHEDULED',
                'check_in': attendance.check_in if attendance else None,
                'check_out': attendance.check_out if attendance else None,
                'duration_hours': attendance.duration_hours if attendance else Decimal('0.00'),
            })
        return Response(items)

    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        filtered = self._filtered_queryset(include_date=False)
        date_value = request.query_params.get('date') or timezone.localdate().isoformat()
        summary_date = parse_date(date_value)
        if not summary_date:
            raise ValidationError({'date': 'Enter a valid date in YYYY-MM-DD format.'})
        _refresh_completed_attendance(self._scoped_schedules())

        def summarize(queryset):
            values = queryset.aggregate(
                total=Count('id'),
                total_duration_hours=Sum('duration_hours'),
            )
            by_status = {
                row['attendance_status']: row['count']
                for row in queryset.values('attendance_status').annotate(count=Count('id'))
            }
            return {
                'total': values['total'] or 0,
                'statuses': by_status,
                'total_duration_hours': str(values['total_duration_hours'] or Decimal('0.00')),
            }

        return Response({
            'date': summary_date,
            'daily': summarize(filtered.filter(shift_assignment__shift_date=summary_date)),
            'overall': summarize(filtered),
        })

    @action(detail=True, methods=['patch'], permission_classes=[permissions.IsAuthenticated, IsAdmin])
    @transaction.atomic
    def correct(self, request, pk=None):
        attendance = self.get_object()
        before = {
            'check_in': attendance.check_in.isoformat() if attendance.check_in else None,
            'check_out': attendance.check_out.isoformat() if attendance.check_out else None,
            'attendance_status': attendance.attendance_status,
            'duration_hours': str(attendance.duration_hours),
            'notes': attendance.notes,
        }
        serializer = AttendanceCorrectionSerializer(attendance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        corrected = serializer.save()
        if corrected.check_in and corrected.check_out:
            corrected.duration_hours = (
                Decimal(str((corrected.check_out - corrected.check_in).total_seconds())) / Decimal('3600')
            ).quantize(Decimal('0.01'))
        else:
            corrected.duration_hours = Decimal('0.00')
        corrected.save(update_fields=['duration_hours', 'updated_at'])

        assignment = corrected.shift_assignment
        if corrected.check_out:
            assignment.status = ShiftAssignment.Status.COMPLETED
        elif corrected.check_in:
            assignment.status = ShiftAssignment.Status.IN_PROGRESS
        else:
            assignment.status = ShiftAssignment.Status.SCHEDULED
        assignment.save(update_fields=['status', 'updated_at'])

        after = {
            'check_in': corrected.check_in.isoformat() if corrected.check_in else None,
            'check_out': corrected.check_out.isoformat() if corrected.check_out else None,
            'attendance_status': corrected.attendance_status,
            'duration_hours': str(corrected.duration_hours),
            'notes': corrected.notes,
        }
        ActivityLog.objects.create(
            user=request.user,
            action='UPDATE',
            entity_type='ATTENDANCE',
            entity_id=str(corrected.id),
            description=json.dumps({'before': before, 'after': after}),
            ip_address=request.META.get('REMOTE_ADDR'),
        )
        return Response(AttendanceSerializer(corrected).data)
