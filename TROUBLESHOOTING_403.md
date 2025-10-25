# 🐛 Troubleshooting - Error 403 y Video Player

## Problema Identificado

1. **Error 403 en API**: El frontend recibe error 403 (Forbidden) al intentar acceder a `/api/repositorios/`
2. **Video no carga**: VideoJS no puede cargar archivos multimedia

## Causas Principales

### 1. Usuario no autenticado
- El frontend intenta acceder a endpoints protegidos sin login previo
- Django devuelve 403 porque no hay sesión activa

### 2. CORS/Cookies no configurados correctamente
- El frontend no está enviando cookies de sesión
- El backend no está aceptando credenciales desde el origen del frontend

### 3. URLs hardcodeadas
- El código tiene URLs `http://localhost:8000` hardcodeadas en lugar de usar configuración centralizada

## Soluciones Implementadas

### ✅ 1. Actualizado `frontend/src/utils/axios.js`

```javascript
// Ahora usa variables de entorno
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
axios.defaults.baseURL = API_BASE_URL;
axios.defaults.withCredentials = true; // Envía cookies

// Helpers añadidos:
getMediaUrl(path)  // Para construir URLs de archivos multimedia
getApiUrl(endpoint) // Para construir URLs de API
```

### ✅ 2. Creado `frontend/.env.local`

```bash
VITE_API_URL=http://localhost:8000
```

### ✅ 3. Settings.py actualizado para variables de entorno

- CORS_ALLOWED_ORIGINS configurable
- CSRF_TRUSTED_ORIGINS configurable  
- Redis y PostgreSQL configurables

## Pasos para Solucionar el Error 403

### Opción A: Verificar que el usuario pueda hacer login

```bash
cd /Users/acarreola/Sites/archivoplus

# 1. Asegurar que Django esté corriendo
python manage.py runserver 127.0.0.1:8000

# 2. En otra terminal, verificar que exista un usuario admin
python manage.py shell
>>> from django.contrib.auth import get_user_model
>>> User = get_user_model()
>>> User.objects.filter(username='admin').exists()
True  # Si es False, crear usuario

# 3. Crear superusuario si no existe
python manage.py createsuperuser
# Username: admin
# Email: admin@admin.com
# Password: admin123
```

### Opción B: Probar login desde el navegador

1. Abrir http://localhost:5173/ (frontend Vite)
2. Ir a la página de login
3. Intentar login con admin / admin123
4. Verificar en DevTools > Network que la petición POST a `/api/auth/login/` retorne 200
5. Verificar que se establezca una cookie `sessionid`
6. Refrescar la página y verificar que ahora `/api/repositorios/` funcione

### Opción C: Verificar configuración de CORS

```python
# En settings.py, verificar:
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Frontend Vite
    "http://127.0.0.1:5173",
]

CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
```

## Solución para el Error de Video

El error `MEDIA_ERR_SRC_NOT_SUPPORTED` en VideoJS generalmente indica:

### 1. Archivo no accesible (403/404)
```javascript
// El problema está en URLs hardcodeadas como:
src={`http://localhost:8000/media/${playingComercial.ruta_proxy}`}

// Solución: Usar helper getMediaUrl()
import { getMediaUrl } from '../utils/axios';

src={getMediaUrl(playingComercial.ruta_proxy)}
```

### 2. Django no sirve archivos de media en desarrollo

```python
# En urls.py principal, agregar:
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # ... tus URLs
]

# Servir archivos media en desarrollo
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

### 3. Permisos de archivos en el servidor

```bash
# Verificar que los archivos de media existan y tengan permisos
ls -la media/originals/
ls -la media/transcoded/

# Ajustar permisos si es necesario
chmod -R 755 media/
```

## Verificación Final

### 1. Backend corriendo
```bash
curl http://localhost:8000/api/auth/me/
# Debe retornar 401 si no estás logueado, o datos del usuario si estás logueado
```

### 2. Frontend conectando
```bash
# En DevTools > Network:
# - Verificar que todas las peticiones vayan a http://localhost:8000
# - Verificar que tengas cookie 'sessionid' después del login
# - Verificar que las peticiones incluyan header 'Cookie: sessionid=...'
```

### 3. CORS funcionando
```bash
# Las respuestas deben incluir:
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Credentials: true
```

## Acciones Inmediatas

1. ✅ **Reiniciar el backend Django** para cargar la nueva configuración
2. ✅ **Hacer login en el frontend** antes de acceder a otras páginas
3. ⚠️ **Actualizar componentes** para usar `getMediaUrl()` en lugar de URLs hardcodeadas
4. ⚠️ **Verificar que existan archivos** de video en media/originals o media/transcoded

## Próximos Pasos

Para evitar este problema en el futuro, necesitamos:

1. Crear un script que refactorice todas las URLs hardcodeadas
2. Agregar validación de autenticación en el componente raíz
3. Mostrar mensaje de error claro cuando no hay sesión activa
4. Implementar refresh token o extender tiempo de sesión
