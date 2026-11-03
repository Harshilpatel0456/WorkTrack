from rest_framework import serializers
from apps.notifications.models import Notification, NotificationPreference, PushDevice


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id',
            'recipient',
            'customer',
            'daily_report',
            'event_type',
            'title',
            'message',
            'channel',
            'delivery_status',
            'scheduled_at',
            'sent_at',
            'read_at',
            'created_at',
        ]
        read_only_fields = ['id', 'recipient', 'created_at']


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.company_name', read_only=True)

    class Meta:
        model = NotificationPreference
        fields = [
            'id',
            'customer',
            'customer_name',
            'frequency',
            'immediate_alert_on_suspicious',
            'in_app_enabled',
            'email_enabled',
            'push_enabled',
            'updated_at',
        ]
        read_only_fields = ['id', 'customer', 'customer_name', 'updated_at']


class PushDeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = PushDevice
        fields = ['id', 'user', 'device_token', 'device_type', 'created_at', 'last_active_at']
        read_only_fields = ['id', 'user', 'created_at', 'last_active_at']

