from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from rest_framework import serializers

from apps.notifications.models import Notification, NotificationPreference, PushDevice


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id',
            'daily_report',
            'event_type',
            'category',
            'title',
            'message',
            'channel',
            'delivery_status',
            'email_delivery_status',
            'email_attempts',
            'scheduled_at',
            'sent_at',
            'read_at',
            'created_at',
        ]
        read_only_fields = fields


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = [
            'frequency',
            'enabled_categories',
            'in_app_enabled',
            'email_enabled',
            'timezone',
            'updated_at',
        ]
        read_only_fields = ['updated_at']

    def validate_enabled_categories(self, value):
        valid_categories = {category for category, _ in Notification.Category.choices}
        if (
            not isinstance(value, list)
            or any(not isinstance(item, str) for item in value)
            or not set(value).issubset(valid_categories)
        ):
            raise serializers.ValidationError('Choose valid notification categories.')
        return value

    def validate_timezone(self, value):
        try:
            ZoneInfo(value)
        except ZoneInfoNotFoundError as exc:
            raise serializers.ValidationError('Enter a valid IANA timezone.') from exc
        return value


class PushDeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = PushDevice
        fields = ['id', 'user', 'device_token', 'device_type', 'created_at', 'last_active_at']
        read_only_fields = ['id', 'user', 'created_at', 'last_active_at']
