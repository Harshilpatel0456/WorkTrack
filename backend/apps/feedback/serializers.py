from rest_framework import serializers
from apps.feedback.models import ReportComment


class CommentReplySerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.get_full_name', read_only=True)
    author_role = serializers.CharField(source='author.role', read_only=True)

    class Meta:
        model = ReportComment
        fields = [
            'id',
            'daily_report',
            'parent_comment',
            'author',
            'author_name',
            'author_role',
            'content',
            'is_edited',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'parent_comment', 'author', 'author_name', 'author_role', 'is_edited', 'created_at', 'updated_at']


class ReportCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.get_full_name', read_only=True)
    author_role = serializers.CharField(source='author.role', read_only=True)
    replies = CommentReplySerializer(many=True, read_only=True)

    class Meta:
        model = ReportComment
        fields = [
            'id',
            'daily_report',
            'parent_comment',
            'author',
            'author_name',
            'author_role',
            'content',
            'is_edited',
            'replies',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'parent_comment', 'author', 'author_name', 'author_role', 'is_edited', 'created_at', 'updated_at']

    def validate_content(self, value):
        if not value.strip():
            raise serializers.ValidationError('Comment content is required.')
        return value.strip()
