import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.assignments.models import EmployeeCustomerAssignment
from apps.customers.models import CustomerProfile
from apps.employees.models import EmployeeProfile


@pytest.mark.django_db
class TestAdminPhaseOneEndpoints:
    @pytest.fixture(autouse=True)
    def setup_data(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            email='phase1-admin@example.test',
            password='ValidAdminPass123!',
            role=User.Role.ADMIN,
            is_staff=True,
        )
        self.employee_user = User.objects.create_user(
            email='phase1-employee@example.test',
            password='ValidEmployeePass123!',
            role=User.Role.EMPLOYEE,
            first_name='Erin',
            last_name='Employee',
        )
        self.employee = EmployeeProfile.objects.create(
            user=self.employee_user,
            employee_code='EMP-PHASE1',
        )
        self.customer_user = User.objects.create_user(
            email='phase1-customer@example.test',
            password='ValidCustomerPass123!',
            role=User.Role.CUSTOMER,
        )
        self.customer = CustomerProfile.objects.create(
            user=self.customer_user,
            customer_code='CUST-PHASE1',
            company_name='Phase One Store',
            contact_person='Casey Customer',
        )

    def test_admin_can_create_update_and_deactivate_employee(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/v1/employees/', {
            'employeeId': 'EMP-NEW-PHASE1',
            'email': 'new-employee@example.test',
            'firstName': 'New',
            'lastName': 'Employee',
            'password': 'StrongEmployeePass123!',
            'phone': '555-0101',
            'roleTitle': 'Field Specialist',
            'department': 'Operations',
        }, format='json')

        assert response.status_code == status.HTTP_201_CREATED, response.data
        employee_id = response.data['id']
        created_user = User.objects.get(email='new-employee@example.test')
        assert created_user.check_password('StrongEmployeePass123!')

        duplicate_employee = self.client.post('/api/v1/employees/', {
            'employeeId': 'EMP-NEW-PHASE1',
            'email': 'duplicate-employee@example.test',
            'firstName': 'Duplicate',
            'lastName': 'Employee',
            'password': 'StrongEmployeePass123!',
        }, format='json')
        assert duplicate_employee.status_code == status.HTTP_400_BAD_REQUEST
        assert 'employeeId' in duplicate_employee.data

        response = self.client.patch(f'/api/v1/employees/{employee_id}/', {
            'firstName': 'Updated',
            'email': 'updated-employee@example.test',
        }, format='json')
        assert response.status_code == status.HTTP_200_OK, response.data
        created_user.refresh_from_db()
        assert created_user.first_name == 'Updated'
        assert created_user.email == 'updated-employee@example.test'

        response = self.client.post(f'/api/v1/employees/{employee_id}/toggle_status/')
        assert response.status_code == status.HTTP_200_OK
        created_user.refresh_from_db()
        assert not created_user.is_active

        login_response = APIClient().post('/api/v1/auth/login/', {
            'email': 'new-employee@example.test',
            'password': 'StrongEmployeePass123!',
        }, format='json')
        assert login_response.status_code == status.HTTP_401_UNAUTHORIZED

        response = self.client.post(f'/api/v1/employees/{employee_id}/toggle_status/')
        assert response.status_code == status.HTTP_200_OK
        created_user.refresh_from_db()
        assert created_user.is_active

        response = self.client.delete(f'/api/v1/employees/{employee_id}/')
        assert response.status_code == status.HTTP_204_NO_CONTENT
        created_user.refresh_from_db()
        assert not created_user.is_active

    def test_employee_list_is_scoped_to_authenticated_employee(self):
        other_user = User.objects.create_user(
            email='other-employee@example.test',
            password='ValidOtherPass123!',
            role=User.Role.EMPLOYEE,
        )
        other_employee = EmployeeProfile.objects.create(
            user=other_user,
            employee_code='EMP-OTHER-PHASE1',
        )
        self.client.force_authenticate(user=self.employee_user)

        response = self.client.get('/api/v1/employees/')

        assert response.status_code == status.HTTP_200_OK
        returned_ids = {row['id'] for row in response.data['results']}
        assert returned_ids == {str(self.employee.id)}
        assert str(other_employee.id) not in returned_ids

    def test_admin_can_create_and_suspend_customer_account(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/v1/customers/', {
            'companyName': 'New Phase One Store',
            'industry': 'Retail',
            'contactPerson': 'Sam Storeowner',
            'email': 'new-customer@example.test',
            'password': 'StrongCustomerPass123!',
        }, format='json')

        assert response.status_code == status.HTTP_201_CREATED, response.data
        customer_id = response.data['id']
        assert response.data['customerCode'].startswith('CUST-')
        created_user = User.objects.get(email='new-customer@example.test')
        assert created_user.check_password('StrongCustomerPass123!')

        response = self.client.patch(f'/api/v1/customers/{customer_id}/', {
            'companyName': 'Updated Phase One Store',
            'contactPerson': 'Updated Contact Name',
        }, format='json')
        assert response.status_code == status.HTTP_200_OK, response.data
        created_user.refresh_from_db()
        assert created_user.first_name == 'Updated'

        response = self.client.post(f'/api/v1/customers/{customer_id}/toggle_status/')
        assert response.status_code == status.HTTP_200_OK
        created_user.refresh_from_db()
        assert not created_user.is_active

    def test_suspended_customer_created_by_admin_cannot_log_in(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/v1/customers/', {
            'companyName': 'Suspended Phase One Store',
            'contactPerson': 'Sam Storeowner',
            'email': 'suspended-customer@example.test',
            'password': 'StrongCustomerPass123!',
            'accountStatus': 'SUSPENDED',
        }, format='json')

        assert response.status_code == status.HTTP_201_CREATED, response.data
        customer_user = User.objects.get(email='suspended-customer@example.test')
        assert not customer_user.is_active
        login_response = APIClient().post('/api/v1/auth/login/', {
            'email': 'suspended-customer@example.test',
            'password': 'StrongCustomerPass123!',
        }, format='json')
        assert login_response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_customer_list_is_scoped_to_authenticated_customer(self):
        self.client.force_authenticate(user=self.customer_user)

        response = self.client.get('/api/v1/customers/')

        assert response.status_code == status.HTTP_200_OK
        assert [row['id'] for row in response.data['results']] == [str(self.customer.id)]

    def test_admin_can_assign_revoke_and_reactivate_employee(self):
        self.client.force_authenticate(user=self.admin)
        payload = {
            'employeeId': str(self.employee.id),
            'customerId': str(self.customer.id),
            'notes': 'Phase 1 assignment test',
        }

        response = self.client.post('/api/v1/assignments/', payload, format='json')
        assert response.status_code == status.HTTP_201_CREATED, response.data
        assignment_id = response.data['id']

        duplicate = self.client.post('/api/v1/assignments/', payload, format='json')
        assert duplicate.status_code == status.HTTP_400_BAD_REQUEST

        response = self.client.post(f'/api/v1/assignments/{assignment_id}/revoke/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == EmployeeCustomerAssignment.Status.REVOKED

        response = self.client.post(f'/api/v1/assignments/{assignment_id}/approve/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == EmployeeCustomerAssignment.Status.ACTIVE

    def test_employee_cannot_read_other_customer_profiles_or_write_assignments(self):
        self.client.force_authenticate(user=self.employee_user)

        customers = self.client.get('/api/v1/customers/')
        assignments = self.client.post('/api/v1/assignments/', {
            'employeeId': str(self.employee.id),
            'customerId': str(self.customer.id),
        }, format='json')

        assert customers.status_code == status.HTTP_200_OK
        assert customers.data['results'] == []
        assert assignments.status_code == status.HTTP_403_FORBIDDEN
