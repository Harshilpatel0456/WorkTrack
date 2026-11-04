from datetime import datetime, time, timedelta, timezone as dt_timezone
from decimal import Decimal
from unittest.mock import patch

import pytest
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.assignments.models import EmployeeCustomerAssignment
from apps.attendance.models import Attendance
from apps.audit.models import ActivityLog
from apps.customers.models import CustomerProfile
from apps.employees.models import EmployeeProfile
from apps.shifts.models import Shift, ShiftAssignment


@pytest.mark.django_db
class TestAttendanceManagement:
    @pytest.fixture(autouse=True)
    def setup_data(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            email='admin@test.com', username='admin@test.com', password='pass',
            role=User.Role.ADMIN, is_staff=True,
        )
        self.employee_user = User.objects.create_user(
            email='employee@test.com', username='employee@test.com', password='pass',
            role=User.Role.EMPLOYEE,
        )
        self.employee = EmployeeProfile.objects.create(
            user=self.employee_user, employee_code='EMP-001',
        )
        self.customer_user = User.objects.create_user(
            email='customer@test.com', username='customer@test.com', password='pass',
            role=User.Role.CUSTOMER,
        )
        self.customer = CustomerProfile.objects.create(
            user=self.customer_user, customer_code='CUST-001',
            company_name='Acme Mart', timezone='UTC',
        )
        self.assignment = EmployeeCustomerAssignment.objects.create(
            employee=self.employee, customer=self.customer, assigned_by=self.admin,
        )
        self.shift = Shift.objects.create(
            name='Morning', start_time=time(6), end_time=time(14),
            grace_period_minutes=15,
        )
        self.shift_assignment = ShiftAssignment.objects.create(
            employee_customer_assignment=self.assignment,
            shift=self.shift,
            shift_date=timezone.localdate(),
            assigned_by=self.admin,
        )

    def moment(self, hour, minute=0, day_offset=0):
        date = self.shift_assignment.shift_date + timedelta(days=day_offset)
        return datetime.combine(date, time(hour, minute), tzinfo=dt_timezone.utc)

    def post_check_in(self, at, assignment=None):
        self.client.force_authenticate(user=self.employee_user)
        with patch('apps.attendance.views.timezone.now', return_value=at):
            return self.client.post('/api/v1/attendance/check_in/', {
                'shift_assignment_id': str((assignment or self.shift_assignment).id),
            })

    def test_employee_check_in_and_duplicate_prevention(self):
        response = self.post_check_in(self.moment(6, 10))
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['attendance_status'] == Attendance.Status.PRESENT
        assert response.data['check_in'] is not None
        self.shift_assignment.refresh_from_db()
        assert self.shift_assignment.status == ShiftAssignment.Status.IN_PROGRESS

        duplicate = self.post_check_in(self.moment(6, 11))
        assert duplicate.status_code == status.HTTP_400_BAD_REQUEST
        assert 'duplicate' in str(duplicate.data).lower()

    def test_early_check_in_is_rejected(self):
        response = self.post_check_in(self.moment(5, 59))
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert not Attendance.objects.exists()

    def test_check_in_after_shift_end_is_rejected(self):
        response = self.post_check_in(self.moment(14, 1))
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert not Attendance.objects.exists()

    def test_late_arrival_uses_shift_grace_period(self):
        response = self.post_check_in(self.moment(6, 16))
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['attendance_status'] == Attendance.Status.LATE

    def test_checkout_requires_checkin_and_shift_end(self):
        self.client.force_authenticate(user=self.employee_user)
        response = self.client.post('/api/v1/attendance/check_out/', {
            'shift_assignment_id': str(self.shift_assignment.id),
        })
        assert response.status_code == status.HTTP_400_BAD_REQUEST

        self.post_check_in(self.moment(6, 10))
        early = self.moment(13, 59)
        with patch('apps.attendance.views.timezone.now', return_value=early):
            too_early = self.client.post('/api/v1/attendance/check_out/', {
                'shift_assignment_id': str(self.shift_assignment.id),
            })
        assert too_early.status_code == status.HTTP_400_BAD_REQUEST

    def test_checkout_calculates_actual_duration_and_completes_shift(self):
        self.post_check_in(self.moment(6, 10))
        self.client.force_authenticate(user=self.employee_user)
        with patch('apps.attendance.views.timezone.now', return_value=self.moment(14, 10)):
            response = self.client.post('/api/v1/attendance/check_out/', {
                'shift_assignment_id': str(self.shift_assignment.id),
            })
        assert response.status_code == status.HTTP_200_OK
        assert response.data['duration_hours'] == '8.00'
        self.shift_assignment.refresh_from_db()
        assert self.shift_assignment.status == ShiftAssignment.Status.COMPLETED

    def test_overnight_attendance_uses_shift_start_date(self):
        self.shift.start_time = time(22)
        self.shift.end_time = time(6)
        self.shift.is_overnight = True
        self.shift.save()
        checked_in = self.post_check_in(self.moment(22, 5))
        assert checked_in.status_code == status.HTTP_201_CREATED
        self.client.force_authenticate(user=self.employee_user)
        with patch('apps.attendance.views.timezone.now', return_value=self.moment(6, 5, day_offset=1)):
            checked_out = self.client.post('/api/v1/attendance/check_out/', {
                'shift_assignment_id': str(self.shift_assignment.id),
            })
        assert checked_out.status_code == status.HTTP_200_OK
        assert checked_out.data['shift_date'] == str(self.shift_assignment.shift_date)
        assert checked_out.data['duration_hours'] == '8.00'

    def test_employee_cannot_punch_another_employees_assignment(self):
        other_user = User.objects.create_user(
            email='other@test.com', username='other@test.com', password='pass',
            role=User.Role.EMPLOYEE,
        )
        other_employee = EmployeeProfile.objects.create(user=other_user, employee_code='EMP-002')
        other_assignment = EmployeeCustomerAssignment.objects.create(
            employee=other_employee, customer=self.customer, assigned_by=self.admin,
        )
        other_shift = ShiftAssignment.objects.create(
            employee_customer_assignment=other_assignment,
            shift=self.shift, shift_date=self.shift_assignment.shift_date,
            assigned_by=self.admin,
        )
        response = self.post_check_in(self.moment(6, 10), other_shift)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_my_shifts_are_employee_scoped_and_date_filtered(self):
        self.client.force_authenticate(user=self.employee_user)
        response = self.client.get('/api/v1/attendance/my-shifts/', {
            'date': str(self.shift_assignment.shift_date),
        })
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]['attendance_status'] == 'SCHEDULED'

        invalid_date = self.client.get('/api/v1/attendance/my-shifts/', {'date': 'bad-date'})
        assert invalid_date.status_code == status.HTTP_400_BAD_REQUEST

    def test_customer_attendance_isolation_and_filters(self):
        self.post_check_in(self.moment(6, 10))
        other_customer_user = User.objects.create_user(
            email='other-customer@test.com', username='other-customer@test.com',
            password='pass', role=User.Role.CUSTOMER,
        )
        CustomerProfile.objects.create(
            user=other_customer_user, customer_code='CUST-002',
            company_name='Other Store', timezone='UTC',
        )
        self.client.force_authenticate(user=self.customer_user)
        response = self.client.get('/api/v1/attendance/', {
            'date': str(self.shift_assignment.shift_date),
            'status': 'PRESENT',
        })
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1

        self.client.force_authenticate(user=other_customer_user)
        isolated = self.client.get('/api/v1/attendance/')
        assert isolated.data['count'] == 0
        summary = self.client.get('/api/v1/attendance/summary/')
        assert summary.data['overall']['total'] == 0

    def test_customer_shift_dashboard_includes_scheduled_and_isolated_shifts(self):
        self.client.force_authenticate(user=self.customer_user)
        response = self.client.get('/api/v1/attendance/customer-shifts/', {
            'date': str(self.shift_assignment.shift_date),
        })
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]['attendance_status'] == 'SCHEDULED'

        other_customer_user = User.objects.create_user(
            email='other-customer@test.com', username='other-customer@test.com',
            password='pass', role=User.Role.CUSTOMER,
        )
        CustomerProfile.objects.create(
            user=other_customer_user, customer_code='CUST-002',
            company_name='Other Store', timezone='UTC',
        )
        self.client.force_authenticate(user=other_customer_user)
        isolated = self.client.get('/api/v1/attendance/customer-shifts/', {
            'date': str(self.shift_assignment.shift_date),
        })
        assert isolated.data == []

    def test_missed_checkout_becomes_incomplete_and_missed_shift_absent(self):
        self.post_check_in(self.moment(6, 10))
        with patch('apps.attendance.views.timezone.now', return_value=self.moment(15)):
            self.client.force_authenticate(user=self.employee_user)
            self.client.get('/api/v1/attendance/my-attendance/')
        attendance = Attendance.objects.get(shift_assignment=self.shift_assignment)
        assert attendance.attendance_status == Attendance.Status.INCOMPLETE

        another_shift = ShiftAssignment.objects.create(
            employee_customer_assignment=self.assignment,
            shift=self.shift,
            shift_date=self.shift_assignment.shift_date - timedelta(days=1),
            assigned_by=self.admin,
        )
        with patch('apps.attendance.views.timezone.now', return_value=self.moment(15)):
            self.client.force_authenticate(user=self.admin)
            response = self.client.get('/api/v1/attendance/')
        absent = Attendance.objects.get(shift_assignment=another_shift)
        assert absent.attendance_status == Attendance.Status.ABSENT
        assert response.status_code == status.HTTP_200_OK

    def test_admin_correction_updates_duration_and_audit(self):
        attendance = Attendance.objects.create(
            shift_assignment=self.shift_assignment,
            check_in=self.moment(6),
            check_out=self.moment(14),
            attendance_status=Attendance.Status.PRESENT,
            duration_hours=Decimal('8.00'),
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            f'/api/v1/attendance/{attendance.id}/correct/',
            {
                'check_in': self.moment(6, 15).isoformat(),
                'check_out': self.moment(14, 15).isoformat(),
                'attendance_status': Attendance.Status.LATE,
                'notes': 'Approved time correction',
            },
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['duration_hours'] == '8.00'
        log = ActivityLog.objects.get(entity_type='ATTENDANCE', entity_id=str(attendance.id))
        assert '"before"' in log.description and '"after"' in log.description

    def test_admin_correction_rejects_checkout_before_checkin(self):
        attendance = Attendance.objects.create(shift_assignment=self.shift_assignment)
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            f'/api/v1/attendance/{attendance.id}/correct/',
            {
                'check_in': self.moment(8).isoformat(),
                'check_out': self.moment(7).isoformat(),
                'attendance_status': Attendance.Status.PRESENT,
            },
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert not ActivityLog.objects.filter(entity_type='ATTENDANCE').exists()

    def test_employee_cannot_correct_attendance(self):
        attendance = Attendance.objects.create(shift_assignment=self.shift_assignment)
        self.client.force_authenticate(user=self.employee_user)
        response = self.client.patch(
            f'/api/v1/attendance/{attendance.id}/correct/',
            {'attendance_status': Attendance.Status.ABSENT},
            format='json',
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_summary_reports_daily_and_overall_counts(self):
        Attendance.objects.create(
            shift_assignment=self.shift_assignment,
            attendance_status=Attendance.Status.ABSENT,
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/v1/attendance/summary/', {
            'date': str(self.shift_assignment.shift_date),
        })
        assert response.status_code == status.HTTP_200_OK
        assert response.data['daily']['statuses']['ABSENT'] == 1
        assert response.data['overall']['total'] == 1
