from datetime import time

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.assignments.models import EmployeeCustomerAssignment
from apps.customers.models import CustomerProfile
from apps.employees.models import EmployeeProfile
from apps.shifts.models import Shift, ShiftAssignment


@pytest.mark.django_db
class TestShiftManagementPhaseTwo:
    @pytest.fixture(autouse=True)
    def setup_data(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            email='shift-admin@example.test',
            password='ValidAdminPass123!',
            role=User.Role.ADMIN,
            is_staff=True,
        )
        self.employee_user = User.objects.create_user(
            email='shift-employee@example.test',
            password='ValidEmployeePass123!',
            role=User.Role.EMPLOYEE,
            first_name='Shift',
            last_name='Employee',
        )
        self.employee = EmployeeProfile.objects.create(
            user=self.employee_user,
            employee_code='EMP-SHIFT-1',
        )
        self.customer_user = User.objects.create_user(
            email='shift-customer@example.test',
            password='ValidCustomerPass123!',
            role=User.Role.CUSTOMER,
        )
        self.customer = CustomerProfile.objects.create(
            user=self.customer_user,
            customer_code='CUST-SHIFT-1',
            company_name='Shift Customer',
            contact_person='Casey Customer',
        )
        self.relationship = EmployeeCustomerAssignment.objects.create(
            employee=self.employee,
            customer=self.customer,
            assigned_by=self.admin,
        )
        self.client.force_authenticate(user=self.admin)

    def create_shift(self, start=time(8), end=time(16), overnight=False, days=None, **kwargs):
        return Shift.objects.create(
            name=kwargs.get('name', 'Day Shift'),
            start_time=start,
            end_time=end,
            is_overnight=overnight,
            working_days=list(range(7)) if days is None else days,
        )

    def create_schedule(self, shift, date='2026-11-02', relationship=None, **kwargs):
        return self.client.post('/api/v1/shifts/schedules/', {
            'assignmentId': str((relationship or self.relationship).id),
            'shiftId': str(shift.id),
            'shiftDate': date,
            **kwargs,
        }, format='json')

    def test_admin_can_create_update_deactivate_and_delete_shift(self):
        created = self.client.post('/api/v1/shifts/templates/', {
            'name': 'Night Coverage',
            'startTime': '22:00',
            'endTime': '06:00',
            'isOvernight': True,
            'workingDays': [0, 1, 2, 3, 4],
            'description': 'Overnight coverage',
        }, format='json')
        assert created.status_code == status.HTTP_201_CREATED, created.data
        shift_id = created.data['id']
        assert created.data['workingDays'] == [0, 1, 2, 3, 4]
        assert created.data['isOvernight'] is True

        updated = self.client.patch(f'/api/v1/shifts/templates/{shift_id}/', {
            'name': 'Updated Night Coverage',
            'is_active': False,
        }, format='json')
        assert updated.status_code == status.HTTP_200_OK, updated.data
        assert updated.data['name'] == 'Updated Night Coverage'
        assert updated.data['is_active'] is False

        deleted = self.client.delete(f'/api/v1/shifts/templates/{shift_id}/')
        assert deleted.status_code == status.HTTP_204_NO_CONTENT

    @pytest.mark.parametrize('payload,field', [
        ({'name': 'Invalid', 'startTime': '08:00', 'endTime': '08:00', 'workingDays': [0]}, 'endTime'),
        ({'name': 'Invalid', 'startTime': '22:00', 'endTime': '06:00', 'workingDays': [0]}, 'isOvernight'),
        ({'name': 'Invalid', 'startTime': '08:00', 'endTime': '16:00', 'workingDays': []}, 'workingDays'),
        ({'name': 'Invalid', 'startTime': '08:00', 'endTime': '16:00', 'workingDays': [0, 0]}, 'workingDays'),
    ])
    def test_invalid_shift_templates_are_rejected(self, payload, field):
        response = self.client.post('/api/v1/shifts/templates/', payload, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert field in response.data

    def test_admin_can_schedule_edit_and_cancel_shift(self):
        shift = self.create_shift(days=[0])
        response = self.create_schedule(shift)
        assert response.status_code == status.HTTP_201_CREATED, response.data
        schedule_id = response.data['id']
        assert response.data['employeeName'] == 'Shift Employee'
        assert response.data['customerName'] == 'Shift Customer'

        update = self.client.patch(f'/api/v1/shifts/schedules/{schedule_id}/', {
            'shiftDate': '2026-11-09',
        }, format='json')
        assert update.status_code == status.HTTP_200_OK, update.data
        assert update.data['shiftDate'] == '2026-11-09'

        cancel = self.client.post(f'/api/v1/shifts/schedules/{schedule_id}/cancel/')
        assert cancel.status_code == status.HTTP_200_OK
        assert cancel.data['status'] == ShiftAssignment.Status.CANCELLED

        recreate = self.create_schedule(shift, date='2026-11-09')
        assert recreate.status_code == status.HTTP_201_CREATED, recreate.data

    def test_schedules_require_active_relationship_shift_and_working_day(self):
        shift = self.create_shift(days=[1])
        wrong_day = self.create_schedule(shift, date='2026-11-02')
        assert wrong_day.status_code == status.HTTP_400_BAD_REQUEST
        assert 'shiftDate' in wrong_day.data

        shift.is_active = False
        shift.save(update_fields=['is_active'])
        inactive_shift = self.create_schedule(shift, date='2026-11-03')
        assert inactive_shift.status_code == status.HTTP_400_BAD_REQUEST

        shift.is_active = True
        shift.save(update_fields=['is_active'])
        self.relationship.status = EmployeeCustomerAssignment.Status.REVOKED
        self.relationship.save(update_fields=['status'])
        inactive_relationship = self.create_schedule(shift, date='2026-11-03')
        assert inactive_relationship.status_code == status.HTTP_400_BAD_REQUEST

    def test_overlapping_schedules_for_an_employee_are_rejected(self):
        shift = self.create_shift(start=time(8), end=time(16))
        first = self.create_schedule(shift)
        assert first.status_code == status.HTTP_201_CREATED, first.data

        another_customer_user = User.objects.create_user(
            email='shift-customer-two@example.test',
            password='ValidCustomerPass123!',
            role=User.Role.CUSTOMER,
        )
        another_customer = CustomerProfile.objects.create(
            user=another_customer_user,
            customer_code='CUST-SHIFT-2',
            company_name='Second Shift Customer',
            contact_person='Taylor Contact',
        )
        other_relationship = EmployeeCustomerAssignment.objects.create(
            employee=self.employee,
            customer=another_customer,
            assigned_by=self.admin,
        )
        overlapping = self.create_schedule(shift, relationship=other_relationship)
        assert overlapping.status_code == status.HTTP_400_BAD_REQUEST
        assert 'overlapping' in str(overlapping.data).lower()

    def test_overnight_overlap_is_checked_across_calendar_days(self):
        night = self.create_shift(
            start=time(22),
            end=time(6),
            overnight=True,
            days=[0],
            name='Night Shift',
        )
        day = self.create_shift(start=time(5), end=time(13), days=[1], name='Early Shift')
        first = self.create_schedule(night, date='2026-11-02')
        assert first.status_code == status.HTTP_201_CREATED, first.data

        next_day_conflict = self.create_schedule(day, date='2026-11-03')
        assert next_day_conflict.status_code == status.HTTP_400_BAD_REQUEST

        day.start_time = time(6)
        day.end_time = time(14)
        day.save()
        adjacent_shift = self.create_schedule(day, date='2026-11-03')
        assert adjacent_shift.status_code == status.HTTP_201_CREATED, adjacent_shift.data

    def test_schedule_template_cannot_make_existing_schedule_invalid(self):
        shift = self.create_shift(days=[0])
        created = self.create_schedule(shift)
        assert created.status_code == status.HTTP_201_CREATED, created.data

        update = self.client.patch(f'/api/v1/shifts/templates/{shift.id}/', {
            'workingDays': [1],
        }, format='json')
        assert update.status_code == status.HTTP_400_BAD_REQUEST

    def test_employee_and_customer_only_see_their_schedules_and_cannot_write(self):
        shift = self.create_shift()
        created = self.create_schedule(shift)
        assert created.status_code == status.HTTP_201_CREATED, created.data
        schedule_id = created.data['id']

        self.client.force_authenticate(user=self.employee_user)
        employee_list = self.client.get('/api/v1/shifts/schedules/')
        assert employee_list.status_code == status.HTTP_200_OK
        assert len(employee_list.data['results']) == 1
        denied_create = self.client.post('/api/v1/shifts/schedules/', {}, format='json')
        assert denied_create.status_code == status.HTTP_403_FORBIDDEN
        denied_cancel = self.client.post(f'/api/v1/shifts/schedules/{schedule_id}/cancel/')
        assert denied_cancel.status_code == status.HTTP_403_FORBIDDEN

        self.client.force_authenticate(user=self.customer_user)
        customer_list = self.client.get('/api/v1/shifts/schedules/')
        assert customer_list.status_code == status.HTTP_200_OK
        assert len(customer_list.data['results']) == 1

        unrelated_user = User.objects.create_user(
            email='unrelated-shift-customer@example.test',
            password='ValidCustomerPass123!',
            role=User.Role.CUSTOMER,
        )
        CustomerProfile.objects.create(
            user=unrelated_user,
            customer_code='CUST-SHIFT-3',
            company_name='Unrelated Customer',
            contact_person='Jordan Contact',
        )
        self.client.force_authenticate(user=unrelated_user)
        unrelated_list = self.client.get('/api/v1/shifts/schedules/')
        assert unrelated_list.status_code == status.HTTP_200_OK
        assert unrelated_list.data['results'] == []

    def test_shift_with_schedules_must_be_deactivated_instead_of_deleted(self):
        shift = self.create_shift()
        assert self.create_schedule(shift).status_code == status.HTTP_201_CREATED
        response = self.client.delete(f'/api/v1/shifts/templates/{shift.id}/')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert Shift.objects.filter(pk=shift.id).exists()
