from rest_framework import status, views, permissions, generics
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from .serializers import (
    CustomTokenObtainPairSerializer,
    UserSerializer,
    UserRegistrationSerializer,
    ChangePasswordSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
)


class LoginView(TokenObtainPairView):
    """
    Authenticates a user via email and password, issuing JWT access and refresh tokens.
    """
    serializer_class = CustomTokenObtainPairSerializer


class RegisterView(generics.CreateAPIView):
    """
    Public registration endpoint for Employee and Customer accounts.
    Admin accounts are strictly forbidden from public registration.
    """
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Generate JWT tokens for immediate access
        refresh = RefreshToken.for_user(user)
        refresh['role'] = user.role
        refresh['email'] = user.email
        refresh['fullName'] = user.get_full_name()

        user_data = UserSerializer(user).data

        return Response(
            {
                'message': 'Registration successful.',
                'user': user_data,
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            },
            status=status.HTTP_201_CREATED
        )


class LogoutView(views.APIView):
    """
    Blacklists the provided refresh token, invalidating the session.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if not refresh_token:
                return Response(
                    {'error': 'Refresh token is required.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(
                {'message': 'Successfully logged out.'},
                status=status.HTTP_200_OK
            )
        except TokenError:
            return Response(
                {'error': 'Invalid or expired token.'},
                status=status.HTTP_400_BAD_REQUEST
            )


class CurrentUserView(views.APIView):
    """
    Returns the currently authenticated user's profile and role metadata.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class ChangePasswordView(views.APIView):
    """
    Allows authenticated users to change their password by validating their old password.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            if not user.check_password(serializer.validated_data['old_password']):
                return Response(
                    {'error': 'Current password is incorrect.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            return Response(
                {'message': 'Password changed successfully.'},
                status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetRequestView(views.APIView):
    """
    Accepts an email address and sends a password reset link with a secure token.
    Returns a generic message to prevent email enumeration.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {'message': 'If an active account with this email exists, a password reset link has been dispatched.'},
            status=status.HTTP_200_OK
        )


class PasswordResetConfirmView(views.APIView):
    """
    Accepts uid, token, new_password, and confirm_password to set a new password.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {'message': 'Password has been reset successfully. You may now log in.'},
            status=status.HTTP_200_OK
        )
