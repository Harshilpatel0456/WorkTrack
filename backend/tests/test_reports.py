import pytest
from datetime import time
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.employees.models import EmployeeProfile
from apps.customers.models import CustomerProfile
from apps.assignments.models import EmployeeCustomerAssignment
from apps.shifts.models import Shift, ShiftAssignment
from apps.reports.models import DailyReport, ReportVersion
from apps.reports.serializers import validate_report_attachment


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

    def test_duplicate_report_for_shift_is_rejected(self):
        self.client.force_authenticate(user=self.emp_user)
        payload = {
            'shift_assignment': str(self.shift_assignment.id),
            'title': 'Shift Report',
            'work_summary': 'Work completed.',
        }
        assert self.client.post('/api/v1/reports/', payload).status_code == status.HTTP_201_CREATED
        duplicate = self.client.post('/api/v1/reports/', payload)
        assert duplicate.status_code == status.HTTP_400_BAD_REQUEST

    def test_employee_cannot_report_for_another_employees_shift(self):
        other_user = User.objects.create_user(
            email='other@test.com', username='other@test.com', password='pass', role=User.Role.EMPLOYEE
        )
        other_employee = EmployeeProfile.objects.create(
            user=other_user, employee_code='EMP-002', phone='1234567891'
        )
        other_assignment = EmployeeCustomerAssignment.objects.create(
            employee=other_employee,
            customer=self.cust_profile,
            assigned_by=self.admin,
            status=EmployeeCustomerAssignment.Status.ACTIVE,
        )
        other_shift = ShiftAssignment.objects.create(
            employee_customer_assignment=other_assignment,
            shift=self.shift,
            shift_date=timezone.localdate(),
            assigned_by=self.admin,
        )
        self.client.force_authenticate(user=self.emp_user)
        response = self.client.post('/api/v1/reports/', {
            'shift_assignment': str(other_shift.id),
            'title': 'Unauthorized report',
            'work_summary': 'Not assigned.',
        })
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_employee_can_only_list_own_reports(self):
        own_report = DailyReport.objects.create(
            shift_assignment=self.shift_assignment,
            title='Own report',
            work_summary='Own summary',
            created_by=self.emp_user,
        )
        other_user = User.objects.create_user(
            email='other-list@test.com', username='other-list@test.com', password='pass', role=User.Role.EMPLOYEE
        )
        other_employee = EmployeeProfile.objects.create(
            user=other_user, employee_code='EMP-003', phone='1234567892'
        )
        other_assignment = EmployeeCustomerAssignment.objects.create(
            employee=other_employee,
            customer=self.cust_profile,
            assigned_by=self.admin,
            status=EmployeeCustomerAssignment.Status.ACTIVE,
        )
        other_shift = ShiftAssignment.objects.create(
            employee_customer_assignment=other_assignment,
            shift=self.shift,
            shift_date=timezone.localdate(),
            assigned_by=self.admin,
        )
        DailyReport.objects.create(
            shift_assignment=other_shift,
            title='Other report',
            work_summary='Other summary',
            created_by=other_user,
        )
        self.client.force_authenticate(user=self.emp_user)
        response = self.client.get('/api/v1/reports/')
        assert response.status_code == status.HTTP_200_OK
        assert {item['id'] for item in response.data['results']} == {str(own_report.id)}

    def test_version_records_previous_content_and_editor(self):
        self.client.force_authenticate(user=self.emp_user)
        created = self.client.post('/api/v1/reports/', {
            'shift_assignment': str(self.shift_assignment.id),
            'title': 'Original',
            'work_summary': 'Original summary',
        })
        report_id = created.data['id']
        updated = self.client.patch(f'/api/v1/reports/{report_id}/', {
            'title': 'Revised',
            'work_summary': 'Revised summary',
            'change_summary': 'Correction',
        })
        assert updated.status_code == status.HTTP_200_OK
        version = ReportVersion.objects.get(daily_report_id=report_id, version_number=2)
        assert version.modified_by == self.emp_user
        assert version.previous_content_snapshot['title'] == 'Original'
        assert version.previous_content_snapshot['work_summary'] == 'Original summary'
        assert version.content_snapshot['title'] == 'Revised'

    def test_customer_sees_only_own_submitted_reports_and_cannot_comment_elsewhere(self):
        own_report = DailyReport.objects.create(
            shift_assignment=self.shift_assignment,
            title='Own submitted',
            work_summary='Submitted summary',
            status=DailyReport.Status.SUBMITTED,
            created_by=self.emp_user,
        )
        second_customer_user = User.objects.create_user(
            email='other-customer@test.com',
            username='other-customer@test.com',
            password='pass',
            role=User.Role.CUSTOMER,
        )
        second_customer = CustomerProfile.objects.create(
            user=second_customer_user,
            customer_code='CUST-002',
            company_name='Other Account',
        )
        second_assignment = EmployeeCustomerAssignment.objects.create(
            employee=self.emp_profile,
            customer=second_customer,
            assigned_by=self.admin,
            status=EmployeeCustomerAssignment.Status.ACTIVE,
        )
        foreign_shift = ShiftAssignment.objects.create(
            employee_customer_assignment=second_assignment,
            shift=self.shift,
            shift_date=timezone.localdate(),
            assigned_by=self.admin,
        )
        foreign_report = DailyReport.objects.create(
            shift_assignment=foreign_shift,
            title='Foreign submitted',
            work_summary='Private summary',
            status=DailyReport.Status.SUBMITTED,
            created_by=self.emp_user,
        )
        self.client.force_authenticate(user=self.cust_user)
        listed = self.client.get('/api/v1/reports/')
        assert listed.status_code == status.HTTP_200_OK
        assert {item['id'] for item in listed.data['results']} == {str(own_report.id)}
        denied = self.client.post('/api/v1/feedback/comments/', {
            'daily_report': str(foreign_report.id),
            'content': 'Unauthorized comment',
        })
        assert denied.status_code == status.HTTP_403_FORBIDDEN
        allowed = self.client.post('/api/v1/feedback/comments/', {
            'daily_report': str(own_report.id),
            'content': 'Customer feedback',
        })
        assert allowed.status_code == status.HTTP_201_CREATED

    def test_summary_counts_drafts_as_pending_until_submission(self):
        self.client.force_authenticate(user=self.emp_user)
        created = self.client.post('/api/v1/reports/', {
            'shift_assignment': str(self.shift_assignment.id),
            'title': 'Draft report',
            'work_summary': 'Work is not yet handed over.',
            'status': DailyReport.Status.DRAFT,
        })
        assert created.status_code == status.HTTP_201_CREATED
        summary_url = f'/api/v1/reports/summary/?date={timezone.localdate()}'
        assert self.client.get(summary_url).data['daily']['pending'] == 1
        self.client.post(f"/api/v1/reports/{created.data['id']}/submit/")
        assert self.client.get(summary_url).data['daily']['pending'] == 0


def test_report_attachment_validation_accepts_allowed_extension():
    upload = SimpleUploadedFile('evidence.pdf', b'%PDF-1.4')
    assert validate_report_attachment(upload) is upload


def test_report_attachment_validation_rejects_unsupported_extension():
    upload = SimpleUploadedFile('payload.exe', b'not allowed')
    with pytest.raises(ValidationError):
        validate_report_attachment(upload)


def test_report_attachment_validation_enforces_size_limit():
    upload = SimpleUploadedFile('large.pdf', b'x' * (10 * 1024 * 1024 + 1))
    with pytest.raises(ValidationError):
        validate_report_attachment(upload)
