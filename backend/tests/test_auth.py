import pytest
from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.core import mail
from apps.employees.models import EmployeeProfile
from apps.customers.models import CustomerProfile

User = get_user_model()


@pytest.mark.django_db
class TestAuthenticationAndRegistration:
    @pytest.fixture(autouse=True)
    def setup_data(self):
        cache.clear()
        self.client = APIClient()
        self.admin = User.objects.create_user(
            email='admin@test.com',
            username='admin@test.com',
            password='AdminPassword123!',
            role=User.Role.ADMIN,
            is_staff=True,
            first_name='Admin',
            last_name='User'
        )
        self.employee = User.objects.create_user(
            email='emp@test.com',
            username='emp@test.com',
            password='EmpPassword123!',
            role=User.Role.EMPLOYEE,
            first_name='Aarav',
            last_name='Shah'
        )
        self.emp_profile = EmployeeProfile.objects.create(
            user=self.employee,
            employee_code='EMP-AARAV',
            designation='Security Specialist'
        )
        self.customer = User.objects.create_user(
            email='cust@test.com',
            username='cust@test.com',
            password='CustPassword123!',
            role=User.Role.CUSTOMER,
            first_name='Robert',
            last_name='Henderson'
        )
        self.cust_profile = CustomerProfile.objects.create(
            user=self.customer,
            customer_code='CUST-ACME',
            company_name='Acme Store #104'
        )

    # ----------------- REGISTRATION TESTS -----------------
    def test_successful_employee_registration(self):
        response = self.client.post('/api/v1/auth/register/', {
            'first_name': 'Vikram',
            'last_name': 'Mehta',
            'email': 'vikram@worktrack.demo',
            'password': 'SecurePassword123!',
            'confirm_password': 'SecurePassword123!',
            'role': 'EMPLOYEE',
        }, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert 'access' in response.data
        assert 'refresh' in response.data
        assert response.data['user']['role'] == 'EMPLOYEE'

        # Verify EmployeeProfile automatically created
        new_user = User.objects.get(email='vikram@worktrack.demo')
        assert hasattr(new_user, 'employee_profile')
        assert new_user.employee_profile.employee_code.startswith('EMP-')

    def test_successful_customer_registration(self):
        response = self.client.post('/api/v1/auth/register/', {
            'first_name': 'Sarah',
            'last_name': 'Connor',
            'email': 'sarah@retailstore.demo',
            'password': 'SecurePassword123!',
            'confirm_password': 'SecurePassword123!',
            'role': 'CUSTOMER',
            'company_name': 'Cyberdyne Retail #204'
        }, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['user']['role'] == 'CUSTOMER'

        # Verify CustomerProfile automatically created
        new_user = User.objects.get(email='sarah@retailstore.demo')
        assert hasattr(new_user, 'customer_profile')
        assert new_user.customer_profile.company_name == 'Cyberdyne Retail #204'

    def test_admin_registration_rejected(self):
        response = self.client.post('/api/v1/auth/register/', {
            'first_name': 'Malicious',
            'last_name': 'Attacker',
            'email': 'hacker@worktrack.demo',
            'password': 'SecurePassword123!',
            'confirm_password': 'SecurePassword123!',
            'role': 'ADMIN',
        }, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'role' in str(response.data).lower()

    def test_duplicate_email_registration_rejected(self):
        response = self.client.post('/api/v1/auth/register/', {
            'first_name': 'Duplicate',
            'last_name': 'User',
            'email': 'emp@test.com',  # Already exists
            'password': 'SecurePassword123!',
            'confirm_password': 'SecurePassword123!',
            'role': 'EMPLOYEE',
        }, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'email' in str(response.data).lower()

    def test_password_confirmation_mismatch(self):
        response = self.client.post('/api/v1/auth/register/', {
            'first_name': 'Mismatch',
            'last_name': 'Test',
            'email': 'mismatch@worktrack.demo',
            'password': 'PasswordOne123!',
            'confirm_password': 'PasswordTwo999!',
            'role': 'EMPLOYEE',
        }, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'confirm_password' in response.data

    def test_weak_password_rejected(self):
        response = self.client.post('/api/v1/auth/register/', {
            'first_name': 'Short',
            'last_name': 'Pass',
            'email': 'short@worktrack.demo',
            'password': '123',
            'confirm_password': '123',
            'role': 'EMPLOYEE',
        }, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    # ----------------- LOGIN TESTS -----------------
    def test_login_success(self):
        response = self.client.post('/api/v1/auth/login/', {
            'email': 'admin@test.com',
            'password': 'AdminPassword123!'
        })
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        assert 'refresh' in response.data
        assert response.data['user']['role'] == 'ADMIN'

    def test_login_incorrect_password(self):
        response = self.client.post('/api/v1/auth/login/', {
            'email': 'admin@test.com',
            'password': 'WrongPassword123!'
        })
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_nonexistent_email(self):
        response = self.client.post('/api/v1/auth/login/', {
            'email': 'nonexistent@test.com',
            'password': 'Password123!'
        })
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_inactive_account_rejected(self):
        self.employee.is_active = False
        self.employee.save()
        response = self.client.post('/api/v1/auth/login/', {
            'email': 'emp@test.com',
            'password': 'EmpPassword123!'
        })
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_current_user_me(self):
        self.client.force_authenticate(user=self.employee)
        response = self.client.get('/api/v1/auth/me/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['email'] == 'emp@test.com'
        assert response.data['role'] == 'EMPLOYEE'
        assert response.data['employeeProfile']['employeeCode'] == 'EMP-AARAV'

    def test_logout_blacklists_token(self):
        # Obtain tokens
        login_res = self.client.post('/api/v1/auth/login/', {
            'email': 'admin@test.com',
            'password': 'AdminPassword123!'
        })
        refresh_token = login_res.data['refresh']

        # Logout with authentication
        self.client.force_authenticate(user=self.admin)
        logout_res = self.client.post('/api/v1/auth/logout/', {'refresh': refresh_token})
        assert logout_res.status_code == status.HTTP_200_OK

        # Attempt to use blacklisted refresh token
        refresh_attempt = self.client.post('/api/v1/auth/refresh/', {'refresh': refresh_token})
        assert refresh_attempt.status_code == status.HTTP_401_UNAUTHORIZED

    def test_logout_cannot_blacklist_another_users_token(self):
        login_res = self.client.post('/api/v1/auth/login/', {
            'email': 'emp@test.com',
            'password': 'EmpPassword123!'
        })
        refresh_token = login_res.data['refresh']

        self.client.force_authenticate(user=self.admin)
        logout_res = self.client.post('/api/v1/auth/logout/', {'refresh': refresh_token})
        assert logout_res.status_code == status.HTTP_400_BAD_REQUEST

        refresh_attempt = self.client.post('/api/v1/auth/refresh/', {'refresh': refresh_token})
        assert refresh_attempt.status_code == status.HTTP_200_OK

    # ----------------- PASSWORD MANAGEMENT TESTS -----------------
    def test_change_password_success(self):
        self.client.force_authenticate(user=self.employee)
        response = self.client.post('/api/v1/auth/change-password/', {
            'old_password': 'EmpPassword123!',
            'new_password': 'BrandNewEmpPassword123!',
            'confirm_password': 'BrandNewEmpPassword123!'
        })
        assert response.status_code == status.HTTP_200_OK

        # Verify new password works
        self.employee.refresh_from_db()
        assert self.employee.check_password('BrandNewEmpPassword123!')

    def test_change_password_invalid_old_password(self):
        self.client.force_authenticate(user=self.employee)
        response = self.client.post('/api/v1/auth/change-password/', {
            'old_password': 'IncorrectOldPassword!',
            'new_password': 'BrandNewEmpPassword123!'
        })
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'incorrect' in str(response.data).lower()

    def test_password_reset_request_and_confirm(self):
        # Request password reset
        response = self.client.post('/api/v1/auth/password-reset/', {
            'email': 'cust@test.com'
        })
        assert response.status_code == status.HTTP_200_OK

        # Generate token and uid for confirmation
        token = default_token_generator.make_token(self.customer)
        uid = urlsafe_base64_encode(force_bytes(self.customer.pk))

        # Confirm reset
        confirm_res = self.client.post('/api/v1/auth/password-reset/confirm/', {
            'uid': uid,
            'token': token,
            'new_password': 'ResetCustPassword123!',
            'confirm_password': 'ResetCustPassword123!'
        })
        assert confirm_res.status_code == status.HTTP_200_OK

        # Verify password changed
        self.customer.refresh_from_db()
        assert self.customer.check_password('ResetCustPassword123!')

    def test_password_reset_invalid_token(self):
        uid = urlsafe_base64_encode(force_bytes(self.customer.pk))
        confirm_res = self.client.post('/api/v1/auth/password-reset/confirm/', {
            'uid': uid,
            'token': 'invalid-or-expired-token',
            'new_password': 'ResetCustPassword123!',
            'confirm_password': 'ResetCustPassword123!'
        })
        assert confirm_res.status_code == status.HTTP_400_BAD_REQUEST

    # ----------------- ROLE-BASED ACCESS REJECTION TESTS -----------------
    def test_employee_cannot_access_admin_dashboard(self):
        self.client.force_authenticate(user=self.employee)
        response = self.client.get('/api/v1/dashboard/admin/')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_customer_cannot_access_employee_dashboard(self):
        self.client.force_authenticate(user=self.customer)
        response = self.client.get('/api/v1/dashboard/employee/')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_unauthenticated_cannot_access_dashboards(self):
        response = self.client.get('/api/v1/dashboard/admin/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
