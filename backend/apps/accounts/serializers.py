import uuid
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from apps.employees.models import EmployeeProfile
from apps.customers.models import CustomerProfile

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT serializer that adds user role, name, and profile details
    into token claims and response payload.
    """
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['email'] = user.email
        token['fullName'] = user.get_full_name()
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        if not user.is_active:
            raise serializers.ValidationError('This user account has been deactivated.')

        data['user'] = {
            'id': str(user.id),
            'email': user.email,
            'firstName': user.first_name,
            'lastName': user.last_name,
            'fullName': user.get_full_name(),
            'role': user.role,
        }
        if hasattr(user, 'employee_profile'):
            emp = user.employee_profile
            data['user']['employeeId'] = emp.employee_code
            data['user']['designation'] = emp.designation
            data['user']['department'] = emp.department
        elif hasattr(user, 'customer_profile'):
            cust = user.customer_profile
            data['user']['customerId'] = cust.customer_code
            data['user']['companyName'] = cust.company_name
        return data


class UserSerializer(serializers.ModelSerializer):
    fullName = serializers.CharField(source='get_full_name', read_only=True)
    employeeProfile = serializers.SerializerMethodField()
    customerProfile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'username',
            'first_name',
            'last_name',
            'fullName',
            'role',
            'is_active',
            'date_joined',
            'employeeProfile',
            'customerProfile',
        ]
        read_only_fields = ['id', 'date_joined']

    def get_employeeProfile(self, obj):
        if hasattr(obj, 'employee_profile'):
            emp = obj.employee_profile
            return {
                'id': str(emp.id),
                'employeeCode': emp.employee_code,
                'designation': emp.designation,
                'department': emp.department,
                'phone': emp.phone,
                'status': emp.status,
            }
        return None

    def get_customerProfile(self, obj):
        if hasattr(obj, 'customer_profile'):
            cust = obj.customer_profile
            return {
                'id': str(cust.id),
                'customerCode': cust.customer_code,
                'companyName': cust.company_name,
                'contactPerson': cust.contact_person,
                'timezone': cust.timezone,
                'phone': cust.phone,
                'address': cust.address,
            }
        return None


class UserRegistrationSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150, required=True)
    last_name = serializers.CharField(max_length=150, required=True)
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True)
    confirm_password = serializers.CharField(write_only=True, required=True)
    role = serializers.ChoiceField(choices=[User.Role.EMPLOYEE, User.Role.CUSTOMER], required=True)
    company_name = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')

    def validate_email(self, value):
        clean_email = value.strip().lower()
        if User.objects.filter(email__iexact=clean_email).exists():
            raise serializers.ValidationError("An account with this email address already exists.")
        return clean_email

    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})

        validate_password(attrs['password'])

        if attrs.get('role') == User.Role.ADMIN:
            raise serializers.ValidationError({"role": "Administrator accounts cannot be created via public registration."})

        return attrs

    def create(self, validated_data):
        email = validated_data['email']
        password = validated_data['password']
        first_name = validated_data['first_name']
        last_name = validated_data['last_name']
        role = validated_data['role']
        company_name = validated_data.get('company_name', '')

        user = User.objects.create_user(
            email=email,
            username=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role=role,
            is_active=True
        )

        # Create appropriate sub-profile
        if role == User.Role.EMPLOYEE:
            unique_code = f"EMP-{uuid.uuid4().hex[:6].upper()}"
            EmployeeProfile.objects.create(
                user=user,
                employee_code=unique_code,
                designation="Field Specialist",
                department="Operations",
                joining_date=timezone.localdate()
            )
        elif role == User.Role.CUSTOMER:
            unique_code = f"CUST-{uuid.uuid4().hex[:6].upper()}"
            comp_name = company_name.strip() if company_name else f"{user.get_full_name()}'s Organization"
            CustomerProfile.objects.create(
                user=user,
                customer_code=unique_code,
                company_name=comp_name,
                contact_person=user.get_full_name(),
                timezone="America/New_York"
            )

        return user


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True)
    confirm_password = serializers.CharField(required=False, write_only=True, allow_blank=True)

    def validate(self, attrs):
        confirm_password = attrs.get('confirm_password')
        if confirm_password and attrs['new_password'] != confirm_password:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        validate_password(attrs['new_password'])
        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)

    def save(self):
        email = self.validated_data['email'].strip().lower()
        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if user:
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
            reset_url = f"{frontend_url}/reset-password?uid={uid}&token={token}"

            subject = "WorkTrack: Password Reset Request"
            message = (
                f"Hello {user.get_full_name()},\n\n"
                f"You requested a password reset for your WorkTrack account.\n"
                f"Please use the link below to set a new password:\n{reset_url}\n\n"
                f"Reset Token: {token}\n"
                f"User ID: {uid}\n\n"
                f"If you did not make this request, you can safely ignore this email.\n\n"
                f"— WorkTrack Security Team"
            )
            try:
                send_mail(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                    fail_silently=True
                )
            except Exception:
                pass


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField(required=True)
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, write_only=True)
    confirm_password = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})

        validate_password(attrs['new_password'])

        try:
            uid_str = force_str(urlsafe_base64_decode(attrs['uid']))
            self.user = User.objects.get(pk=uid_str, is_active=True)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            raise serializers.ValidationError({"uid": "Invalid password reset link or user does not exist."})

        if not default_token_generator.check_token(self.user, attrs['token']):
            raise serializers.ValidationError({"token": "Password reset token is invalid or has expired."})

        return attrs

    def save(self):
        self.user.set_password(self.validated_data['new_password'])
        self.user.save()
        return self.user
