# Seguridad del Sistema de Login - Archivo+ v3.1

## 📋 Resumen

El sistema de autenticación de Archivo+ implementa múltiples capas de seguridad para proteger las credenciales de usuarios y prevenir accesos no autorizados.

## 🔐 Almacenamiento de Contraseñas

### Hash Algorithm: PBKDF2-SHA256

Django utiliza **PBKDF2** (Password-Based Key Derivation Function 2) con SHA256 por defecto:

```python
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',  # Default
    'django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher',
    'django.contrib.auth.hashers.Argon2PasswordHasher',  # Más seguro (opcional)
    'django.contrib.auth.hashers.BCryptSHA256PasswordHasher',
    'django.contrib.auth.hashers.ScryptPasswordHasher',
]
```

#### Características:
- **260,000 iteraciones** (Django 5.2 default)
- **Salt único** generado automáticamente por usuario
- **Formato en DB**: `pbkdf2_sha256$260000$<salt>$<hash>`
- **Tiempo de hash**: ~100-300ms (intencional para prevenir brute force)

### Verificación de Seguridad

Para verificar que un usuario tiene contraseña válida:

```bash
docker exec archivoplus_backend python manage.py shell -c "
from core.models import CustomUser
user = CustomUser.objects.get(email='admin@archivoplus.local')
print(f'Usuario: {user.email}')
print(f'Tiene password válido: {user.has_usable_password()}')
print(f'Hash format: {user.password[:20]}...')
"
```

### Upgrade a Argon2 (Recomendado para producción)

Argon2 es el ganador de la Password Hashing Competition (2015):

```bash
# Instalar dependencia
pip install argon2-cffi

# Ya está configurado en PASSWORD_HASHERS
# Las contraseñas se actualizan automáticamente al hacer login
```

## 🛡️ Protecciones Implementadas

### 1. Rate Limiting (Anti Brute Force)

```python
# core/views.py - login_view()
cache_key = f'login_attempts_{ip_address}'
attempts = cache.get(cache_key, 0)

if attempts >= 5:
    return Response({
        'message': 'Demasiados intentos fallidos. Intenta de nuevo en 15 minutos.'
    }, status=429)
```

**Características**:
- Máximo **5 intentos fallidos** por IP
- **Bloqueo de 15 minutos** después de 5 intentos
- Usa **Redis** para almacenar contadores
- Se resetea automáticamente tras login exitoso

### 2. Sesiones Seguras

```python
# settings.py
SESSION_COOKIE_HTTPONLY = True  # No accesible desde JavaScript
SESSION_COOKIE_SAMESITE = 'Lax'  # Previene CSRF
SESSION_COOKIE_SECURE = True  # Solo HTTPS en producción
SESSION_COOKIE_AGE = 30 * 24 * 60 * 60  # 30 días por defecto
```

**Recordar Sesión**:
- Si `remember_me=true`: sesión dura 30 días
- Si `remember_me=false`: sesión expira al cerrar navegador

```python
# core/views.py - login_view()
if remember_me:
    request.session.set_expiry(30 * 24 * 60 * 60)  # 30 días
else:
    request.session.set_expiry(0)  # Expira al cerrar navegador
```

### 3. Validación de Contraseñas

Django valida que las contraseñas cumplan con:

```python
AUTH_PASSWORD_VALIDATORS = [
    'UserAttributeSimilarityValidator',  # No similar a email/nombre
    'MinimumLengthValidator',  # Mínimo 8 caracteres
    'CommonPasswordValidator',  # No en lista de 20,000 comunes
    'NumericPasswordValidator',  # No solo números
]
```

### 4. CORS y CSRF

```python
# settings.py
CORS_ALLOW_CREDENTIALS = True  # Permite cookies
CORS_ALLOWED_ORIGINS = ['http://localhost:5173']
CSRF_TRUSTED_ORIGINS = ['http://localhost:5173']

# Middleware deshabilitado para API, usa CsrfExemptSessionAuthentication
```

### 5. Logging de Seguridad

```python
# core/views.py
logger.info(f'Login exitoso: {user.email} desde IP {ip_address}')
logger.warning(f'Intento de login fallido: {email} desde IP {ip_address}')
```

**Logs guardados en**:
- Docker: stdout (visible con `docker logs archivoplus_backend`)
- Nativo: `/var/log/archivoplus/backend.log`

## 🔄 Recuperación de Contraseña

### Flujo Seguro

1. Usuario ingresa email en `/forgot-password`
2. Backend genera token único usando `default_token_generator`
3. Token se codifica con `urlsafe_base64_encode`
4. Email enviado con link: `{FRONTEND_URL}/reset-password/{uid}/{token}/`
5. Token es válido por **1 día** (default Django)
6. Cada token solo puede usarse **una vez**

```python
# core/views.py - forgot_password()
from django.contrib.auth.tokens import default_token_generator
token = default_token_generator.make_token(user)
uid = urlsafe_base64_encode(force_bytes(user.pk))

# El token incluye:
# - User ID
# - Timestamp
# - Hash del password actual (invalida si cambia password)
```

### Configuración de Email

**IMPORTANTE**: Ahora puedes configurar el SMTP directamente desde el **Panel de Administración**:

1. Inicia sesión como administrador
2. Ve a **Admin → SMTP Config**
3. Configura los datos de tu cuenta de email

**Opción Manual (.env)**:
```bash
# .env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=tu-email@gmail.com
EMAIL_HOST_PASSWORD=tu-app-password  # Generar en Google Account
DEFAULT_FROM_EMAIL=noreply@archivoplus.local
FRONTEND_URL=http://localhost:5173
```

**Generar App Password en Gmail**:
1. https://myaccount.google.com/security
2. 2-Step Verification → App Passwords
3. Genera password para "Mail" / "Other (Archivo+)"
4. Copia el password de 16 caracteres

### Modo Desarrollo (Console)

Por defecto, los emails se imprimen en consola:

```python
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
```

Ver emails en logs:
```bash
docker logs archivoplus_backend | grep "Reset password token"
```

## 🔍 Auditoría y Monitoreo

### Comandos Útiles

**Ver usuarios activos**:
```bash
docker exec archivoplus_backend python manage.py shell -c "
from core.models import CustomUser
for user in CustomUser.objects.filter(is_active=True):
    print(f'{user.email} - Superuser: {user.is_superuser}')
"
```

**Ver intentos de login fallidos (últimos 15 min)**:
```bash
docker logs archivoplus_backend --since 15m | grep "Intento de login fallido"
```

**Verificar IPs bloqueadas**:
```bash
docker exec archivoplus_backend python manage.py shell -c "
from django.core.cache import cache
# Nota: Redis keys expiran en 15 min, difícil de listar todas
print('Rate limiting usa cache con expiry de 900 segundos')
"
```

**Resetear intentos de una IP**:
```bash
docker exec archivoplus_backend python manage.py shell -c "
from django.core.cache import cache
ip = '192.168.1.100'
cache.delete(f'login_attempts_{ip}')
print(f'Intentos reseteados para {ip}')
"
```

## 🚨 Incidentes de Seguridad

### Resetear contraseña de usuario comprometido

```bash
docker exec -it archivoplus_backend python manage.py shell
```

```python
from core.models import CustomUser
user = CustomUser.objects.get(email='usuario@ejemplo.com')
user.set_password('nueva-contraseña-temporal')
user.save()
print(f'Contraseña actualizada para {user.email}')
```

### Deshabilitar cuenta

```python
user.is_active = False
user.save()
```

### Ver última actividad

```bash
docker logs archivoplus_backend | grep "usuario@ejemplo.com"
```

## 📊 Mejores Prácticas

### ✅ Implementadas

- ✅ Hash con PBKDF2-SHA256 (260,000 iteraciones)
- ✅ Salt único por usuario
- ✅ Rate limiting (5 intentos / 15 min)
- ✅ Sesiones HTTP-only cookies
- ✅ SameSite=Lax (protección CSRF)
- ✅ Logging de intentos fallidos
- ✅ Tokens únicos para reset de password
- ✅ Validación de complejidad de contraseñas

### 🔄 Recomendaciones Adicionales

#### Producción Inmediata:
1. **HTTPS obligatorio**: `SESSION_COOKIE_SECURE = True`
2. **Argon2 hashing**: `pip install argon2-cffi`
3. **Email real**: Configurar SMTP con Gmail/SendGrid
4. **Variables de entorno**: Nunca passwords en código

#### Mejoras Futuras:
- 2FA (Two-Factor Authentication) con TOTP
- OAuth2 con Google/Microsoft
- Detección de login desde ubicaciones inusuales
- Notificaciones de login desde nuevo dispositivo
- Expiración forzada de sesiones (logout masivo)
- IP whitelist para admin
- Honeypot fields en formulario de login

## 🧪 Testing de Seguridad

### Test Rate Limiting

```bash
# Intentar login 6 veces con password incorrecta
for i in {1..6}; do
  curl -X POST http://localhost:8000/api/auth/login/ \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' \
    -w "\nStatus: %{http_code}\n"
  sleep 1
done

# El 6to intento debe devolver 429 Too Many Requests
```

### Test Forgot Password

```bash
curl -X POST http://localhost:8000/api/auth/forgot-password/ \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@archivoplus.local"}' \
  | jq
```

### Test Reset Password

```bash
# Obtener uid y token de los logs
curl -X POST http://localhost:8000/api/auth/reset-password/ \
  -H "Content-Type: application/json" \
  -d '{
    "uid":"MQ",
    "token":"c7u2wm-abc123...",
    "password":"NuevaPassword123!"
  }' | jq
```

## 📝 Checklist de Seguridad

Antes de producción:

- [ ] `DEBUG = False` en `.env`
- [ ] `SECRET_KEY` única y segura (generar con `python -c "import secrets; print(secrets.token_urlsafe(50))"`)
- [ ] `ALLOWED_HOSTS` con dominio real
- [ ] `SESSION_COOKIE_SECURE = True`
- [ ] `CSRF_COOKIE_SECURE = True`
- [ ] Email SMTP configurado (no console backend)
- [ ] `FRONTEND_URL` con dominio real
- [ ] HTTPS configurado en Nginx
- [ ] Firewall configurado (solo puertos 80, 443)
- [ ] PostgreSQL password fuerte
- [ ] Redis password configurado
- [ ] Logs externos (Sentry, CloudWatch)
- [ ] Backups automatizados de DB
- [ ] SSL/TLS certificado válido

---

**Última actualización**: 2025-01-XX  
**Versión**: Archivo+ v3.1  
**Contacto de seguridad**: admin@archivoplus.local
