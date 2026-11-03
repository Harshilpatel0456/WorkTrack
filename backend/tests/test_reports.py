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
from apps.reports.models import DailyReport, ReportVersion


@pytest.mark.django_db
class TestDailyReportsAndVersioning:
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

    def test_create_report_and_initial_version(self):
        self.client.force_authenticate(user=self.emp_user)
        response = self.client.post('/api/v1/reports/', {
            'shift_assignment': str(self.shift_assignment.id),
            'title': 'Morning Shift Security Brief',
            'work_summary': 'Premises secured, perimeter monitored.',
            'tasks_completed': 'Walkthrough done',
            'pending_tasks': 'None',
            'issues_or_blockers': 'None'
        })
        assert response.status_code == status.HTTP_201_CREATED
        report_id = response.data['id']

        # Verify ReportVersion created
        versions = ReportVersion.objects.filter(daily_report_id=report_id)
        assert versions.count() == 1
        assert versions.first().version_number == 1
        assert versions.first().title_snapshot == 'Morning Shift Security Brief'

    def test_update_report_increments_version_and_preserves_snapshot(self):
        self.client.force_authenticate(user=self.emp_user)
        # Create initial report
        create_res = self.client.post('/api/v1/reports/', {
            'shift_assignment': str(self.shift_assignment.id),
            'title': 'Initial Title',
            'work_summary': 'Initial summary',
        })
        report_id = create_res.data['id']

        # Update report
        patch_res = self.client.patch(f'/api/v1/reports/{report_id}/', {
            'title': 'Updated Title v2',
            'work_summary': 'Updated summary with added details',
            'change_summary': 'Added perimeter notes'
        })
        assert patch_res.status_code == status.HTTP_200_OK
        assert patch_res.data['version'] == 2

        # Verify two distinct snapshots exist
        versions = ReportVersion.objects.filter(daily_report_id=report_id).order_by('version_number')
        assert versions.count() == 2
        assert versions[0].title_snapshot == 'Initial Title'
        assert versions[1].title_snapshot == 'Updated Title v2'
        assert versions[1].change_summary == 'Added perimeter notes'

    def test_submit_report(self):
        self.client.force_authenticate(user=self.emp_user)
        report = DailyReport.objects.create(
            shift_assignment=self.shift_assignment,
            title='Draft Report',
            work_summary='Summary here',
            created_by=self.emp_user
        )
        response = self.client.post(f'/api/v1/reports/{report.id}/submit/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == DailyReport.Status.SUBMITTED
        assert response.data['submitted_at'] is not None

