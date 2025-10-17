# archivo+ v3

Sistema de gestión de archivos multimedia con transcodificación automática de video.

## Características

- 📹 **Upload y transcodificación automática** de videos a H.264 y H.265
- 🗂️ **Gestión de repositorios y módulos** (Broadcast, Reel, Storage, Audio, Images)
- 👥 **Sistema de perfiles y permisos** granulares
- 🔗 **Links compartidos** con contraseña y expiración
- 🎨 **Interfaz moderna** con React + Tailwind CSS
- 🚀 **Procesamiento asíncrono** con Celery
- 🐳 **Dockerizado** para fácil deployment

## Stack Tecnológico

### Backend
- Django 5.2.7 + Django REST Framework
- PostgreSQL 15
- Celery + Redis
- FFmpeg para transcodificación

### Frontend
- React 18
- Vite
- Tailwind CSS
- Axios

## Instalación

### Requisitos
- Docker
- Docker Compose

### Pasos

1. Clonar el repositorio:
```bash
git clone <repo-url>
cd archivoplus
```

2. Levantar los servicios:
```bash
docker-compose up -d
```

3. Crear superusuario:
```bash
docker-compose exec backend python manage.py shell -c "
from core.models import CustomUser
from django.contrib.auth.hashers import make_password

user, created = CustomUser.objects.get_or_create(
    username='admin',
    defaults={
        'is_superuser': True,
        'is_staff': True,
        'nombre_completo': 'Administrador',
        'password': make_password('admin123')
    }
)
if not created:
    user.set_password('admin123')
    user.is_superuser = True
    user.is_staff = True
    user.save()
print(f'Username: admin')
print(f'Password: admin123')
"
```

4. Acceder a la aplicación:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- Login: admin / admin123

## Estructura del Proyecto

```
archivoplus/
├── archivoplus_backend/    # Configuración Django
├── core/                    # App principal
│   ├── models.py           # Modelos (Broadcast, Repositorio, etc)
│   ├── views.py            # ViewSets y APIs
│   ├── serializers.py      # Serializadores DRF
│   ├── tasks.py            # Tareas Celery
│   └── migrations/         # Migraciones de DB
├── frontend/               # Aplicación React
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   ├── context/       # Context providers
│   │   └── utils/         # Utilidades
│   └── package.json
├── media/                  # Archivos subidos
│   ├── originals/         # Videos originales
│   └── transcoded/        # Videos transcodificados
├── docker-compose.yml
└── Dockerfile
```

## Modelos Principales

### Broadcast
Representa un archivo de video con:
- Archivo original
- Versiones transcodificadas (H.264, H.265, Proxy)
- Thumbnails
- Metadata (pizarra con cliente, agencia, producto, etc)
- Estado de transcodificación

### Repositorio
Contenedor de archivos con:
- Módulos (tipos de archivos permitidos)
- Permisos por usuario
- Sistema de directorios

### CustomUser
Usuarios con:
- Perfil (permisos granulares)
- Repositorios asignados
- Información de contacto

## API Endpoints

### Autenticación
- `POST /api/auth/login/` - Login
- `POST /api/auth/logout/` - Logout
- `GET /api/auth/me/` - Usuario actual

### Broadcasts
- `GET /api/broadcasts/` - Listar broadcasts
- `POST /api/broadcasts/` - Subir nuevo broadcast
- `GET /api/broadcasts/{id}/` - Detalle
- `DELETE /api/broadcasts/{id}/` - Eliminar
- `POST /api/broadcasts/cancel_all_processing/` - Cancelar procesos atascados

### Repositorios
- `GET /api/repositorios/` - Listar repositorios
- `POST /api/repositorios/` - Crear repositorio

### Directorios
- `GET /api/directorios/` - Listar directorios
- `POST /api/directorios/` - Crear directorio

## Transcodificación

El sistema usa FFmpeg con:
- **H.264**: libx264 (software) o h264_videotoolbox (macOS)
- **H.265**: libx265 (software) o hevc_videotoolbox (macOS)
- **Proxy**: 480p para preview rápido

Los archivos transcodificados se generan automáticamente al subir un video.

## Desarrollo

### Backend
```bash
docker-compose exec backend python manage.py shell
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Notas Importantes

- El sistema detecta automáticamente si hay encoders de hardware disponibles
- Los videos se procesan de forma asíncrona con Celery
- Los archivos originales se mantienen siempre
- El sistema usa sesiones de Django para autenticación

## Licencia

Propietario - Todos los derechos reservados

## Autor

Desarrollado para archivo+
Fecha: Octubre 2025
