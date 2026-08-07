from rest_framework import serializers
from .models import User, ActiveSession, SecurityAlert, ActivityHistory


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ['name', 'email', 'password']

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'name', 'email', 'registration_method',
            'investment_experience', 'risk_profile', 'financial_goals',
            'investment_horizon', 'profile_image', 'theme',
            'dashboard_layout', 'is_ai_suggestion_on',
        ]
        read_only_fields = ['id', 'email', 'registration_method']


class ActiveSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActiveSession
        fields = ['id', 'browser_type', 'os_type', 'login_time', 'last_active_time']


class SecurityAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = SecurityAlert
        fields = ['id', 'os_type', 'browser_type', 'alert_type', 'message', 'token', 'created_at']


class ActivityHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityHistory
        fields = ['id', 'os_type', 'browser_type', 'activity_type', 'message', 'token', 'created_at']


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()


class GoogleAuthSerializer(serializers.Serializer):
    access_token = serializers.CharField()


class OtpRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()
    name = serializers.CharField(required=False)
    password = serializers.CharField(required=False)


class OtpVerifySerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6)


class PasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=6)


class PasswordChangeSerializer(serializers.Serializer):
    password = serializers.CharField(min_length=6)
