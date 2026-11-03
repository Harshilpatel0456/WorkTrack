from rest_framework import serializers
from apps.audit.models import ActivityLog


class ActivityLogSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)

    class Meta:
        model = ActivityLog
        fields = [
            'id',
            'user',
            'user_email',
            'user_name',
            'action',
            'entity_type',
            'entity_id',
            'description',
            'ip_address',
            'created_at',
        ]
        read_only_fields = ['id', 'user', 'user_email', 'user_name', 'created_at']

