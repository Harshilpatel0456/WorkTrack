from rest_framework import serializers
from django.db import transaction
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from .models import EmployeeProfile

User = get_user_model()


class EmployeeProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email')
    firstName = serializers.CharField(source='user.first_name')
    lastName = serializers.CharField(source='user.last_name')
    fullName = serializers.CharField(source='user.get_full_name', read_only=True)
    password = serializers.CharField(write_only=True, required=False)
    employeeId = serializers.CharField(source='employee_code')
    roleTitle = serializers.CharField(source='designation')
    joiningDate = serializers.DateField(source='joining_date', required=False, default=timezone.localdate)

    class Meta:
        model = EmployeeProfile
        fields = [
            'id',
            'employeeId',
            'email',
            'firstName',
            'lastName',
            'fullName',
            'password',
            'phone',
            'roleTitle',
            'department',
            'joiningDate',
            'status',
            'address',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_employeeId(self, value):
        employee_profiles = EmployeeProfile.objects.filter(employee_code=value.strip())
        if self.instance:
            employee_profiles = employee_profiles.exclude(pk=self.instance.pk)
        if employee_profiles.exists():
            raise serializers.ValidationError('This employee ID is already in use.')
        return value.strip()

    def validate_email(self, value):
        users = User.objects.filter(email__iexact=value.strip())
        if self.instance:
            users = users.exclude(pk=self.instance.user_id)
        if users.exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value.strip().lower()

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        if self.instance is None and not attrs.get('password'):
            raise serializers.ValidationError({'password': 'An initial password is required.'})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        user_data = validated_data.pop('user')
        password = validated_data.pop('password')
        status_value = validated_data.get('status', EmployeeProfile.Status.ACTIVE)

        user = User.objects.create_user(
            email=user_data['email'],
            username=user_data['email'],
            first_name=user_data.get('first_name', ''),
            last_name=user_data.get('last_name', ''),
            role=User.Role.EMPLOYEE,
            is_active=status_value != EmployeeProfile.Status.INACTIVE,
            password=password
        )

        profile = EmployeeProfile.objects.create(user=user, **validated_data)
        return profile

    @transaction.atomic
    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', None)
        if user_data:
            user = instance.user
            if 'first_name' in user_data:
                user.first_name = user_data['first_name']
            if 'last_name' in user_data:
                user.last_name = user_data['last_name']
            if 'email' in user_data:
                user.email = user_data['email']
                user.username = user_data['email']
            user.save()

        profile = super().update(instance, validated_data)
        if 'status' in validated_data:
            profile.user.is_active = profile.status != EmployeeProfile.Status.INACTIVE
            profile.user.save(update_fields=['is_active'])
        return profile
