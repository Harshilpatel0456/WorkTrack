from rest_framework import serializers
from django.db import transaction
from django.contrib.auth import get_user_model
from .models import EmployeeProfile

User = get_user_model()


class EmployeeProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email')
    firstName = serializers.CharField(source='user.first_name')
    lastName = serializers.CharField(source='user.last_name')
    fullName = serializers.CharField(source='user.get_full_name', read_only=True)
    password = serializers.CharField(write_only=True, required=False, default='employee123')
    employeeId = serializers.CharField(source='employee_code')
    roleTitle = serializers.CharField(source='designation')
    joiningDate = serializers.DateField(source='joining_date')

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

    @transaction.atomic
    def create(self, validated_data):
        user_data = validated_data.pop('user')
        password = validated_data.pop('password', 'employee123')

        user = User.objects.create_user(
            email=user_data['email'],
            first_name=user_data.get('first_name', ''),
            last_name=user_data.get('last_name', ''),
            role=User.Role.EMPLOYEE,
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
            user.save()

        return super().update(instance, validated_data)

