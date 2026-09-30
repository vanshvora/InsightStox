import random
import string
import uuid
import datetime

from django.conf import settings
from django.contrib.auth import authenticate
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ActiveSession, ActivityHistory, SecurityAlert, User
from .serializers import (
    ActiveSessionSerializer,
    ActivityHistorySerializer,
    GoogleAuthSerializer,
    LoginSerializer,
    OtpRequestSerializer,
    OtpVerifySerializer,
    PasswordChangeSerializer,
    PasswordResetSerializer,
    SecurityAlertSerializer,
    UserProfileSerializer,
    UserRegistrationSerializer,
)

import requests as http_requests

# In-memory OTP store (same pattern as Node.js registrationOtpStore)
_otp_store = {}


def set_auth_cookie(response, token):
    is_prod = not settings.DEBUG
    response.set_cookie(
        'auth_token',
        token,
        max_age=30 * 24 * 60 * 60,
        httponly=True,
        samesite='None' if is_prod else 'Lax',
        secure=is_prod,
    )
    return response

def delete_auth_cookie(response):
    is_prod = not settings.DEBUG
    response.set_cookie(
        'auth_token',
        '',
        max_age=0,
        expires='Thu, 01 Jan 1970 00:00:00 GMT',
        path='/',
        httponly=True,
        samesite='None' if is_prod else 'Lax',
        secure=is_prod,
    )
    return response


def _get_user_agent_info(request):
    """Extract browser and OS info from User-Agent header."""
    ua = request.META.get('HTTP_USER_AGENT', 'Unknown')
    # Simple parsing — can be enhanced with ua-parser library
    browser = 'Unknown'
    os_type = 'Unknown'

    ua_lower = ua.lower()
    if 'chrome' in ua_lower and 'edg' not in ua_lower:
        browser = 'Chrome'
    elif 'firefox' in ua_lower:
        browser = 'Firefox'
    elif 'safari' in ua_lower and 'chrome' not in ua_lower:
        browser = 'Safari'
    elif 'edg' in ua_lower:
        browser = 'Edge'
    else:
        browser = 'Unknown'

    if 'windows' in ua_lower:
        os_type = 'Windows'
    elif 'mac' in ua_lower:
        os_type = 'macOS'
    elif 'linux' in ua_lower:
        os_type = 'Linux'
    elif 'android' in ua_lower:
        os_type = 'Android'
    elif 'iphone' in ua_lower or 'ipad' in ua_lower:
        os_type = 'iOS'

    return browser, os_type


def _add_security_alert(user, alert_type, message, token, browser, os_type):
    """Create a security alert and trim to last 50."""
    SecurityAlert.objects.create(
        user=user,
        alert_type=alert_type,
        message=message,
        token=token,
        browser_type=browser,
        os_type=os_type,
    )
    # Keep only the latest 50 alerts
    alert_ids = SecurityAlert.objects.filter(user=user).order_by('-created_at').values_list('id', flat=True)[:50]
    SecurityAlert.objects.filter(user=user).exclude(id__in=list(alert_ids)).delete()


def _add_activity_history(user, activity_type, message, token, browser, os_type):
    """Create an activity log and trim to last 100."""
    ActivityHistory.objects.create(
        user=user,
        activity_type=activity_type,
        message=message,
        token=token,
        browser_type=browser,
        os_type=os_type,
    )
    # Keep only the latest 100 entries
    history_ids = ActivityHistory.objects.filter(user=user).order_by('-created_at').values_list('id', flat=True)[:100]
    ActivityHistory.objects.filter(user=user).exclude(id__in=list(history_ids)).delete()


def _check_session_limit(user, current_token=None):
    """Check if user has reached 5 active session limit. Returns (ok, response)."""
    # ActiveSession cleanup based on time can be done elsewhere if needed.
    
    active_count = ActiveSession.objects.filter(user=user).count()

    if current_token:
        # Check if current token is already active
        existing = ActiveSession.objects.filter(token=current_token).first()
        if existing:
            existing.save()  # Updates last_active_time via auto_now
            return False, Response(
                {'success': True, 'message': 'User is already logged in'},
                status=status.HTTP_200_OK
            )

    if active_count >= 5:
        # Instead of blocking the user, gracefully delete their oldest sessions 
        # to make room for the new one. Keep the 4 newest sessions.
        oldest_sessions = ActiveSession.objects.filter(user=user).order_by('last_active_time')
        sessions_to_delete = oldest_sessions.values_list('id', flat=True)[:active_count - 4]
        ActiveSession.objects.filter(id__in=list(sessions_to_delete)).delete()

    return True, None


def _generate_otp():
    """Generate a 6-digit OTP."""
    return ''.join(random.choices(string.digits, k=6))


def _send_otp_email(email, otp, name='User'):
    """Send OTP email via Brevo API."""
    try:
        url = 'https://api.brevo.com/v3/smtp/email'
        headers = {
            'accept': 'application/json',
            'api-key': settings.BREVO_API_KEY,
            'content-type': 'application/json',
        }
        data = {
            'sender': {'name': 'InsightStox', 'email': settings.SENDER_EMAIL},
            'to': [{'email': email, 'name': name}],
            'subject': 'InsightStox - OTP Verification',
            'htmlContent': f'''
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>InsightStox - OTP Verification</h2>
                    <p>Hello {name},</p>
                    <p>Your OTP for verification is:</p>
                    <h1 style="text-align: center; color: #4F46E5; letter-spacing: 8px;">{otp}</h1>
                    <p>This OTP will expire in 5 minutes.</p>
                    <p>If you did not request this, please ignore this email.</p>
                </div>
            ''',
        }
        response = http_requests.post(url, headers=headers, json=data, timeout=10)
        return response.status_code < 300
    except Exception as e:
        print(f'Error sending OTP email: {e}')
        return False


# ==================== AUTH VIEWS ====================


class RegisterOtpView(APIView):
    """Send OTP for registration."""
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').lower().strip()
        name = request.data.get('name', '')
        password = request.data.get('password', '')

        if not email or not name or not password:
            return Response(
                {'success': False, 'message': 'Name, email, and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if User.objects.filter(email=email).exists():
            return Response(
                {'success': False, 'message': 'User already exists'},
                status=status.HTTP_409_CONFLICT
            )

        otp = _generate_otp()
        _otp_store[email] = {
            'otp': otp,
            'name': name,
            'password': password,
            'expires': timezone.now().timestamp() + 300,  # 5 minutes
        }

        if not _send_otp_email(email, otp, name):
            return Response(
                {'success': False, 'message': 'Failed to send OTP email'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response({'success': True, 'message': 'OTP sent successfully'})


class RegisterView(APIView):
    """Verify OTP and register user."""
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').lower().strip()
        otp = request.data.get('otp', '')

        if not email or not otp:
            return Response(
                {'success': False, 'message': 'Email and OTP are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        stored = _otp_store.get(email)
        if not stored:
            return Response(
                {'success': False, 'message': 'OTP not found or expired'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if timezone.now().timestamp() > stored['expires']:
            _otp_store.pop(email, None)
            return Response(
                {'success': False, 'message': 'OTP expired'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if stored['otp'] != otp:
            return Response(
                {'success': False, 'message': 'Invalid OTP'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create user
        user = User.objects.create_user(
            email=email,
            name=stored['name'],
            password=stored['password'],
            registration_method='email',
        )
        _otp_store.pop(email, None)

        browser, os_type = _get_user_agent_info(request)
        import binascii, os
        token_key = binascii.hexlify(os.urandom(20)).decode()

        ActiveSession.objects.create(
            user=user,
            token=token_key,
            browser_type=browser,
            os_type=os_type,
        )

        _add_security_alert(user, 'Login', 'New device logged in via registration', token_key, browser, os_type)

        return set_auth_cookie(Response({
            'success': True,
            'message': 'User registered successfully',
            'token': token_key,
        }), token_key)


class LoginView(APIView):
    """Login with email and password."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email'].lower().strip()
        password = serializer.validated_data['password']

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {'success': False, 'message': 'User is not registered'},
                status=status.HTTP_410_GONE
            )

        if user.registration_method == 'google':
            return Response(
                {'success': False, 'message': 'Please login using Google'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.check_password(password):
            return Response(
                {'success': False, 'message': 'Invalid user credentials'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check session limits
        browser, os_type = _get_user_agent_info(request)
        current_token = request.META.get('HTTP_AUTHORIZATION', '').replace('Token ', '')

        ok, response = _check_session_limit(user, current_token)
        if not ok:
            return response

        # Create secure random token
        import binascii, os
        token_key = binascii.hexlify(os.urandom(20)).decode()

        # Create active session
        ActiveSession.objects.create(
            user=user,
            token=token_key,
            browser_type=browser,
            os_type=os_type,
        )

        # Add security alert
        _add_security_alert(user, 'Login', 'New device logged in', token_key, browser, os_type)

        return set_auth_cookie(Response({
            'success': True,
            'message': 'User logged in successfully',
            'token': token_key,
        }), token_key)


class GoogleLoginView(APIView):
    """Login with Google OAuth."""
    permission_classes = [AllowAny]

    def post(self, request):
        access_token = request.data.get('access_token')
        if not access_token:
            return Response(
                {'success': False, 'message': 'Access token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verify with Google
        try:
            google_res = http_requests.get(
                f'https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token={access_token}',
                timeout=10
            )
            payload = google_res.json()
        except Exception:
            return Response(
                {'success': False, 'message': 'Unable to get details from Google OAuth'},
                status=status.HTTP_504_GATEWAY_TIMEOUT
            )

        email = payload.get('email', '').lower()
        if not email:
            return Response(
                {'success': False, 'message': 'Unable to get email from Google'},
                status=status.HTTP_400_BAD_REQUEST
            )

        name = payload.get('name', 'User')
        picture = payload.get('picture', '')

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            user = User.objects.create_user(
                email=email,
                name=name,
                password=None,
                registration_method='google',
                profile_image=picture,
            )

        if user.registration_method != 'google':
            return Response(
                {'success': False, 'message': 'Please login using email and password'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        browser, os_type = _get_user_agent_info(request)
        current_token = request.META.get('HTTP_AUTHORIZATION', '').replace('Token ', '')

        ok, response = _check_session_limit(user, current_token)
        if not ok:
            return response

        import binascii, os
        token_key = binascii.hexlify(os.urandom(20)).decode()

        ActiveSession.objects.create(
            user=user,
            token=token_key,
            browser_type=browser,
            os_type=os_type,
        )

        _add_security_alert(user, 'Login', 'Google login', token_key, browser, os_type)

        return set_auth_cookie(Response({
            'success': True,
            'message': 'User logged in successfully',
            'token': token_key,
        }), token_key)


class GoogleRegisterView(APIView):
    """Register with Google OAuth."""
    permission_classes = [AllowAny]

    def post(self, request):
        access_token = request.data.get('access_token')
        if not access_token:
            return Response(
                {'success': False, 'message': 'Access token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            google_res = http_requests.get(
                f'https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token={access_token}',
                timeout=10
            )
            payload = google_res.json()
        except Exception:
            return Response(
                {'success': False, 'message': 'Unable to get details from Google OAuth'},
                status=status.HTTP_504_GATEWAY_TIMEOUT
            )

        email = payload.get('email', '').lower()
        name = payload.get('name', 'User')
        picture = payload.get('picture', '')

        if not email:
            return Response(
                {'success': False, 'message': 'Unable to get email from Google'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if User.objects.filter(email=email).exists():
            return Response(
                {'success': False, 'message': 'User already exists. Please login.'},
                status=status.HTTP_409_CONFLICT
            )

        user = User.objects.create_user(
            email=email,
            name=name,
            password=None,
            registration_method='google',
            profile_image=picture,
        )

        browser, os_type = _get_user_agent_info(request)
        import binascii, os
        token_key = binascii.hexlify(os.urandom(20)).decode()

        ActiveSession.objects.create(
            user=user,
            token=token_key,
            browser_type=browser,
            os_type=os_type,
        )

        _add_security_alert(user, 'Registration', 'Google registration', token_key, browser, os_type)

        return set_auth_cookie(Response({
            'success': True,
            'message': 'User registered successfully',
            'token': token_key,
        }), token_key)


class LogoutView(APIView):
    """Logout current session."""

    def post(self, request):
        token_key = request.auth.token if request.auth and hasattr(request.auth, 'token') else request.META.get('HTTP_AUTHORIZATION', '').replace('Token ', '')
        if not token_key and request.COOKIES.get('auth_token'):
            token_key = request.COOKIES.get('auth_token')
            
        if token_key:
            ActiveSession.objects.filter(token=token_key).delete()
            browser, os_type = _get_user_agent_info(request)
            if request.user and request.user.is_authenticated:
                _add_security_alert(request.user, 'Logout', 'Session logged out', token_key, browser, os_type)

        return delete_auth_cookie(Response({'success': True, 'message': 'Logged out successfully'}))


class LogoutSessionView(APIView):
    """Logout a specific session by ID."""

    def post(self, request):
        session_id = request.data.get('id', '')
        if not session_id:
            return Response(
                {'success': False, 'message': 'Session ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        session = ActiveSession.objects.filter(user=request.user, id=session_id).first()
        if not session:
            return Response(
                {'success': False, 'message': 'Session not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        session_token = session.token
        session.delete()

        browser, os_type = _get_user_agent_info(request)
        _add_security_alert(request.user, 'Logout', 'Specific session logged out', session_token, browser, os_type)

        current_token = request.auth.token if request.auth and hasattr(request.auth, 'token') else request.META.get('HTTP_AUTHORIZATION', '').replace('Token ', '')
        if not current_token:
            current_token = request.COOKIES.get('auth_token')

        resp_data = {'success': True, 'message': 'Session logged out successfully', 'is_current': False}
        
        if current_token == session_token:
            resp_data['is_current'] = True
            resp = Response(resp_data)
            return delete_auth_cookie(resp)
            
        return Response(resp_data)


class LogoutAllSessionsView(APIView):
    """Logout all sessions including current."""

    def post(self, request):
        sessions = ActiveSession.objects.filter(user=request.user)
        sessions.delete()

        browser, os_type = _get_user_agent_info(request)
        current_token = request.auth.token if request.auth and hasattr(request.auth, 'token') else request.META.get('HTTP_AUTHORIZATION', '').replace('Token ', '')
        _add_security_alert(request.user, 'Logout', 'All sessions logged out', current_token or '', browser, os_type)

        return delete_auth_cookie(Response({'success': True, 'message': 'All sessions logged out'}))


# ==================== PROFILE VIEWS ====================


class ProfileView(APIView):
    """Get user profile."""

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response({'success': True, 'data': serializer.data})


class UpdateProfileNameView(APIView):
    def patch(self, request):
        name = request.data.get('name', '').strip()
        if not name:
            return Response({'success': False, 'message': 'Name is required'}, status=status.HTTP_400_BAD_REQUEST)
        request.user.name = name
        request.user.save(update_fields=['name'])
        return Response({'success': True, 'message': 'Name updated successfully'})


class UpdateProfileImageView(APIView):
    def patch(self, request):
        image = request.FILES.get('profileImage')
        if not image:
            return Response({'success': False, 'message': 'Please provide a valid image'}, status=status.HTTP_400_BAD_REQUEST)

        # Upload to Cloudinary
        from utils.cloudinary_utils import upload_to_cloudinary, delete_from_cloudinary

        # Delete old profile image if it exists
        if request.user.profile_image:
            old_public_id = request.user.profile_image.split('/')[-1].split('.')[0]
            delete_from_cloudinary(old_public_id)

        result = upload_to_cloudinary(image)
        if not result:
            return Response({'success': False, 'message': 'Failed to upload image'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        request.user.profile_image = result['secure_url']
        request.user.save(update_fields=['profile_image'])
        return Response({'success': True, 'message': 'Profile image updated', 'data': {'profile_image': result['secure_url']}})


class UpdateInvestmentExpView(APIView):
    def patch(self, request):
        value = request.data.get('investmentExperience', '').strip()
        if not value:
            return Response({'success': False, 'message': 'Investment experience is required'}, status=status.HTTP_400_BAD_REQUEST)
        request.user.investment_experience = value
        request.user.save(update_fields=['investment_experience'])
        return Response({'success': True, 'message': 'Investment experience updated'})


class UpdateRiskProfileView(APIView):
    def patch(self, request):
        value = request.data.get('riskProfile', '').strip()
        if not value:
            return Response({'success': False, 'message': 'Risk profile is required'}, status=status.HTTP_400_BAD_REQUEST)
        request.user.risk_profile = value
        request.user.save(update_fields=['risk_profile'])
        return Response({'success': True, 'message': 'Risk profile updated'})


class UpdateFinancialGoalView(APIView):
    def patch(self, request):
        value = request.data.get('financialGoals', '').strip()
        if not value:
            return Response({'success': False, 'message': 'Financial goals is required'}, status=status.HTTP_400_BAD_REQUEST)
        request.user.financial_goals = value
        request.user.save(update_fields=['financial_goals'])
        return Response({'success': True, 'message': 'Financial goals updated'})


class UpdateInvestmentHorizonView(APIView):
    def patch(self, request):
        value = request.data.get('investmentHorizon', '').strip()
        if not value:
            return Response({'success': False, 'message': 'Investment horizon is required'}, status=status.HTTP_400_BAD_REQUEST)
        request.user.investment_horizon = value
        request.user.save(update_fields=['investment_horizon'])
        return Response({'success': True, 'message': 'Investment horizon updated'})


# ==================== PASSWORD VIEWS ====================


class ForgotPasswordOtpView(APIView):
    """Send OTP for forgot password flow."""
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').lower().strip()
        if not email:
            return Response({'success': False, 'message': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'success': False, 'message': 'User not found'}, status=status.HTTP_410_GONE)

        if user.registration_method == 'google':
            return Response({'success': False, 'message': 'Google users cannot reset password'}, status=status.HTTP_400_BAD_REQUEST)

        otp = _generate_otp()
        _otp_store[f'forgot_{email}'] = {
            'otp': otp,
            'expires': timezone.now().timestamp() + 300,
        }

        if not _send_otp_email(email, otp, user.name):
            return Response({'success': False, 'message': 'Failed to send OTP'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({'success': True, 'message': 'OTP sent successfully'})


class VerifyOtpView(APIView):
    """Verify OTP for forgot password."""
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').lower().strip()
        otp = request.data.get('otp', '')

        stored = _otp_store.get(f'forgot_{email}')
        if not stored:
            return Response({'success': False, 'message': 'OTP not found or expired'}, status=status.HTTP_400_BAD_REQUEST)

        if timezone.now().timestamp() > stored['expires']:
            _otp_store.pop(f'forgot_{email}', None)
            return Response({'success': False, 'message': 'OTP expired'}, status=status.HTTP_400_BAD_REQUEST)

        if stored['otp'] != otp:
            return Response({'success': False, 'message': 'Invalid OTP'}, status=status.HTTP_400_BAD_REQUEST)

        # Mark as verified
        _otp_store[f'forgot_{email}']['verified'] = True
        return Response({'success': True, 'message': 'OTP verified successfully'})


class SetNewPasswordView(APIView):
    """Set new password after forgot password OTP verification."""
    permission_classes = [AllowAny]

    def patch(self, request):
        email = request.data.get('email', '').lower().strip()
        password = request.data.get('password', '')

        if not email or not password:
            return Response({'success': False, 'message': 'Email and password are required'}, status=status.HTTP_400_BAD_REQUEST)

        stored = _otp_store.get(f'forgot_{email}')
        if not stored or not stored.get('verified'):
            return Response({'success': False, 'message': 'OTP not verified'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'success': False, 'message': 'User not found'}, status=status.HTTP_410_GONE)

        user.set_password(password)
        user.save()
        _otp_store.pop(f'forgot_{email}', None)

        return Response({'success': True, 'message': 'Password updated successfully'})


class ResetPasswordOtpView(APIView):
    """Send OTP for password reset (logged in user)."""

    def patch(self, request):
        otp = _generate_otp()
        _otp_store[f'reset_{request.user.email}'] = {
            'otp': otp,
            'expires': timezone.now().timestamp() + 300,
        }

        if not _send_otp_email(request.user.email, otp, request.user.name):
            return Response({'success': False, 'message': 'Failed to send OTP'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({'success': True, 'message': 'OTP sent successfully'})


class VerifyOtpProfileView(APIView):
    """Verify OTP for profile password reset."""

    def post(self, request):
        otp = request.data.get('otp', '')
        stored = _otp_store.get(f'reset_{request.user.email}')

        if not stored:
            return Response({'success': False, 'message': 'OTP not found or expired'}, status=status.HTTP_400_BAD_REQUEST)

        if timezone.now().timestamp() > stored['expires']:
            _otp_store.pop(f'reset_{request.user.email}', None)
            return Response({'success': False, 'message': 'OTP expired'}, status=status.HTTP_400_BAD_REQUEST)

        if stored['otp'] != otp:
            return Response({'success': False, 'message': 'Invalid OTP'}, status=status.HTTP_400_BAD_REQUEST)

        _otp_store[f'reset_{request.user.email}']['verified'] = True
        return Response({'success': True, 'message': 'OTP verified successfully'})


class SetPasswordProfileView(APIView):
    """Set new password for logged in user after OTP verification."""

    def patch(self, request):
        password = request.data.get('password', '')
        if not password:
            return Response({'success': False, 'message': 'Password is required'}, status=status.HTTP_400_BAD_REQUEST)

        stored = _otp_store.get(f'reset_{request.user.email}')
        if not stored or not stored.get('verified'):
            return Response({'success': False, 'message': 'OTP not verified'}, status=status.HTTP_400_BAD_REQUEST)

        request.user.set_password(password)
        request.user.save()
        _otp_store.pop(f'reset_{request.user.email}', None)

        return Response({'success': True, 'message': 'Password updated successfully'})


# ==================== PREFERENCES VIEWS ====================


class DataPrivacyView(APIView):
    def get(self, request):
        from portfolio.models import StockSummary
        stock_count = StockSummary.objects.filter(user=request.user, current_holding__gt=0).count()
        session_count = ActiveSession.objects.filter(user=request.user).count()
        return Response({
            'success': True,
            'data': {
                'stocks_held': stock_count,
                'active_sessions': session_count,
            }
        })


class ToggleAiSuggestionView(APIView):
    def patch(self, request):
        request.user.is_ai_suggestion_on = not request.user.is_ai_suggestion_on
        request.user.save(update_fields=['is_ai_suggestion_on'])
        return Response({'success': True, 'message': 'AI suggestion toggled'})


class PreferencesView(APIView):
    def get(self, request):
        return Response({
            'success': True,
            'data': {
                'theme': request.user.theme,
                'dashboard_layout': request.user.dashboard_layout,
                'is_ai_suggestion_on': request.user.is_ai_suggestion_on,
            }
        })


class UpdateThemeView(APIView):
    def patch(self, request):
        theme = request.data.get('theme', '').strip()
        if not theme:
            return Response({'success': False, 'message': 'Theme is required'}, status=status.HTTP_400_BAD_REQUEST)
        request.user.theme = theme
        request.user.save(update_fields=['theme'])
        return Response({'success': True, 'message': 'Theme updated'})


class UpdateDashLayoutView(APIView):
    def patch(self, request):
        layout = request.data.get('dashboardLayout', '').strip()
        if not layout:
            return Response({'success': False, 'message': 'Layout is required'}, status=status.HTTP_400_BAD_REQUEST)
        request.user.dashboard_layout = layout
        request.user.save(update_fields=['dashboard_layout'])
        return Response({'success': True, 'message': 'Dashboard layout updated'})


# ==================== ACCOUNT VIEWS ====================


class DeleteAccountView(APIView):
    def delete(self, request):
        # Cascade deletes sessions, alerts, history, stock data
        request.user.delete()
        return Response({'success': True, 'message': 'Account deleted successfully'})


class CheckTokenView(APIView):
    """Check if token is valid — used by frontend on page load."""
    permission_classes = [AllowAny]

    def get(self, request):
        if request.user and request.user.is_authenticated:
            token_key = request.auth.token if hasattr(request.auth, 'token') else None
            if token_key:
                session = ActiveSession.objects.filter(token=token_key).first()
                if session:
                    session.save()  # Update last_active_time
                    return Response({
                        'success': True,
                        'message': 'Token is valid',
                        'data': UserProfileSerializer(request.user).data,
                    })
        return Response({'success': False, 'message': 'Invalid token'}, status=status.HTTP_401_UNAUTHORIZED)


# ==================== ACTIVITY & SESSION VIEWS ====================


class ActivitySessionView(APIView):
    """Get recent activity + active sessions."""

    def get(self, request):
        recent_alerts = SecurityAlert.objects.filter(user=request.user)[:3]
        recent_activity = ActivityHistory.objects.filter(user=request.user)[:4]
        sessions = ActiveSession.objects.filter(user=request.user)

        return Response({
            'success': True,
            'data': {
                'recentAlerts': SecurityAlertSerializer(recent_alerts, many=True).data,
                'recentActivity': ActivityHistorySerializer(recent_activity, many=True).data,
                'activeSessions': ActiveSessionSerializer(sessions, many=True).data,
            }
        })


class AllActivityHistoryView(APIView):
    def get(self, request):
        history = ActivityHistory.objects.filter(user=request.user)
        return Response({
            'success': True,
            'data': ActivityHistorySerializer(history, many=True).data,
        })


class AllSecurityAlertsView(APIView):
    def get(self, request):
        alerts = SecurityAlert.objects.filter(user=request.user)
        return Response({
            'success': True,
            'data': SecurityAlertSerializer(alerts, many=True).data,
        })


class ActivityByTokenView(APIView):
    def get(self, request):
        token = request.query_params.get('token', '')
        if not token:
            return Response({'success': False, 'message': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)

        alerts = SecurityAlert.objects.filter(user=request.user, token=token)
        activity = ActivityHistory.objects.filter(user=request.user, token=token)

        return Response({
            'success': True,
            'data': {
                'securityAlerts': SecurityAlertSerializer(alerts, many=True).data,
                'activityHistory': ActivityHistorySerializer(activity, many=True).data,
            }
        })


class ClearActivityHistoryView(APIView):
    def delete(self, request):
        ActivityHistory.objects.filter(user=request.user).delete()
        return Response({'success': True, 'message': 'Activity history cleared'})


class DownloadActivityReportView(APIView):
    """Generate and return activity history as PDF."""

    def get(self, request):
        from io import BytesIO
        from django.http import FileResponse
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib import colors

        history = ActivityHistory.objects.filter(user=request.user)

        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        styles = getSampleStyleSheet()

        elements = []
        elements.append(Paragraph('InsightStox - Activity History Report', styles['Title']))
        elements.append(Paragraph(f'User: {request.user.email}', styles['Normal']))
        elements.append(Paragraph(f'Generated: {timezone.now().strftime("%Y-%m-%d %H:%M")}', styles['Normal']))

        data = [['Type', 'Message', 'Browser', 'OS', 'Date']]
        for item in history:
            data.append([
                item.activity_type,
                item.message[:30],
                item.browser_type,
                item.os_type,
                item.created_at.strftime('%Y-%m-%d %H:%M'),
            ])

        if len(data) > 1:
            table = Table(data)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
            ]))
            elements.append(table)
        else:
            elements.append(Paragraph('No activity history found.', styles['Normal']))

        doc.build(elements)
        buffer.seek(0)

        return FileResponse(buffer, as_attachment=True, filename='activity_report.pdf')


class DownloadPortfolioDataView(APIView):
    """Generate and return portfolio data as Excel."""

    def get(self, request):
        from io import BytesIO
        from django.http import FileResponse
        from openpyxl import Workbook
        from portfolio.models import StockSummary

        summaries = StockSummary.objects.filter(
            user=request.user
        ).select_related('stock')

        wb = Workbook()
        ws = wb.active
        ws.title = 'Portfolio'

        headers = ['Stock', 'Symbol', 'Holding', 'Spent Amount', 'Avg Price', 'Realized Gain']
        ws.append(headers)

        for s in summaries:
            ws.append([
                s.stock.short_name or s.stock.symbol,
                s.stock.symbol,
                float(s.current_holding),
                float(s.spent_amount),
                float(s.avg_price),
                float(s.realized_gain),
            ])

        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)

        return FileResponse(buffer, as_attachment=True, filename='portfolio_data.xlsx')
