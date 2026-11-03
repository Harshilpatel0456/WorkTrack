from decimal import Decimal
from django.utils import timezone
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.accounts.permissions import IsAdmin, IsEmployee
from apps.shifts.models import ShiftAssignment
from apps.shifts.serializers import ShiftAssignmentSerializer
from apps.attendance.models import Attendance
from apps.attendance.serializers import (
    AttendanceSerializer,
    CheckInSerializer,
    CheckOutSerializer,
)


class AttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['attendance_status', 'shift_assignment__shift_date']
    search_fields = [
        'shift_assignment__employee_customer_assignment__employee__employee_code',
        'shift_assignment__employee_customer_assignment__customer__company_name'
    ]
    ordering_fields = ['created_at', 'check_in', 'check_out']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        if getattr(self, "swagger_fake_view", False) or not user.is_authenticated:
            return Attendance.objects.none()
        qs = Attendance.objects.select_related(
            'shift_assignment__shift',
            'shift_assignment__employee_customer_assignment__employee__user',
            'shift_assignment__employee_customer_assignment__customer'
        )
        if user.is_staff or user.role == 'ADMIN':
            return qs
        elif user.role == 'EMPLOYEE' and hasattr(user, 'employee_profile'):
            return qs.filter(
                shift_assignment__employee_customer_assignment__employee=user.employee_profile
            )
        elif user.role == 'CUSTOMER' and hasattr(user, 'customer_profile'):
            return qs.filter(
                shift_assignment__employee_customer_assignment__customer=user.customer_profile
            )
        return qs.none()

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsEmployee])
    def check_in(self, request):
        serializer = CheckInSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        shift_assignment_id = serializer.validated_data['shift_assignment_id']
        notes = serializer.validated_data.get('notes', '')
        location_verified = serializer.validated_data.get('location_verified', True)

        try:
            assignment = ShiftAssignment.objects.select_related('shift', 'employee_customer_assignment__employee').get(
                id=shift_assignment_id
            )
        except ShiftAssignment.DoesNotExist:
            return Response(
                {'detail': 'Shift assignment not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if assignment.employee_customer_assignment.employee.user != request.user:
            return Response(
                {'detail': 'You can only check into your own assigned shift.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Check if already checked in
        attendance, created = Attendance.objects.get_or_create(
            shift_assignment=assignment,
            defaults={
                'check_in': timezone.now(),
                'notes': notes,
                'location_verified': location_verified,
                'attendance_status': Attendance.Status.PRESENT,
            }
        )

        if not created and attendance.check_in is not None:
            return Response(
                {'detail': 'Duplicate check-in is not allowed. You have already checked in.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not created and attendance.check_in is None:
            attendance.check_in = timezone.now()
            attendance.notes = notes
            attendance.location_verified = location_verified
            attendance.attendance_status = Attendance.Status.PRESENT
            attendance.save()

        # Update assignment status
        assignment.status = ShiftAssignment.Status.IN_PROGRESS
        assignment.save(update_fields=['status'])

        return Response(
            AttendanceSerializer(attendance).data,
            status=status.HTTP_200_OK if not created else status.HTTP_201_CREATED
        )

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsEmployee])
    def check_out(self, request):
        serializer = CheckOutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        shift_assignment_id = serializer.validated_data['shift_assignment_id']
        notes = serializer.validated_data.get('notes', '')

        try:
            assignment = ShiftAssignment.objects.get(id=shift_assignment_id)
        except ShiftAssignment.DoesNotExist:
            return Response(
                {'detail': 'Shift assignment not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if assignment.employee_customer_assignment.employee.user != request.user:
            return Response(
                {'detail': 'You can only check out of your own assigned shift.'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            attendance = Attendance.objects.get(shift_assignment=assignment)
        except Attendance.DoesNotExist:
            return Response(
                {'detail': 'Cannot check out without check-in. No check-in record found.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not attendance.check_in:
            return Response(
                {'detail': 'Check-out without check-in is not allowed.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if attendance.check_out is not None:
            return Response(
                {'detail': 'You have already checked out for this shift.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        now = timezone.now()
        if now < attendance.check_in:
            return Response(
                {'detail': 'Check-out cannot precede check-in.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        attendance.check_out = now
        duration_seconds = (now - attendance.check_in).total_seconds()
        duration_hours = round(Decimal(duration_seconds) / Decimal(3600), 2)
        attendance.duration_hours = duration_hours
        if notes:
            attendance.notes = f"{attendance.notes}\nCheckout note: {notes}".strip()
        attendance.save()

        # Update assignment status
        assignment.status = ShiftAssignment.Status.COMPLETED
        assignment.save(update_fields=['status'])

        return Response(AttendanceSerializer(attendance).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated, IsEmployee])
    def current(self, request):
        """Returns the most recent or active shift attendance for the logged-in employee."""
        profile = getattr(request.user, 'employee_profile', None)
        if not profile:
            return Response({'active_punch': None, 'active_shift': None})

        today = timezone.localdate()
        latest_assignment = ShiftAssignment.objects.filter(
            employee_customer_assignment__employee=profile,
            shift_date=today
        ).order_by('-created_at').first()

        if not latest_assignment:
            # Fallback to any recent scheduled/in-progress assignment
            latest_assignment = ShiftAssignment.objects.filter(
                employee_customer_assignment__employee=profile
            ).order_by('-shift_date', '-created_at').first()

        if not latest_assignment:
            return Response({'active_punch': None, 'active_shift': None})

        attendance = Attendance.objects.filter(shift_assignment=latest_assignment).first()

        return Response({
            'active_shift': ShiftAssignmentSerializer(latest_assignment).data if latest_assignment else None,
            'attendance': AttendanceSerializer(attendance).data if attendance else None,
            'is_checked_in': attendance is not None and attendance.check_in is not None and attendance.check_out is None
        })
