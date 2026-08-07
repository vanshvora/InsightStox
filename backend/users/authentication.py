from rest_framework.authentication import TokenAuthentication

class CookieTokenAuthentication(TokenAuthentication):
    """
    Custom authentication class that reads the DRF Token from an 'auth_token' cookie
    if it is not provided in the Authorization header.
    """
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
