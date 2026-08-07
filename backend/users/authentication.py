from rest_framework.authentication import TokenAuthentication
from rest_framework import exceptions
from django.utils.translation import gettext_lazy as _
from .models import ActiveSession

class CookieTokenAuthentication(TokenAuthentication):
    """
    Custom authentication class that reads the Token from an 'auth_token' cookie
    if it is not provided in the Authorization header.
    It authenticates against ActiveSession to support multiple active sessions per user.
    """
    def authenticate_credentials(self, key):
        try:
            session = ActiveSession.objects.select_related('user').get(token=key)
        except ActiveSession.DoesNotExist:
            raise exceptions.AuthenticationFailed(_('Invalid token.'))

        if not session.user.is_active:
            raise exceptions.AuthenticationFailed(_('User inactive or deleted.'))

        return (session.user, session)

    def authenticate(self, request):
        # 1. Try to authenticate from the standard Authorization header first
        auth_result = super().authenticate(request)
        if auth_result is not None:
            return auth_result

        # 2. If no header, check the 'auth_token' cookie
        token = request.COOKIES.get('auth_token')
        if not token:
            return None
            
        return self.authenticate_credentials(token)
