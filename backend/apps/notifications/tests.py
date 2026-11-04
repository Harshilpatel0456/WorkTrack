from datetime import time
from unittest.mock import patch
from zoneinfo import ZoneInfo

import pytest
from celery.exceptions import Retry
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.assignments.models import EmployeeCustomerAssignment
from apps.customers.models import CustomerProfile
from apps.employees.models import EmployeeProfile
from apps.notifications.models import Notification, NotificationPreference
from apps.notifications.services import notify_assignment_recipients
from apps.notifications.tasks import send_email_notifications
from apps.reports.models import DailyReport
from apps.shifts.models import Shift, ShiftAssignment


@pytest.fixture
def notification_setup(db):
    admin = User.objects.create_user(
        email='notify-admin@test.com',
        password='pass',
        role=User.Role.ADMIN,
        is_staff=True,
    )
    employee_user = User.objects.create_user(
        email='notify-employee@test.com',
        password='pass',
        role=User.Role.EMPLOYEE,
    )
    employee = EmployeeProfile.objects.create(
        user=employee_user,
        employee_code='NOTIFY-EMP-1',
        phone='1111111111',
    )
    customer_user = User.objects.create_user(
        email='notify-customer@test.com',
        password='pass',
        role=User.Role.CUSTOMER,
    )
    customer = CustomerProfile.objects.create(
        user=customer_user,
        customer_code='NOTIFY-CUST-1',
        company_name='Notification Customer',
    )
    other_customer_user = User.objects.create_user(
        email='other-notify-customer@test.com',
        password='pass',
        role=User.Role.CUSTOMER,
    )
    other_customer = CustomerProfile.objects.create(
        user=other_customer_user,
        customer_code='NOTIFY-CUST-2',
        company_name='Other Notification Customer',
    )
    contract = EmployeeCustomerAssignment.objects.create(
        employee=employee,
        customer=customer,
        assigned_by=admin,
        status=EmployeeCustomerAssignment.Status.ACTIVE,
    )
    shift = Shift.objects.create(
        name='Notification Shift',
        start_time=time(8, 0),
        end_time=time(16, 0),
    )
    shift_assignment = ShiftAssignment.objects.create(
        employee_customer_assignment=contract,
        shift=shift,
        shift_date=timezone.localdate(),
        assigned_by=admin,
    )
    return {
        'admin': admin,
        'employee_user': employee_user,
        'customer_user': customer_user,
        'other_customer_user': other_customer_user,
        'other_customer': other_customer,
        'contract': contract,
        'shift_assignment': shift_assignment,
    }


@pytest.mark.django_db
def test_assignment_event_creates_role_scoped_notifications(notification_setup):
    assignment = notification_setup['shift_assignment']

    created = notify_assignment_recipients(
        assignment,
        event_type=Notification.EventType.REPORT_SUBMITTED,
        source_key='report:one:submitted:v1',
        title='Report submitted',
        message='A report was submitted.',
    )

    assert {item.recipient_id for item in created} == {
        notification_setup['admin'].id,
        notification_setup['employee_user'].id,
        notification_setup['customer_user'].id,
    }
    assert all(item.category == Notification.Category.REPORTS for item in created)


@pytest.mark.django_db
def test_successful_report_submission_creates_notifications_only_once(notification_setup):
    client = APIClient()
    client.force_authenticate(notification_setup['employee_user'])
    payload = {
        'shift_assignment': str(notification_setup['shift_assignment'].id),
        'title': 'Shift report',
        'work_summary': 'Work completed.',
        'status': DailyReport.Status.SUBMITTED,
    }

    success = client.post('/api/v1/reports/', payload, format='json')
    duplicate = client.post('/api/v1/reports/', payload, format='json')

    assert success.status_code == 201
    assert duplicate.status_code == 400
    assert Notification.objects.filter(
        event_type=Notification.EventType.REPORT_SUBMITTED,
        daily_report_id=success.data['id'],
    ).count() == 3


@pytest.mark.django_db
def test_report_submission_succeeds_when_email_queue_is_unavailable(
    notification_setup,
    django_capture_on_commit_callbacks,
):
    client = APIClient()
    client.force_authenticate(notification_setup['employee_user'])
    payload = {
        'shift_assignment': str(notification_setup['shift_assignment'].id),
        'title': 'Shift report',
        'work_summary': 'Work completed.',
        'status': DailyReport.Status.SUBMITTED,
    }

    with patch(
        'apps.notifications.tasks.send_email_notifications.delay',
        side_effect=RuntimeError('Notification broker unavailable'),
    ):
        with django_capture_on_commit_callbacks(execute=True):
            response = client.post('/api/v1/reports/', payload, format='json')

    assert response.status_code == 201
    assert Notification.objects.filter(
        event_type=Notification.EventType.REPORT_SUBMITTED,
        daily_report_id=response.data['id'],
        email_delivery_status=Notification.EmailDeliveryStatus.PENDING,
    ).count() == 3


@pytest.mark.django_db
def test_event_creation_is_idempotent(notification_setup):
    assignment = notification_setup['shift_assignment']
    arguments = {
        'event_type': Notification.EventType.SHIFT_SCHEDULED,
        'source_key': 'schedule:stable-id',
        'title': 'Shift assigned',
        'message': 'Shift schedule created.',
    }

    first = notify_assignment_recipients(assignment, **arguments)
    second = notify_assignment_recipients(assignment, **arguments)

    assert len(first) == 3
    assert second == []
    assert Notification.objects.filter(event_key__contains='schedule:stable-id').count() == 3


@pytest.mark.django_db
def test_notification_api_is_isolated_to_authenticated_recipient(notification_setup):
    notify_assignment_recipients(
        notification_setup['shift_assignment'],
        event_type=Notification.EventType.CHECK_IN,
        source_key='attendance:check-in',
        title='Checked in',
        message='Employee checked in.',
    )
    client = APIClient()
    client.force_authenticate(notification_setup['other_customer_user'])

    response = client.get('/api/v1/notifications/')

    assert response.status_code == 200
    assert response.data['results'] == []


@pytest.mark.django_db
def test_preference_endpoint_supports_categories_channels_timezone_and_digests(notification_setup):
    client = APIClient()
    client.force_authenticate(notification_setup['customer_user'])
    response = client.patch(
        '/api/v1/notifications/preferences/my_preference/',
        {
            'frequency': NotificationPreference.Frequency.DAILY,
            'enabled_categories': ['REPORTS', 'FEEDBACK'],
            'in_app_enabled': False,
            'email_enabled': True,
            'timezone': 'America/Chicago',
        },
        format='json',
    )

    assert response.status_code == 200
    preference = NotificationPreference.objects.get(user=notification_setup['customer_user'])
    assert preference.frequency == NotificationPreference.Frequency.DAILY
    assert preference.enabled_categories == ['REPORTS', 'FEEDBACK']
    assert preference.in_app_enabled is False
    assert preference.timezone == 'America/Chicago'


@pytest.mark.django_db
def test_disabled_category_suppresses_channel_delivery_but_records_event(notification_setup):
    user = notification_setup['customer_user']
    NotificationPreference.objects.create(
        user=user,
        enabled_categories=['FEEDBACK'],
        email_enabled=True,
    )
    notify_assignment_recipients(
        notification_setup['shift_assignment'],
        event_type=Notification.EventType.REPORT_SUBMITTED,
        source_key='disabled-category-report',
        title='Report submitted',
        message='Report created.',
    )
    event = Notification.objects.get(
        recipient=user,
        event_key__contains='disabled-category-report',
    )
    client = APIClient()
    client.force_authenticate(user)

    response = client.get('/api/v1/notifications/')

    assert event.email_delivery_status == Notification.EmailDeliveryStatus.SKIPPED
    assert response.data['results'] == []


@pytest.mark.django_db
def test_digest_scheduling_records_event_and_respects_user_timezone(notification_setup):
    user = notification_setup['customer_user']
    NotificationPreference.objects.create(
        user=user,
        frequency=NotificationPreference.Frequency.DAILY,
        timezone='America/Chicago',
    )

    created = notify_assignment_recipients(
        notification_setup['shift_assignment'],
        event_type=Notification.EventType.REPORT_SUBMITTED,
        source_key='daily-report:scheduled',
        title='Daily report',
        message='Report submitted.',
    )
    customer_event = next(item for item in created if item.recipient_id == user.id)

    assert customer_event.created_at is not None
    assert customer_event.email_delivery_status == Notification.EmailDeliveryStatus.PENDING
    scheduled_local = customer_event.scheduled_at.astimezone(ZoneInfo('America/Chicago'))
    assert customer_event.scheduled_at > customer_event.created_at
    assert (scheduled_local.hour, scheduled_local.minute) == (0, 0)


@pytest.mark.django_db
def test_email_delivery_tracks_retries_and_success(notification_setup):
    user = notification_setup['customer_user']
    preference, _ = NotificationPreference.objects.get_or_create(user=user)
    event = Notification.objects.create(
        recipient=user,
        event_type=Notification.EventType.REPORT_SUBMITTED,
        category=Notification.Category.REPORTS,
        event_key='email-retry-test',
        title='Report ready',
        message='A report was submitted.',
        email_delivery_status=Notification.EmailDeliveryStatus.PENDING,
    )

    with patch('apps.notifications.tasks.send_mail', side_effect=OSError('SMTP unavailable')):
        with patch.object(send_email_notifications, 'retry', side_effect=Retry()) as retry:
            with pytest.raises(Retry):
                send_email_notifications.run([str(event.id)])
    event.refresh_from_db()
    assert retry.called
    assert event.email_delivery_status == Notification.EmailDeliveryStatus.QUEUED
    assert event.email_attempts == 1
    assert 'SMTP unavailable' in event.email_error

    with patch('apps.notifications.tasks.send_mail', return_value=1):
        send_email_notifications.run([str(event.id)])
    event.refresh_from_db()
    assert event.email_delivery_status == Notification.EmailDeliveryStatus.SENT
    assert event.email_attempts == 2
    assert event.sent_at is not None
