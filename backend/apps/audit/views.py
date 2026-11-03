from datetime import timedelta
from django.utils import timezone
from django.db.models import Count, Q
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from apps.accounts.permissions import IsAdmin, IsEmployee, IsCustomer
from apps.accounts.models import User
from apps.employees.models import EmployeeProfile
from apps.customers.models import CustomerProfile
from apps.assignments.models import EmployeeCustomerAssignment
from apps.shifts.models import Shift, ShiftAssignment
from apps.attendance.models import Attendance
from apps.reports.models import DailyReport
from apps.surveillance.models import SurveillanceBatch
from apps.notifications.models import Notification
from apps.audit.models import ActivityLog
from apps.audit.serializers import ActivityLogSerializer


class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ActivityLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    queryset = ActivityLog.objects.select_related('user').all()
    ordering = ['-created_at']


class AdminDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get(self, request):
        today = timezone.localdate()
        total_employees = EmployeeProfile.objects.filter(user__is_active=True).count()
        total_customers = CustomerProfile.objects.filter(user__is_active=True).count()

        today_shifts = ShiftAssignment.objects.filter(shift_date=today)
        total_shifts_today = today_shifts.count()

        present_count = Attendance.objects.filter(
            shift_assignment__shift_date=today,
            attendance_status__in=[Attendance.Status.PRESENT, Attendance.Status.LATE]
        ).count()

        attendance_rate = (
            round((present_count / total_shifts_today) * 100, 1)
            if total_shifts_today > 0 else 100.0
        )

        reports_submitted = DailyReport.objects.filter(
            shift_assignment__shift_date=today,
            status=DailyReport.Status.SUBMITTED
        ).count()

        # Weekly trend for last 7 days
        weekly_trend = []
        for i in range(6, -1, -1):
            day = today - timedelta(days=i)
            day_shifts = ShiftAssignment.objects.filter(shift_date=day).count()
            day_present = Attendance.objects.filter(
                shift_assignment__shift_date=day,
                attendance_status__in=[Attendance.Status.PRESENT, Attendance.Status.LATE]
            ).count()
            weekly_trend.append({
                'date': day.strftime('%b %d'),
                'shifts': day_shifts,
                'present': day_present,
            })

        # Shift distribution today
        shift_distribution = list(
            today_shifts.values('shift__name').annotate(count=Count('id'))
        )

        recent_logs = ActivityLog.objects.select_related('user').all()[:10]

        return Response({
            'kpis': {
                'total_employees': total_employees,
                'total_customers': total_customers,
                'shifts_today': total_shifts_today,
                'present_today': present_count,
                'attendance_rate': attendance_rate,
                'reports_submitted_today': reports_submitted,
            },
            'weekly_trend': weekly_trend,
            'shift_distribution': shift_distribution,
            'recent_activity': ActivityLogSerializer(recent_logs, many=True).data,
        })


class EmployeeDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsEmployee]

    def get(self, request):
        user = request.user
        profile = getattr(user, 'employee_profile', None)
        if not profile:
            return Response({'detail': 'Employee profile missing.'}, status=status.HTTP_400_BAD_REQUEST)

        today = timezone.localdate()
        today_assignment = ShiftAssignment.objects.filter(
            employee_customer_assignment__employee=profile,
            shift_date=today
        ).select_related('shift', 'employee_customer_assignment__customer').first()

        attendance = None
        if today_assignment:
            attendance = Attendance.objects.filter(shift_assignment=today_assignment).first()

        report = None
        if today_assignment:
            report = DailyReport.objects.filter(shift_assignment=today_assignment).first()

        assigned_customers_count = EmployeeCustomerAssignment.objects.filter(
            employee=profile,
            status=EmployeeCustomerAssignment.Status.ACTIVE
        ).count()

        pending_surveillance = SurveillanceBatch.objects.filter(
            employee=profile,
            status=SurveillanceBatch.Status.READY_FOR_REVIEW
        ).count()

        recent_notifications = Notification.objects.filter(recipient=user)[:5]

        return Response({
            'employee_name': user.get_full_name(),
            'employee_code': profile.employee_code,
            'assigned_customers_count': assigned_customers_count,
            'pending_surveillance_batches': pending_surveillance,
            'today_shift': {
                'id': str(today_assignment.id) if today_assignment else None,
                'shift_name': today_assignment.shift.name if today_assignment else None,
                'customer_name': today_assignment.employee_customer_assignment.customer.company_name if today_assignment else None,
                'start_time': str(today_assignment.shift.start_time) if today_assignment else None,
                'end_time': str(today_assignment.shift.end_time) if today_assignment else None,
                'status': today_assignment.status if today_assignment else None,
            } if today_assignment else None,
            'punch_status': {
                'is_checked_in': attendance is not None and attendance.check_in is not None and attendance.check_out is None,
                'check_in': attendance.check_in if attendance else None,
                'check_out': attendance.check_out if attendance else None,
                'duration_hours': attendance.duration_hours if attendance else 0,
            },
            'today_report': {
                'id': str(report.id) if report else None,
                'title': report.title if report else None,
                'status': report.status if report else 'NOT_STARTED',
                'version': report.version if report else 0,
            } if report else None,
            'unread_notifications_count': Notification.objects.filter(recipient=user, read_at__isnull=True).count(),
        })


class CustomerDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCustomer]

    def get(self, request):
        user = request.user
        customer = getattr(user, 'customer_profile', None)
        if not customer:
            return Response({'detail': 'Customer profile missing.'}, status=status.HTTP_400_BAD_REQUEST)

        today = timezone.localdate()

        assigned_staff = EmployeeCustomerAssignment.objects.filter(
            customer=customer,
            status=EmployeeCustomerAssignment.Status.ACTIVE
        ).select_related('employee__user')

        active_shifts = ShiftAssignment.objects.filter(
            employee_customer_assignment__customer=customer,
            shift_date=today
        ).select_related('shift', 'employee_customer_assignment__employee__user')

        today_reports = DailyReport.objects.filter(
            shift_assignment__employee_customer_assignment__customer=customer,
            shift_assignment__shift_date=today,
            status=DailyReport.Status.SUBMITTED
        ).select_related('shift_assignment__shift', 'created_by')

        surveillance_batches = SurveillanceBatch.objects.filter(
            customer=customer,
            date=today
        ).prefetch_related('snapshots')

        flagged_cameras_today = 0
        for b in surveillance_batches:
            flagged_cameras_today += b.flagged_suspicious_count

        return Response({
            'customer_name': customer.company_name,
            'contact_person': customer.contact_person,
            'timezone': customer.timezone,
            'assigned_staff_count': assigned_staff.count(),
            'shifts_coverage_today': active_shifts.count(),
            'reports_submitted_today': today_reports.count(),
            'flagged_incidents_today': flagged_cameras_today,
            'active_shifts': [
                {
                    'id': str(s.id),
                    'employee_name': s.employee_customer_assignment.employee.user.get_full_name(),
                    'shift_name': s.shift.name,
                    'start_time': str(s.shift.start_time),
                    'end_time': str(s.shift.end_time),
                    'status': s.status,
                }
                for s in active_shifts
            ],
            'recent_reports': [
                {
                    'id': str(r.id),
                    'title': r.title,
                    'shift_name': r.shift_assignment.shift.name,
                    'author': r.created_by.get_full_name(),
                    'submitted_at': r.submitted_at,
                    'version': r.version,
                }
                for r in today_reports[:5]
            ],
            'surveillance_batches_count': surveillance_batches.count(),
        })
