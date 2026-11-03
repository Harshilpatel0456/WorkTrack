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
from apps.surveillance.models import SurveillanceBatch, CameraSnapshot


@pytest.mark.django_db
class TestSurveillanceAndDashboards:
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
            user=self.emp_user, employee_code='EMP-001', phone='1234567890'
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
            name='Morning', start_time=time(6, 0), end_time=time(14, 0)
        )

        self.shift_assignment = ShiftAssignment.objects.create(
            employee_customer_assignment=self.assignment,
            shift=self.shift,
            shift_date=timezone.localdate(),
            assigned_by=self.admin
        )

        # Batch
        self.batch = SurveillanceBatch.objects.create(
            id='BATCH-TEST-001',
            customer=self.cust_profile,
            employee=self.emp_profile,
            date=timezone.localdate(),
            hour_slot='10:00 - 11:00 AM',
            hour24='10:00',
            status=SurveillanceBatch.Status.READY_FOR_REVIEW
        )

        self.snapshot = CameraSnapshot.objects.create(
            id='CAM-01-TEST',
            batch=self.batch,
            camera_id='CAM-01',
            camera_name='Front Cash Register #1',
            zone='Zone A',
            is_high_risk=True,
            capture_time='10:00 AM',
            ai_analysis='Normal activity'
        )

    def test_verify_camera_snapshot(self):
        self.client.force_authenticate(user=self.emp_user)
        response = self.client.patch(f'/api/v1/surveillance/snapshots/{self.snapshot.id}/verify/', {
            'employee_verification': CameraSnapshot.VerificationStatus.FLAGGED_SUSPICIOUS,
            'employee_notes': 'Drawer opened while cashier walked away'
        }, format='json')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['employee_verification'] == 'Flagged Suspicious'

    def test_submit_surveillance_batch(self):
        self.client.force_authenticate(user=self.emp_user)
        response = self.client.post(f'/api/v1/surveillance/batches/{self.batch.id}/submit/', {
            'overall_assessment': '1 anomaly verified and reported.',
            'actions_taken': 'Alerted store manager via radio.'
        }, format='json')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'Submitted'
        assert response.data['customer_notified'] is True

    def test_admin_dashboard_metrics(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/v1/dashboard/admin/')
        assert response.status_code == status.HTTP_200_OK
        assert 'kpis' in response.data
        assert response.data['kpis']['total_employees'] >= 1
        assert response.data['kpis']['total_customers'] >= 1

    def test_employee_dashboard(self):
        self.client.force_authenticate(user=self.emp_user)
        response = self.client.get('/api/v1/dashboard/employee/')
        assert response.status_code == status.HTTP_200_OK
        assert 'punch_status' in response.data
        assert 'today_shift' in response.data

    def test_customer_dashboard(self):
        self.client.force_authenticate(user=self.cust_user)
        response = self.client.get('/api/v1/dashboard/customer/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['customer_name'] == 'Acme Mart'
        assert 'shifts_coverage_today' in response.data

