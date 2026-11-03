from rest_framework import serializers
from apps.surveillance.models import SurveillanceBatch, CameraSnapshot


class CameraSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = CameraSnapshot
        fields = [
            'id',
            'batch',
            'camera_id',
            'camera_name',
            'zone',
            'is_high_risk',
            'capture_time',
            'human_detected',
            'human_count',
            'ai_status',
            'ai_confidence',
            'ai_analysis',
            'employee_verification',
            'employee_notes',
            'simulated_visual',
        ]
        read_only_fields = ['id', 'batch', 'camera_id', 'camera_name', 'zone', 'is_high_risk', 'capture_time', 'human_detected', 'human_count', 'ai_status', 'ai_confidence', 'ai_analysis', 'simulated_visual']


class SurveillanceBatchSerializer(serializers.ModelSerializer):
    snapshots = CameraSnapshotSerializer(many=True, read_only=True)
    customer_name = serializers.CharField(source='customer.company_name', read_only=True)
    employee_name = serializers.CharField(source='employee.user.get_full_name', read_only=True)

    class Meta:
        model = SurveillanceBatch
        fields = [
            'id',
            'customer',
            'customer_name',
            'employee',
            'employee_name',
            'date',
            'hour_slot',
            'hour24',
            'status',
            'total_cameras',
            'flagged_suspicious_count',
            'overall_assessment',
            'actions_taken',
            'submitted_at',
            'customer_notified',
            'snapshots',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'total_cameras', 'created_at', 'updated_at']

