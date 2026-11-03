from rest_framework import serializers
from apps.reports.models import DailyReport, ReportVersion, ReportAttachment
from apps.shifts.serializers import ShiftAssignmentSerializer


class ReportAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)

    class Meta:
        model = ReportAttachment
        fields = [
            'id',
            'daily_report',
            'file',
            'file_name',
            'file_type',
            'file_size',
            'uploaded_by',
            'uploaded_by_name',
            'uploaded_at',
        ]
        read_only_fields = ['id', 'uploaded_by', 'uploaded_by_name', 'uploaded_at']


class ReportVersionSerializer(serializers.ModelSerializer):
    modified_by_name = serializers.CharField(source='modified_by.get_full_name', read_only=True)

    class Meta:
        model = ReportVersion
        fields = [
            'id',
            'daily_report',
            'version_number',
            'title_snapshot',
            'content_snapshot',
            'modified_by',
            'modified_by_name',
            'modified_at',
            'change_summary',
        ]
        read_only_fields = ['id', 'modified_at']


class DailyReportSerializer(serializers.ModelSerializer):
    shift_details = ShiftAssignmentSerializer(source='shift_assignment', read_only=True)
    employee_name = serializers.SerializerMethodField()
    customer_name = serializers.SerializerMethodField()
    customer_id = serializers.SerializerMethodField()
    shift_name = serializers.SerializerMethodField()
    shift_date = serializers.SerializerMethodField()
    attachments = ReportAttachmentSerializer(many=True, read_only=True)
    versions_count = serializers.IntegerField(source='versions.count', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = DailyReport
        fields = [
            'id',
            'shift_assignment',
            'shift_details',
            'employee_name',
            'customer_name',
            'customer_id',
            'shift_name',
            'shift_date',
            'title',
            'work_summary',
            'tasks_completed',
            'pending_tasks',
            'issues_or_blockers',
            'additional_remarks',
            'version',
            'status',
            'submitted_at',
            'last_updated_at',
            'created_by',
            'created_by_name',
            'updated_by',
            'attachments',
            'versions_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'version',
            'submitted_at',
            'last_updated_at',
            'created_by',
            'updated_by',
            'created_at',
            'updated_at',
        ]

    def get_employee_name(self, obj):
        try:
            return obj.shift_assignment.employee_customer_assignment.employee.user.get_full_name()
        except Exception:
            return None

    def get_customer_name(self, obj):
        try:
            return obj.shift_assignment.employee_customer_assignment.customer.company_name
        except Exception:
            return None

    def get_customer_id(self, obj):
        try:
            return str(obj.shift_assignment.employee_customer_assignment.customer.id)
        except Exception:
            return None

    def get_shift_name(self, obj):
        try:
            return obj.shift_assignment.shift.name
        except Exception:
            return None

    def get_shift_date(self, obj):
        try:
            return str(obj.shift_assignment.shift_date)
        except Exception:
            return None

