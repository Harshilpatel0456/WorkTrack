import pytest
from datetime import time
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.employees.models import EmployeeProfile
from apps.customers.models import CustomerProfile
from apps.assignments.models import EmployeeCustomerAssignment
from apps.shifts.models import Shift, ShiftAssignment
from apps.attendance.models import Attendance


@pytest.mark.django_db
class TestAttendanceBusinessRules:
    @pytest.fixture(autouse=True)
    def setup_data(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            email='admin@test.com', username='admin@test.com', password='pass', role=User.Role.ADMIN, is_staff=True
        )
        self.emp_user = User.objects.create_user(
            email='emp@test.com', username='emp@test.com', password='pass', role=User.Role.EMPLOYEE
        )
        self.emp_profile = EmployeeProfile.objects.create(
            user=self.emp_user, employee_code='EMP-001', phone='1234567890', designation='Security Officer'
        )

        self.cust_user = User.objects.create_user(
            email='cust@test.com', username='cust@test.com', password='pass', role=User.Role.CUSTOMER
        )
        self.cust_profile = CustomerProfile.objects.create(
            user=self.cust_user, customer_code='CUST-001', company_name='Acme Mart'
        )

        self.assignment = EmployeeCustomerAssignment.objects.create(
            employee=self.emp_profile,
            customer=self.cust_profile,
            assigned_by=self.admin,
            status=EmployeeCustomerAssignment.Status.ACTIVE
        )

        self.shift = Shift.objects.create(
            name='Morning',
            start_time=time(6, 0),
            end_time=time(14, 0),
            is_active=True
        )

        self.shift_assignment = ShiftAssignment.objects.create(
            employee_customer_assignment=self.assignment,
            shift=self.shift,
            shift_date=timezone.localdate(),
            assigned_by=self.admin
        )

    def test_check_in_success(self):
        self.client.force_authenticate(user=self.emp_user)
        response = self.client.post('/api/v1/attendance/check_in/', {
            'shift_assignment_id': str(self.shift_assignment.id),
            'notes': 'Starting morning patrol'
        })
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_201_CREATED]
        assert response.data['attendance_status'] == Attendance.Status.PRESENT
        assert response.data['check_in'] is not None

        # Verify shift assignment status transitioned to IN_PROGRESS
        self.shift_assignment.refresh_from_db()
        assert self.shift_assignment.status == ShiftAssignment.Status.IN_PROGRESS

    def test_duplicate_check_in_prevented(self):
        self.client.force_authenticate(user=self.emp_user)
        # First check-in
        self.client.post('/api/v1/attendance/check_in/', {
            'shift_assignment_id': str(self.shift_assignment.id)
        })

        # Second duplicate check-in
        dup_response = self.client.post('/api/v1/attendance/check_in/', {
            'shift_assignment_id': str(self.shift_assignment.id)
        })
        assert dup_response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'duplicate' in str(dup_response.data).lower()

    def test_checkout_without_checkin_fails(self):
        self.client.force_authenticate(user=self.emp_user)
        response = self.client.post('/api/v1/attendance/check_out/', {
            'shift_assignment_id': str(self.shift_assignment.id)
        })
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_check_out_success(self):
        self.client.force_authenticate(user=self.emp_user)
        # Check-in first
        self.client.post('/api/v1/attendance/check_in/', {
            'shift_assignment_id': str(self.shift_assignment.id)
        })

        # Now check-out
        response = self.client.post('/api/v1/attendance/check_out/', {
            'shift_assignment_id': str(self.shift_assignment.id),
            'notes': 'Completed patrol without incidents'
        })
        assert response.status_code == status.HTTP_200_OK
        assert response.data['check_out'] is not None

        # Verify shift assignment status transitioned to COMPLETED
        self.shift_assignment.refresh_from_db()
        assert self.shift_assignment.status == ShiftAssignment.Status.COMPLETED

