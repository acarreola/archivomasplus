from rest_framework.authentication import SessionAuthentication

class CsrfExemptSessionAuthentication(SessionAuthentication):
    """
    SessionAuthentication sin verificación de CSRF.
    Se usa para permitir autenticación desde el frontend con CORS.
    """
    def enforce_csrf(self, request):
        return  # No verificar CSRF
