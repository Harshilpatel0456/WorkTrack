from rest_framework import serializers
from django.db import transaction
from django.contrib.auth import get_user_model
from .models import CustomerProfile

User = get_user_model()


class CustomerProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email')
    companyName = serializers.CharField(source='company_name')
    customerCode = serializers.CharField(source='customer_code')
    contactPerson = serializers.CharField(source='contact_person')
    accountStatus = serializers.CharField(source='account_status')
    brandColor = serializers.CharField(source='brand_color', required=False, default='#245CE2')
    password = serializers.CharField(write_only=True, required=False, default='customer123')

    class Meta:
        model = CustomerProfile
        fields = [
            'id',
            'customerCode',
            'companyName',
            'industry',
            'contactPerson',
            'email',
            'phone',
            'address',
            'timezone',
            'accountStatus',
            'brandColor',
            'password',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    @transaction.atomic
    def create(self, validated_data):
        user_data = validated_data.pop('user')
        password = validated_data.pop('password', 'customer123')

        user = User.objects.create_user(
            email=user_data['email'],
            first_name=validated_data.get('contact_person', '').split(' ')[0],
            last_name=' '.join(validated_data.get('contact_person', '').split(' ')[1:]),
            role=User.Role.CUSTOMER,
            password=password
        )

        profile = CustomerProfile.objects.create(user=user, **validated_data)
        return profile

    @transaction.atomic
    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', None)
        if user_data and 'email' in user_data:
            instance.user.email = user_data['email']
            instance.user.save()

        return super().update(instance, validated_data)

