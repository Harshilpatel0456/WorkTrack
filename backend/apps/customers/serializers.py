import uuid

from rest_framework import serializers
from django.db import transaction
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import CustomerProfile

User = get_user_model()


class CustomerProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email')
    companyName = serializers.CharField(source='company_name')
    customerCode = serializers.CharField(source='customer_code', read_only=True)
    contactPerson = serializers.CharField(source='contact_person')
    accountStatus = serializers.ChoiceField(
        source='account_status',
        choices=CustomerProfile.AccountStatus.choices,
        required=False,
        default=CustomerProfile.AccountStatus.ACTIVE,
    )
    brandColor = serializers.CharField(source='brand_color', required=False, default='#245CE2')
    password = serializers.CharField(write_only=True, required=False)

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
        contact_parts = validated_data.get('contact_person', '').split()
        account_status = validated_data.get(
            'account_status',
            CustomerProfile.AccountStatus.ACTIVE,
        )

        user = User.objects.create_user(
            email=user_data['email'],
            username=user_data['email'],
            first_name=contact_parts[0] if contact_parts else '',
            last_name=' '.join(contact_parts[1:]),
            role=User.Role.CUSTOMER,
            is_active=account_status != CustomerProfile.AccountStatus.SUSPENDED,
            password=password
        )

        validated_data.setdefault('customer_code', f"CUST-{uuid.uuid4().hex[:8].upper()}")
        profile = CustomerProfile.objects.create(user=user, **validated_data)
        return profile

    @transaction.atomic
    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', None)
        if user_data and 'email' in user_data:
            instance.user.email = user_data['email']
            instance.user.username = user_data['email']
        if 'contact_person' in validated_data:
            contact_parts = validated_data['contact_person'].split()
            instance.user.first_name = contact_parts[0] if contact_parts else ''
            instance.user.last_name = ' '.join(contact_parts[1:])
        if user_data or 'contact_person' in validated_data:
            instance.user.save()

        profile = super().update(instance, validated_data)
        if 'account_status' in validated_data:
            profile.user.is_active = profile.account_status != CustomerProfile.AccountStatus.SUSPENDED
            profile.user.save(update_fields=['is_active'])
        return profile
