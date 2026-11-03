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
from apps.reports.models import DailyReport


@pytest.mark.django_db
class TestCustomerDataIsolationAndRBAC:
    @pytest.fixture(autouse=True)
    def setup_data(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            email='admin@test.com', username='admin@test.com', password='pass', role=User.Role.ADMIN, is_staff=True
        )

        # Customer 1
        self.cust1_user = User.objects.create_user(
            email='cust1@test.com', username='cust1@test.com', password='pass', role=User.Role.CUSTOMER
        )
        self.cust1_profile = CustomerProfile.objects.create(
            user=self.cust1_user, customer_code='CUST-001', company_name='Store Alpha'
        )

        # Customer 2
        self.cust2_user = User.objects.create_user(
            email='cust2@test.com', username='cust2@test.com', password='pass', role=User.Role.CUSTOMER
        )
        self.cust2_profile = CustomerProfile.objects.create(
            user=self.cust2_user, customer_code='CUST-002', company_name='Store Beta'
        )

        # Employee
        self.emp_user = User.objects.create_user(
            email='emp@test.com', username='emp@test.com', password='pass', role=User.Role.EMPLOYEE
        )
        self.emp_profile = EmployeeProfile.objects.create(
            user=self.emp_user, employee_code='EMP-001', phone='1234567890'
        )

        # Shift
        self.shift = Shift.objects.create(
            name='Morning', start_time=time(6, 0), end_time=time(14, 0)
        )

        # Assignment for Customer 1
        self.assignment1 = EmployeeCustomerAssignment.objects.create(
            employee=self.emp_profile,
            customer=self.cust1_profile,
            assigned_by=self.admin,
            status=EmployeeCustomerAssignment.Status.ACTIVE
        )
        self.shift_assign1 = ShiftAssignment.objects.create(
            employee_customer_assignment=self.assignment1,
            shift=self.shift,
            shift_date=timezone.localdate(),
            assigned_by=self.admin
        )
        self.report1 = DailyReport.objects.create(
            shift_assignment=self.shift_assign1,
            title='Confidential Report for Store Alpha',
            work_summary='Alpha incident log',
            status=DailyReport.Status.SUBMITTED,
            submitted_at=timezone.now(),
            created_by=self.emp_user
        )

    def test_customer2_cannot_access_customer1_reports(self):
        # Authenticate as Customer 2
        self.client.force_authenticate(user=self.cust2_user)

        # List reports: Store Alpha's report must NOT be in the results
        response = self.client.get('/api/v1/reports/')
        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        report_ids = [r['id'] for r in results]
        assert str(self.report1.id) not in report_ids

        # Direct access by ID: must return 404 (Not Found)
        detail_response = self.client.get(f'/api/v1/reports/{self.report1.id}/')
        assert detail_response.status_code == status.HTTP_404_NOT_FOUND

    def test_customer1_can_access_their_own_report(self):
        self.client.force_authenticate(user=self.cust1_user)
        detail_response = self.client.get(f'/api/v1/reports/{self.report1.id}/')
        assert detail_response.status_code == status.HTTP_200_OK
        assert detail_response.data['title'] == 'Confidential Report for Store Alpha'

    def test_employee_cannot_create_customer_accounts(self):
        self.client.force_authenticate(user=self.emp_user)
        response = self.client.post('/api/v1/customers/', {
            'company_name': 'Unauthorized Store',
            'contact_person': 'Hacker',
            'user': {
                'email': 'hacked@store.com',
                'password': 'Password123!'
            }
        }, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN

