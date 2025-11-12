import os
import logging
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from .models import Repositorio, Agencia, Broadcast, Audio, CustomUser, SharedLink, Directorio, RepositorioPermiso, Modulo, Perfil, SistemaInformacion, ImageAsset, StorageAsset, ProcessingError, EncodingPreset
from .serializers import (
    RepositorioSerializer, AgenciaSerializer, BroadcastSerializer, AudioSerializer,
    UserSerializer, SharedLinkSerializer, SharedLinkPublicSerializer, DirectorioSerializer,
    RepositorioPermisoSerializer, ModuloSerializer, PerfilSerializer, SistemaInformacionSerializer, ImageAssetSerializer, StorageAssetSerializer, ProcessingErrorSerializer, EncodingPresetSerializer
)
from .tasks import transcode_video, process_audio, process_image
from django.http import StreamingHttpResponse, HttpResponse, FileResponse
from pathlib import Path
import mimetypes

logger = logging.getLogger(__name__)
@api_view(['GET'])
@permission_classes([IsAdminUser])
def ffmpeg_health(request):
    """Verifica disponibilidad de ffmpeg/ffprobe y permisos de escritura en MEDIA_ROOT."""
    import shutil, os
    from django.conf import settings
    ffmpeg_path = shutil.which('ffmpeg')
    ffprobe_path = shutil.which('ffprobe')
    media_root = settings.MEDIA_ROOT
    exists = os.path.exists(media_root)
    writable = os.access(media_root, os.W_OK) if exists else False
    subdirs = ['support','thumbnails','pizarra']
    created = []
    for d in subdirs:
        p = os.path.join(media_root, d)
        try:
            os.makedirs(p, exist_ok=True)
            created.append({'dir': d, 'exists': True, 'writable': os.access(p, os.W_OK)})
        except Exception as e:
            created.append({'dir': d, 'error': str(e)})
    return Response({
        'ffmpeg': ffmpeg_path or 'NOT_FOUND',
        'ffprobe': ffprobe_path or 'NOT_FOUND',
        'media_root': str(media_root),
        'media_root_exists': exists,
        'media_root_writable': writable,
        'subdirs': created
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def stream_broadcast_media(request, pk):
    """Entrega el proxy MP4 (o H.264) con soporte de Range (206) para permitir seek.

    URL: /api/broadcasts/<uuid>/stream/
    """
    broadcast = get_object_or_404(Broadcast, pk=pk)
    rel_path = broadcast.ruta_proxy or broadcast.ruta_h264 or ''
    if not rel_path:
        return Response({'error': 'No hay proxy disponible'}, status=404)

    file_path = Path(settings.MEDIA_ROOT) / rel_path
    if not file_path.exists():
        return Response({'error': 'Archivo no encontrado'}, status=404)

    file_size = file_path.stat().st_size
    content_type, _ = mimetypes.guess_type(str(file_path))
    content_type = content_type or 'video/mp4'

    range_header = request.headers.get('Range') or request.META.get('HTTP_RANGE')
    if range_header:
        try:
            units, ranges = range_header.strip().split('=')
            if units != 'bytes':
                raise ValueError('Invalid units')
            start_str, end_str = ranges.split('-')
            start = int(start_str) if start_str else 0
            end = int(end_str) if end_str else file_size - 1
            end = min(end, file_size - 1)
            if start > end or start < 0:
                raise ValueError('Invalid range')
        except Exception:
            # Responder con 416 rango no satisfacible
            resp = HttpResponse(status=416)
            resp['Content-Range'] = f'bytes */{file_size}'
            return resp

        chunk_size = 8192 * 16
        def range_stream(path, start_pos, end_pos):
            with open(path, 'rb') as f:
                f.seek(start_pos)
                remaining = end_pos - start_pos + 1
                while remaining > 0:
                    read_len = min(chunk_size, remaining)
                    data = f.read(read_len)
                    if not data:
                        break
                    remaining -= len(data)
                    yield data

        resp = StreamingHttpResponse(range_stream(str(file_path), start, end), status=206, content_type=content_type)
        resp['Content-Length'] = str(end - start + 1)
        resp['Content-Range'] = f'bytes {start}-{end}/{file_size}'
        resp['Accept-Ranges'] = 'bytes'
        resp['Cache-Control'] = 'no-store'
        return resp

    # Sin Range → respuesta completa (200) con Accept-Ranges para permitir solicitudes parciales posteriores
    resp = FileResponse(open(file_path, 'rb'), content_type=content_type)
    resp['Content-Length'] = str(file_size)
    resp['Accept-Ranges'] = 'bytes'
    resp['Cache-Control'] = 'no-store'
    return resp
@api_view(['POST', 'OPTIONS'])
@permission_classes([IsAdminUser])
def purge_all(request):
    """
    Endpoint administrativo para borrar TODO el contenido del sistema:
    Broadcast/Reel, Audio, ImageAsset, StorageAsset y todos los Directorios.
    También vacía las carpetas principales de media.
    """
    import os
    import shutil
    from pathlib import Path
    from django.conf import settings

    deleted_files = 0
    errors = []

    # Contar antes de borrar
    broadcast_count = Broadcast.objects.count()
    audio_count = Audio.objects.count()
    image_count = ImageAsset.objects.count()
    storage_count = StorageAsset.objects.count()
    directorio_count = Directorio.objects.count()

    # Borrar contenido y luego directorios
    Broadcast.objects.all().delete()
    Audio.objects.all().delete()
    ImageAsset.objects.all().delete()
    StorageAsset.objects.all().delete()
    Directorio.objects.all().delete()

    # Vaciar carpetas de media
    media_root = Path(settings.MEDIA_ROOT)
    subdirs = ['sources', 'thumbnails', 'pizarra', 'support', 'encoded', 'encoded_audio']

    for subdir in subdirs:
        subdir_path = media_root / subdir
        if subdir_path.exists():
            try:
                files_in_dir = list(subdir_path.rglob('*'))
                file_count = sum(1 for f in files_in_dir if f.is_file())
                for item in subdir_path.iterdir():
                    try:
                        if item.is_file() or item.is_symlink():
                            item.unlink()
                            deleted_files += 1
                        elif item.is_dir():
                            if not item.name.startswith('.'):
                                shutil.rmtree(item)
                                deleted_files += file_count
                    except Exception as e:
                        errors.append(f"Error deleting {item}: {str(e)}")
            except Exception as e:
                errors.append(f"Error cleaning directory {subdir}: {str(e)}")

    result = {
        'message': 'Se eliminó TODO el contenido y se vaciaron las carpetas de media.',
        'details': {
            'broadcasts': broadcast_count,
            'audios': audio_count,
            'images': image_count,
            'storage_files': storage_count,
            'directorios': directorio_count,
            'archivos_aproximados': deleted_files,
            'carpetas_vaciadas': subdirs,
            'errores': len(errors)
        }
    }

    if errors:
        result['errors'] = errors[:10]

    return Response(result)

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """Login de usuarios - usa email como username"""
    # Accept both 'email' and 'username' for backwards compatibility
    email = request.data.get('email') or request.data.get('username')
    password = request.data.get('password')
    remember_me = request.data.get('remember_me', False)
    
    if not email or not password:
        return Response({
            'success': False,
            'message': 'Email y contraseña son requeridos'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Limitar intentos de login para prevenir ataques de fuerza bruta
    # Guardar IP y número de intentos en cache (Redis)
    # Si Redis no está disponible, continuar sin rate limiting
    attempts = 0
    cache_key = None
    try:
        from django.core.cache import cache
        ip_address = request.META.get('REMOTE_ADDR')
        cache_key = f'login_attempts_{ip_address}'
        attempts = cache.get(cache_key, 0)
        
        if attempts >= 5:
            return Response({
                'success': False,
                'message': 'Demasiados intentos fallidos. Intenta de nuevo en 15 minutos.'
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)
    except Exception as e:
        logger.warning(f'Cache no disponible, continuando sin rate limiting: {e}')
    
    # Authenticate using email (EmailBackend will handle this)
    user = authenticate(request, username=email, password=password)
    
    if user is not None:
        if not user.is_active:
            return Response({
                'success': False,
                'message': 'La cuenta de usuario está deshabilitada'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Login exitoso - resetear intentos
        try:
            if cache_key:
                cache.delete(cache_key)
        except Exception:
            pass  # Cache no disponible, continuar
        
        # Login del usuario
        login(request, user)
        
        # Configurar duración de la sesión
        if remember_me:
            # Sesión de 30 días si "recordar sesión" está activado
            request.session.set_expiry(30 * 24 * 60 * 60)
        else:
            # Sesión expira al cerrar el navegador
            request.session.set_expiry(0)
        
        serializer = UserSerializer(user)
        
        # Log del login exitoso
        try:
            ip_address = request.META.get('REMOTE_ADDR')
            logger.info(f'Login exitoso: {user.email} desde IP {ip_address}')
        except Exception:
            logger.info(f'Login exitoso: {user.email}')
        
        return Response({
            'success': True,
            'message': 'Login exitoso',
            'user': serializer.data
        })
    else:
        # Login fallido - incrementar contador de intentos
        try:
            if cache_key:
                cache.set(cache_key, attempts + 1, 900)  # 15 minutos
            ip_address = request.META.get('REMOTE_ADDR')
            logger.warning(f'Intento de login fallido: {email} desde IP {ip_address}')
        except Exception as e:
            logger.warning(f'Intento de login fallido: {email} (cache no disponible)')
        
        return Response({
            'success': False,
            'message': 'Credenciales inválidas'
        }, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password(request):
    """Enviar email para recuperar contraseña"""
    email = request.data.get('email')
    
    if not email:
        return Response({
            'success': False,
            'message': 'Email es requerido'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = CustomUser.objects.get(email=email)
        
        # Generar token de recuperación
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes
        
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        
        # Construir URL de reset (ajustar según tu configuración)
        reset_url = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}/"
        
        # TODO: Enviar email (requiere configuración de email en settings)
        # Por ahora, solo logueamos el token
        logger.info(f'Reset password token para {email}: {reset_url}')
        
        # En producción, descomentar esto:
        # from django.core.mail import send_mail
        # send_mail(
        #     'Recuperación de contraseña - Archivo+',
        #     f'Haz clic en el siguiente enlace para resetear tu contraseña: {reset_url}',
        #     settings.DEFAULT_FROM_EMAIL,
        #     [email],
        #     fail_silently=False,
        # )
        
        return Response({
            'success': True,
            'message': 'Si el email existe, recibirás instrucciones para recuperar tu contraseña'
        })
    except CustomUser.DoesNotExist:
        # No revelar si el email existe o no (seguridad)
        return Response({
            'success': True,
            'message': 'Si el email existe, recibirás instrucciones para recuperar tu contraseña'
        })

@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    """Resetear contraseña con token"""
    from django.contrib.auth.tokens import default_token_generator
    from django.utils.http import urlsafe_base64_decode
    from django.utils.encoding import force_str
    
    uid = request.data.get('uid')
    token = request.data.get('token')
    new_password = request.data.get('password')
    
    if not all([uid, token, new_password]):
        return Response({
            'success': False,
            'message': 'Todos los campos son requeridos'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user_id = force_str(urlsafe_base64_decode(uid))
        user = CustomUser.objects.get(pk=user_id)
        
        if default_token_generator.check_token(user, token):
            user.set_password(new_password)
            user.save()
            
            logger.info(f'Contraseña reseteada para: {user.email}')
            
            return Response({
                'success': True,
                'message': 'Contraseña actualizada exitosamente'
            })
        else:
            return Response({
                'success': False,
                'message': 'Token inválido o expirado'
            }, status=status.HTTP_400_BAD_REQUEST)
    except (CustomUser.DoesNotExist, ValueError, TypeError):
        return Response({
            'success': False,
            'message': 'Token inválido'
        }, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
def logout_view(request):
    """Logout de usuarios"""
    logout(request)
    return Response({
        'success': True,
        'message': 'Logout exitoso'
    })

@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
def smtp_config(request):
    """Obtener o actualizar configuración SMTP"""
    import json
    from pathlib import Path
    
    config_file = settings.BASE_DIR / '.env'
    
    if request.method == 'GET':
        # Leer configuración actual
        config = {
            'email_backend': 'smtp' if settings.EMAIL_BACKEND == 'django.core.mail.backends.smtp.EmailBackend' else 'console',
            'email_host': settings.EMAIL_HOST,
            'email_port': str(settings.EMAIL_PORT),
            'email_use_tls': settings.EMAIL_USE_TLS,
            'email_host_user': settings.EMAIL_HOST_USER,
            'email_host_password': '********' if settings.EMAIL_HOST_PASSWORD else '',  # No enviar password real
            'default_from_email': settings.DEFAULT_FROM_EMAIL,
        }
        return Response(config)
    
    elif request.method == 'POST':
        # Actualizar configuración
        data = request.data
        
        # Preparar nuevas variables de entorno
        env_vars = {}
        
        if data.get('email_backend') == 'smtp':
            env_vars['EMAIL_BACKEND'] = 'django.core.mail.backends.smtp.EmailBackend'
        else:
            env_vars['EMAIL_BACKEND'] = 'django.core.mail.backends.console.EmailBackend'
        
        env_vars['EMAIL_HOST'] = data.get('email_host', 'smtp.gmail.com')
        env_vars['EMAIL_PORT'] = data.get('email_port', '587')
        env_vars['EMAIL_USE_TLS'] = 'True' if data.get('email_use_tls', True) else 'False'
        env_vars['EMAIL_HOST_USER'] = data.get('email_host_user', '')
        
        # Solo actualizar password si se envió uno nuevo (no ********)
        if data.get('email_host_password') and data.get('email_host_password') != '********':
            env_vars['EMAIL_HOST_PASSWORD'] = data.get('email_host_password')
        
        env_vars['DEFAULT_FROM_EMAIL'] = data.get('default_from_email', 'noreply@archivoplus.local')
        
        # Leer .env existente
        env_content = {}
        if config_file.exists():
            with open(config_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        env_content[key.strip()] = value.strip()
        
        # Actualizar con nuevas variables
        env_content.update(env_vars)
        
        # Escribir .env actualizado
        with open(config_file, 'w') as f:
            f.write('# Archivo+ v3.1 - Environment Variables\n')
            f.write('# Última actualización: ' + timezone.now().strftime('%Y-%m-%d %H:%M:%S') + '\n\n')
            for key, value in sorted(env_content.items()):
                f.write(f'{key}={value}\n')
        
        logger.info(f'SMTP configuration updated by {request.user.email}')
        
        return Response({
            'success': True,
            'message': 'Configuration saved. Restart server to apply changes.'
        })

@api_view(['POST'])
@permission_classes([IsAdminUser])
def smtp_test(request):
    """Enviar email de prueba con la configuración actual"""
    from django.core.mail import send_mail
    
    email = request.data.get('email')
    config = request.data.get('config', {})
    
    if not email:
        return Response({
            'success': False,
            'message': 'Email es requerido'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Enviar email de prueba
        send_mail(
            'Prueba de configuración SMTP - Archivo+',
            f'''
            Hola,
            
            Este es un email de prueba para verificar la configuración SMTP de Archivo+ v3.1.
            
            Si recibiste este mensaje, la configuración está funcionando correctamente.
            
            Configuración actual:
            - Host: {settings.EMAIL_HOST}
            - Puerto: {settings.EMAIL_PORT}
            - TLS: {settings.EMAIL_USE_TLS}
            - Usuario: {settings.EMAIL_HOST_USER}
            
            Saludos,
            Archivo+ v3.1 - Broadcast Asset Management
            ''',
            settings.DEFAULT_FROM_EMAIL,
            [email],
            fail_silently=False,
        )
        
        logger.info(f'Email de prueba enviado a {email} por {request.user.email}')
        
        return Response({
            'success': True,
            'message': f'Email de prueba enviado exitosamente a {email}'
        })
    except Exception as e:
        logger.error(f'Error sending test email: {str(e)}')
        return Response({
            'success': False,
            'message': f'Error sending email: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def current_user(request):
    """Retorna información del usuario actual con sus repositorios y permisos"""
    if not request.user.is_authenticated:
        return Response({'authenticated': False}, status=status.HTTP_200_OK)
    
    serializer = UserSerializer(request.user)
    return Response(serializer.data)

class RepositorioViewSet(viewsets.ModelViewSet):
    serializer_class = RepositorioSerializer
    
    def get_queryset(self):
        """
        Filtrar repositorios según permisos del usuario:
        - Superusers/staff: ven todos los repositorios
        - Usuarios normales: solo ven sus repositorios asignados
        - Sin autenticación (desarrollo): retorna todos para testing
        """
        user = self.request.user
        
        # Para desarrollo: si no está autenticado, retornar todos (modo demo)
        if not user.is_authenticated:
            return Repositorio.objects.all()
        
        if user.is_superuser or user.is_staff:
            return Repositorio.objects.all()
        
        # Usuarios normales: repositorios con permiso (puede_ver)
        return Repositorio.objects.filter(
            permisos_usuario__usuario=user,
            permisos_usuario__puede_ver=True
        ).distinct()

class AgenciaViewSet(viewsets.ModelViewSet):
    queryset = Agencia.objects.all()
    serializer_class = AgenciaSerializer

class DirectorioViewSet(viewsets.ModelViewSet):
    serializer_class = DirectorioSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['repositorio', 'modulo', 'parent']
    
    def get_queryset(self):
        return Directorio.objects.all()

    @action(detail=False, methods=['post'], permission_classes=[IsAdminUser])
    def delete_all(self, request):
        """
        Elimina todos los registros de Directorio (solo para pruebas, requiere superusuario).
        """
        if not request.user.is_superuser:
            return Response({'error': 'Solo los superusuarios pueden realizar esta acción.'}, status=status.HTTP_403_FORBIDDEN)
        count, _ = Directorio.objects.all().delete()
        return Response({'message': f'Se eliminaron {count} directorios.'})

class UserViewSet(viewsets.ModelViewSet):
    queryset = CustomUser.objects.all()
    serializer_class = UserSerializer

class RepositorioPermisoViewSet(viewsets.ModelViewSet):
    serializer_class = RepositorioPermisoSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['usuario', 'repositorio']
    
    def get_queryset(self):
        return RepositorioPermiso.objects.all().select_related('usuario', 'repositorio')

class ModuloViewSet(viewsets.ModelViewSet):
    serializer_class = ModuloSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['tipo', 'activo']
    
    def get_queryset(self):
        return Modulo.objects.all()

class PerfilViewSet(viewsets.ModelViewSet):
    queryset = Perfil.objects.all()
    serializer_class = PerfilSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['activo']

class BroadcastViewSet(viewsets.ModelViewSet):
    serializer_class = BroadcastSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['repositorio', 'estado_transcodificacion', 'modulo', 'directorio']
    # Búsqueda ampliada: incluir más campos de la pizarra y nombre de archivo
    # El SearchFilter se mantiene para compatibilidad pero sobreescribimos filter_queryset
    search_fields = [
        'pizarra__producto', 'pizarra__version', 'pizarra__cliente', 'pizarra__agencia',
        'pizarra__duracion', 'nombre_original', 'id_content'
    ]

    # ------------------------------------------------------------
    # Helpers para encolar/transcodificar de forma robusta
    # ------------------------------------------------------------
    def _celery_workers_online(self) -> bool:
        """Regresa True si hay al menos un worker Celery disponible.
        Evita fallas silenciosas cuando no hay workers en desarrollo.
        """
        try:
            from celery import current_app
            insp = current_app.control.inspect()
            stats = insp.stats() if insp else None
            return bool(stats)
        except Exception:
            return False

    def _enqueue_transcode(self, broadcast):
        """Encola transcodificación con Celery o hace fallback síncrono si no hay workers.
        Modo pensado para desarrollo/local cuando no se tiene un worker levantado.
        """
        from django.conf import settings
        import os

        # Permitir forzar modo síncrono por variable de entorno
        sync_env = os.getenv('SYNC_TRANSCODE', '').strip() == '1'
        celery_ok = self._celery_workers_online()

        if celery_ok and not sync_env:
            # Encolar normal con Celery
            transcode_video.delay(str(broadcast.id))
            logger.info(f"🎬 Broadcast {broadcast.id} queued for transcoding (Celery)")
            return 'queued'

        # Fallback: ejecutar síncrono (bloquea la request) — útil en local/DEBUG
        logger.warning(
            f"⚠️ No hay workers Celery activos o SYNC_TRANSCODE=1, ejecutando transcode_video() en modo síncrono para {broadcast.id}"
        )
        try:
            transcode_video(str(broadcast.id))
            return 'sync'
        except Exception as e:
            logger.error(f"Error en transcode síncrono para {broadcast.id}: {e}")
            raise

    def get_queryset(self):
        """
        Filtrar broadcasts según los permisos del usuario:
        - Superusers/staff: ven todos los broadcasts
        - Usuarios normales: solo ven broadcasts de sus repositorios asignados
        - Sin autenticación (desarrollo): retorna todos para testing
        """
        user = self.request.user
        
        # Para desarrollo: si no está autenticado, retornar todos (modo demo)
        if not user.is_authenticated:
            return Broadcast.objects.all().order_by('-fecha_subida')
        
        # Si es superuser o staff, puede ver todos los broadcasts
        if user.is_superuser or user.is_staff:
            return Broadcast.objects.all().order_by('-fecha_subida')
        
        # Usuarios normales solo ven broadcasts de sus repositorios asignados
        repositorios_ids = RepositorioPermiso.objects.filter(
            usuario=user,
            puede_ver=True
        ).values_list('repositorio_id', flat=True)
        return Broadcast.objects.filter(
            repositorio_id__in=repositorios_ids
        ).order_by('-fecha_subida')

    def filter_queryset(self, queryset):
        """Extiende la búsqueda para cubrir todos los campos solicitados:
        cliente, agencia, producto, version, duracion (time), formato (extension), date, file name.
        La lógica añade coincidencias OR sobre múltiples campos, incluyendo heurísticas para fecha y extensión.
        """
        queryset = super().filter_queryset(queryset)
        term = self.request.query_params.get('search', '').strip()
        if not term:
            return queryset
        from django.db.models import Q
        import re
        q = Q(
            pizarra__producto__icontains=term
        ) | Q(
            pizarra__version__icontains=term
        ) | Q(
            pizarra__cliente__icontains=term
        ) | Q(
            pizarra__agencia__icontains=term
        ) | Q(
            pizarra__duracion__icontains=term
        ) | Q(
            nombre_original__icontains=term
        ) | Q(
            id_content__icontains=term
        )
        # Detectar patrón de fecha YYYY-MM-DD
        if re.match(r'^\d{4}-\d{2}-\d{2}$', term):
            q = q | Q(fecha_subida__date=term)
        # Si tiene formato HH:MM o HH:MM:SS agregar a duracion
        if re.match(r'^\d{1,2}:\d{2}(:\d{2})?$', term):
            q = q | Q(pizarra__duracion__icontains=term)
        # Extensión / formato ("mp4" / ".mp4")
        ext = term.lower().lstrip('.')
        if len(ext) <= 6 and re.match(r'^[a-z0-9]{2,6}$', ext):
            q = q | Q(nombre_original__iendswith='.' + ext)
        return queryset.filter(q).distinct()

    def create(self, request, *args, **kwargs):
        """
        Sobrescribimos el método create para manejar el upload de archivos
        y disparar la tarea de transcodificación.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        extra = {}
        if request.user and request.user.is_authenticated:
            extra['creado_por'] = request.user
        broadcast = serializer.save(**extra)
        
        # Si hay un archivo original, disparar la tarea de transcodificación
        if broadcast.archivo_original:
            # Actualizar estado a PROCESANDO
            broadcast.estado_transcodificacion = 'PROCESANDO'
            broadcast.save()
            
            # Disparar tarea Celery asíncrona
            transcode_video.delay(str(broadcast.id))
        
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def _delete_broadcast_files(self, broadcast):
        """Elimina archivos físicos asociados a un broadcast (original, transcodificados, thumbnails)."""
        # Lista de archivos a eliminar
        archivos_a_eliminar = []

        # 1. Archivo original
        if broadcast.archivo_original:
            try:
                archivos_a_eliminar.append(broadcast.archivo_original.path)
                logger.info(f"  - Archivo original: {broadcast.archivo_original.path}")
            except Exception as e:
                logger.error(f"  - Error obteniendo path del original: {e}")

        # 2. Archivo H.264 (transcodificado)
        if getattr(broadcast, 'ruta_h264', None):
            try:
                h264_path = os.path.join(settings.MEDIA_ROOT, broadcast.ruta_h264)
                archivos_a_eliminar.append(h264_path)
                logger.info(f"  - Archivo H.264: {h264_path}")
            except Exception as e:
                logger.error(f"  - Error obteniendo path del H.264: {e}")

        # 3. Archivo proxy/H.265 (transcodificado)
        if getattr(broadcast, 'ruta_proxy', None):
            try:
                proxy_path = os.path.join(settings.MEDIA_ROOT, broadcast.ruta_proxy)
                archivos_a_eliminar.append(proxy_path)
                logger.info(f"  - Archivo proxy (H.265): {proxy_path}")
            except Exception as e:
                logger.error(f"  - Error obteniendo path del proxy: {e}")

        # 4. Thumbnail principal
        if getattr(broadcast, 'thumbnail', None):
            try:
                thumbnail_path = os.path.join(settings.MEDIA_ROOT, str(broadcast.thumbnail))
                archivos_a_eliminar.append(thumbnail_path)
                logger.info(f"  - Thumbnail: {thumbnail_path}")
            except Exception as e:
                logger.error(f"  - Error obteniendo path del thumbnail: {e}")

        # 5. Pizarra thumbnail
        if getattr(broadcast, 'pizarra_thumbnail', None):
            try:
                pizarra_path = os.path.join(settings.MEDIA_ROOT, str(broadcast.pizarra_thumbnail))
                archivos_a_eliminar.append(pizarra_path)
                logger.info(f"  - Pizarra thumbnail: {pizarra_path}")
            except Exception as e:
                logger.error(f"  - Error obteniendo path del pizarra: {e}")

        # Eliminar todos los archivos físicos
        for archivo_path in archivos_a_eliminar:
            try:
                if os.path.exists(archivo_path):
                    os.remove(archivo_path)
                    logger.info(f"  ✓ Eliminado: {archivo_path}")
                else:
                    logger.warning(f"  ⚠ Does not exist: {archivo_path}")
            except Exception as e:
                logger.error(f"  ✗ Error deleting {archivo_path}: {e}")

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def force_transcode(self, request, pk=None):
        """Re-encola y fuerza la transcodificación de un broadcast.
        Útil cuando quedó en PENDIENTE o tras un error temporal.
        """
        try:
            broadcast = Broadcast.objects.get(pk=pk)
        except Broadcast.DoesNotExist:
            return Response({'error': 'Broadcast no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        # Reset de estado para forzar nuevo intento
        broadcast.last_error = ''
        broadcast.estado_transcodificacion = 'PROCESANDO'
        broadcast.save(update_fields=['last_error', 'estado_transcodificacion'])

        mode = self._enqueue_transcode(broadcast)
        return Response({'status': 'ok', 'mode': mode, 'id': str(broadcast.id)})

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def process_pending(self, request):
        """
        Procesar todos los broadcasts en estado PENDIENTE en batch.
        
        Ideal para uso después de uploads masivos:
        1. Usuario sube múltiples archivos (quedan en PENDIENTE)
        2. Cierra el uploader cuando todas las cargas terminan
        3. Dispara este endpoint para procesar todo en batch
        4. Frontend hace polling para ver el progreso
        
        Parámetros opcionales:
        - repositorio: filtrar por repositorio específico
        - modulo: filtrar por módulo específico
        - limit: máximo de videos a procesar (default: sin límite)
        """
        # Filtros opcionales
        queryset = Broadcast.objects.filter(
            archivo_original__isnull=False,
            estado_transcodificacion='PENDIENTE'
        )
        
        # Filtrar por repositorio si se especifica
        repositorio_id = request.data.get('repositorio')
        if repositorio_id:
            queryset = queryset.filter(repositorio_id=repositorio_id)
        
        # Filtrar por módulo si se especifica
        modulo_id = request.data.get('modulo')
        if modulo_id:
            queryset = queryset.filter(modulo_id=modulo_id)
        
        # Límite opcional
        limit = request.data.get('limit')
        if limit:
            queryset = queryset[:int(limit)]
        
        pending_broadcasts = list(queryset)
        total = len(pending_broadcasts)
        
        if total == 0:
            return Response({
                'message': 'No hay broadcasts pendientes para procesar',
                'total': 0
            })
        
        # Encolar todos los broadcasts
        enqueued = 0
        for broadcast in pending_broadcasts:
            try:
                transcode_video.delay(str(broadcast.id))
                enqueued += 1
                logger.info(f"🎬 Broadcast {broadcast.id} encolado para procesamiento batch")
            except Exception as e:
                logger.error(f"Error encolando broadcast {broadcast.id}: {e}")
        
        return Response({
            'message': f'Procesamiento batch iniciado',
            'total_pendientes': total,
            'encolados': enqueued,
            'broadcast_ids': [str(b.id) for b in pending_broadcasts]
        })

    @action(detail=False, methods=['post'], url_path='encode', permission_classes=[IsAuthenticated])
    def encode_custom(self, request):
        """
        Endpoint para codificación personalizada de videos.
        Recibe la configuración de encoding y dispara una tarea Celery.
        
        POST /api/broadcasts/encode/
        Body: {
            broadcast_id: uuid,
            settings: {...},
            preset_id: string
        }
        """
        broadcast_id = request.data.get('broadcast_id')
        settings_data = request.data.get('settings', {})
        preset_id = request.data.get('preset_id', 'custom')
        
        if not broadcast_id:
            return Response(
                {'error': 'broadcast_id es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            broadcast = Broadcast.objects.get(id=broadcast_id)
        except Broadcast.DoesNotExist:
            return Response(
                {'error': 'Broadcast no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Validar que el archivo original exista
        if not broadcast.archivo_original:
            return Response(
                {'error': 'El broadcast no tiene archivo original'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Importar la tarea de encoding personalizado
        from .tasks import encode_custom_video
        
        # Disparar la tarea Celery con los settings
        encode_custom_video.delay(
            broadcast_id=str(broadcast_id),
            encoding_settings=settings_data,
            preset_id=preset_id
        )
        
        logger.info(f"🎬 Codificación personalizada iniciada para broadcast {broadcast_id} con preset {preset_id}")
        
        return Response({
            'message': 'Codificación iniciada',
            'broadcast_id': str(broadcast_id),
            'preset': preset_id
        }, status=status.HTTP_202_ACCEPTED)

    def destroy(self, request, *args, **kwargs):
        """
        Override destroy method to delete all physical files
        associated with the broadcast before deleting from database.
        """
        broadcast = self.get_object()
        logger.info(f"🗑️  Deleting broadcast {broadcast.id}")
        self._delete_broadcast_files(broadcast)
        # Finally, delete the database record
        logger.info(f"  ✓ Database record deleted")
        return super().destroy(request, *args, **kwargs)


class ProcessingErrorViewSet(viewsets.ReadOnlyModelViewSet):
    """Lista los errores de procesamiento. Solo lectura."""
    serializer_class = ProcessingErrorSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['repositorio', 'modulo', 'directorio', 'stage', 'resolved']
    search_fields = ['file_name', 'error_message']
    ordering_fields = ['fecha_creacion', 'file_name', 'stage']

    def get_queryset(self):
        user = self.request.user
        qs = ProcessingError.objects.all()
        # Superusers ven todo
        if user.is_superuser or user.is_staff:
            return qs.order_by('-fecha_creacion')
        if not user.is_authenticated:
            return qs.none()
        # Filtrar por repos permitidos
        repositorios_ids = RepositorioPermiso.objects.filter(
            usuario=user,
            puede_ver=True
        ).values_list('repositorio_id', flat=True)
        return qs.filter(repositorio_id__in=repositorios_ids).order_by('-fecha_creacion')


class EncodingPresetViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar presets de codificación personalizados"""
    serializer_class = EncodingPresetSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['categoria', 'es_global', 'activo', 'creado_por']
    search_fields = ['nombre', 'descripcion']
    ordering_fields = ['fecha_creacion', 'fecha_modificacion', 'veces_usado', 'nombre']
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Usuarios regulares ven:
        - Presets globales activos
        - Sus propios presets (activos e inactivos)
        
        Administradores ven todos los presets
        """
        user = self.request.user
        qs = EncodingPreset.objects.all()
        
        # Admins ven todo
        if user.is_superuser or user.is_staff:
            return qs.order_by('-fecha_creacion')
        
        # Usuarios regulares: globales activos + propios
        from django.db.models import Q
        return qs.filter(
            Q(es_global=True, activo=True) | Q(creado_por=user)
        ).order_by('-fecha_creacion')

    def get_permissions(self):
        """
        - list/retrieve: Authenticated
        - create/update/delete: Admin only
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        """Asignar el usuario actual como creador"""
        serializer.save(creado_por=self.request.user)
        logger.info(f"✅ Preset creado: {serializer.instance.nombre} por {self.request.user.email}")

    def perform_update(self, serializer):
        """Log de actualizaciones"""
        serializer.save()
        logger.info(f"📝 Preset actualizado: {serializer.instance.nombre} por {self.request.user.email}")

    def perform_destroy(self, instance):
        """Desactivar en lugar de eliminar físicamente (soft delete)"""
        instance.activo = False
        instance.save(update_fields=['activo'])
        logger.info(f"🗑️ Preset desactivado: {instance.nombre} por {self.request.user.email}")

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def increment_usage(self, request, pk=None):
        """Incrementar contador de uso del preset"""
        preset = self.get_object()
        preset.incrementar_uso()
        return Response({
            'status': 'success',
            'veces_usado': preset.veces_usado,
            'mensaje': f'Uso registrado para {preset.nombre}'
        })

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def by_category(self, request):
        """Listar presets agrupados por categoría"""
        queryset = self.filter_queryset(self.get_queryset())
        
        categorias = {}
        for preset in queryset:
            cat = preset.get_categoria_display()
            if cat not in categorias:
                categorias[cat] = []
            categorias[cat].append(self.get_serializer(preset).data)
        
        return Response(categorias)


class StorageAssetViewSet(viewsets.ModelViewSet):
    """ViewSet for general storage files - accepts all file types"""
    queryset = StorageAsset.objects.all().order_by('-fecha_subida')
    serializer_class = StorageAssetSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['repositorio', 'directorio', 'modulo', 'tipo_archivo', 'creado_por', 'estado']
    search_fields = ['nombre_original', 'tipo_archivo']
    ordering_fields = ['fecha_subida', 'nombre_original', 'tipo_archivo', 'file_size']
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        """Simple storage - just save the file, no processing"""
        import os
        
        # Get file info before saving
        uploaded_file = self.request.FILES.get('archivo_original')
        
        # Save instance with user
        instance = serializer.save(
            creado_por=self.request.user,
            estado='COMPLETADO'  # Storage files are always complete immediately
        )
        
        # Update file metadata after save
        if instance.archivo_original:
            filename = instance.archivo_original.name
            ext = os.path.splitext(filename)[1].lower()
            instance.tipo_archivo = ext if ext else 'unknown'
            
            # Get file size
            try:
                instance.file_size = instance.archivo_original.size
            except Exception:
                instance.file_size = 0
            
            # Save metadata only
            instance.save(update_fields=['tipo_archivo', 'file_size'])
        
        logger.info(f"📦 Storage file saved: {instance.nombre_original} ({instance.tipo_archivo}, {instance.file_size} bytes)")
    
    def _delete_storage_files(self, storage_file):
        """Delete physical files associated with a storage file."""
        import os
        
        archivos_a_eliminar = []

        # 1. Original file
        if storage_file.archivo_original:
            try:
                archivos_a_eliminar.append(storage_file.archivo_original.path)
                logger.info(f"  - Original file: {storage_file.archivo_original.path}")
            except Exception as e:
                logger.error(f"  - Error getting original file path: {e}")

        # 2. Thumbnail (if exists)
        if storage_file.thumbnail:
            try:
                archivos_a_eliminar.append(storage_file.thumbnail.path)
                logger.info(f"  - Thumbnail: {storage_file.thumbnail.path}")
            except Exception as e:
                logger.error(f"  - Error getting thumbnail path: {e}")

        # Delete all physical files
        for archivo_path in archivos_a_eliminar:
            try:
                if os.path.exists(archivo_path):
                    os.remove(archivo_path)
                    logger.info(f"  ✓ Deleted: {archivo_path}")
                else:
                    logger.warning(f"  ⚠ Does not exist: {archivo_path}")
            except Exception as e:
                logger.error(f"  ✗ Error deleting {archivo_path}: {e}")

    def destroy(self, request, *args, **kwargs):
        """Override destroy method to delete physical files before database record."""
        storage_file = self.get_object()
        logger.info(f"🗑️  Deleting storage file {storage_file.id} - {storage_file.nombre_original}")
        self._delete_storage_files(storage_file)
        logger.info(f"  ✓ Database record deleted")
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['post'], permission_classes=[IsAdminUser])
    def purge_all(self, request):
        """
        Elimina TODOS los broadcasts y sus archivos físicos asociados (solo pruebas, requiere superusuario).
        """
        if not request.user.is_superuser:
            return Response({'error': 'Solo los superusuarios pueden realizar esta acción.'}, status=status.HTTP_403_FORBIDDEN)

        qs = Broadcast.objects.all()
        total = qs.count()
        files_deleted = 0
        for b in qs:
            # contar archivos planeados para eliminar
            before = files_deleted
            # coleccionar y eliminar
            # contaremos archivos eliminados por diferencias de logs no determinísticas; aquí intentamos eliminar y contamos los existentes
            # 1 original
            if getattr(b, 'archivo_original', None):
                try:
                    path = b.archivo_original.path
                    if os.path.exists(path):
                        os.remove(path)
                        files_deleted += 1
                except Exception:
                    pass
            # 2 h264
            if getattr(b, 'ruta_h264', None):
                path = os.path.join(settings.MEDIA_ROOT, b.ruta_h264)
                if os.path.exists(path):
                    try:
                        os.remove(path)
                        files_deleted += 1
                    except Exception:
                        pass
            # 3 proxy
            if getattr(b, 'ruta_proxy', None):
                path = os.path.join(settings.MEDIA_ROOT, b.ruta_proxy)
                if os.path.exists(path):
                    try:
                        os.remove(path)
                        files_deleted += 1
                    except Exception:
                        pass
            # 4 thumbs
            if getattr(b, 'thumbnail', None):
                path = os.path.join(settings.MEDIA_ROOT, str(b.thumbnail))
                if os.path.exists(path):
                    try:
                        os.remove(path)
                        files_deleted += 1
                    except Exception:
                        pass
            if getattr(b, 'pizarra_thumbnail', None):
                path = os.path.join(settings.MEDIA_ROOT, str(b.pizarra_thumbnail))
                if os.path.exists(path):
                    try:
                        os.remove(path)
                        files_deleted += 1
                    except Exception:
                        pass
            # eliminar registro
            b.delete()

        return Response({'message': f'Purga completada: {total} broadcasts eliminados, {files_deleted} archivos eliminados.'})
    
    @action(detail=False, methods=['post'], url_path='retry_failed')
    def retry_failed(self, request):
        """
        Reencola todos los broadcasts en estado FALLIDO/ERROR para transcodificación.
        Opcionalmente filtra por repositorio (repositorio_id) o directorio (directorio_id).
        """
        repositorio_id = request.data.get('repositorio_id') or request.query_params.get('repositorio_id')
        directorio_id = request.data.get('directorio_id') or request.query_params.get('directorio_id')

        qs = Broadcast.objects.filter(estado_transcodificacion__in=['ERROR', 'FALLIDO'])
        if repositorio_id:
            qs = qs.filter(repositorio_id=repositorio_id)
        if directorio_id:
            qs = qs.filter(directorio_id=directorio_id)

        total = qs.count()
        if total == 0:
            return Response({'message': 'No failed broadcasts to retry', 'queued': 0})

        queued = 0
        for b in qs:
            # Debe tener archivo original configurado
            if not b.archivo_original:
                continue
            b.estado_transcodificacion = 'PROCESANDO'
            b.last_error = None
            b.save(update_fields=['estado_transcodificacion', 'last_error'])
            
            # Disparar tarea Celery
            transcode_video.delay(str(b.id))
            queued += 1

        logger.info(f"🔁 Retry failed: queued {queued}/{total} broadcasts")
        return Response({'message': 'Retry enqueued', 'queued': queued, 'total_failed': total})
    
    @action(detail=False, methods=['post'], url_path='match_source_files')
    def match_source_files(self, request):
        """
        Detecta archivos en /media/sources/ y los vincula con broadcasts sin archivo original.
        Útil después de importar metadata vía CSV.
        """
        repositorio_id = request.data.get('repositorio_id')
        dry_run = request.data.get('dry_run') in [True, 'true', 'True', '1', 1]
        
        if not repositorio_id:
            return Response({
                'error': 'repositorio_id es requerido'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            repositorio = Repositorio.objects.get(id=repositorio_id)
        except Repositorio.DoesNotExist:
            return Response({
                'error': 'Repositorio no encontrado'
            }, status=status.HTTP_404_NOT_FOUND)
        
        sources_path = os.path.join(settings.MEDIA_ROOT, 'sources')
        
        if not os.path.exists(sources_path):
            return Response({
                'error': f'Directorio {sources_path} no existe'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Buscar broadcasts sin archivo original de este repositorio
        from django.db.models import Q
        broadcasts_sin_archivo = Broadcast.objects.filter(
            Q(repositorio=repositorio) & (Q(archivo_original__isnull=True) | Q(archivo_original=''))
        )
        
        matched = []
        not_matched = []
        errors = []
        
        # Listar todos los archivos en sources/
        VIDEO_EXTS = (
            '.mov', '.mp4', '.avi', '.mkv', '.mxf', '.m4v', '.webm', '.wmv', '.mpg', '.mpeg', '.mts'
        )
        available_files = []
        for root, dirs, files in os.walk(sources_path):
            for filename in files:
                ext = os.path.splitext(filename)[1].lower()
                if ext in VIDEO_EXTS or ext == '':  # incluir archivos sin extensión
                    file_path = os.path.join(root, filename)
                    rel_path = os.path.relpath(file_path, settings.MEDIA_ROOT)
                    path_parts = rel_path.replace('\\', '/').split('/')
                    available_files.append({
                        'filename': filename,
                        'path': file_path,
                        'relative_path': rel_path,
                        'path_parts': path_parts,
                    })
        
        logger.info(f"📁 Encontrados {len(available_files)} archivos de video en sources/")
        
        # Intentar vincular cada broadcast (priorizando id_content)
        for broadcast in broadcasts_sin_archivo:
            id_content = getattr(broadcast, 'id_content', None)
            nombre_buscar = broadcast.nombre_original

            if not id_content and not nombre_buscar:
                not_matched.append({
                    'id': str(broadcast.id),
                    'nombre': 'Sin identificador',
                    'id_content': None,
                    'reason': 'No tiene id_content ni nombre_original'
                })
                continue

            # Buscar archivo coincidente por id_content o nombre
            archivo_encontrado = None

            # 1) Por id_content (folio) en el path completo, incluyendo nombres de carpeta
            if id_content:
                idc_raw = str(id_content).strip()
                idc = idc_raw.lower()
                # Variantes: núcleo después de '-', y versión compacta sin non-alnum
                idc_core = idc_raw.split('-')[-1].strip().lower() if '-' in idc_raw else idc
                idc_compact = ''.join(ch for ch in idc if ch.isalnum())
                variants = [v for v in {idc, idc_core, idc_compact} if v]

                rel_lower = [
                    (f, f['relative_path'].lower(), [p.lower() for p in f.get('path_parts', [])])
                    for f in available_files
                ]

                # Candidatos si cualquier variante aparece en el path
                candidatos = [f for (f, rel, parts) in rel_lower if any(v in rel for v in variants)]

                if candidatos:
                    # Priorizar coincidencias exactas por nombre de carpeta (path_parts)
                    exact_folder = []
                    for (f, rel, parts) in [(f, f['relative_path'].lower(), [p.lower() for p in f.get('path_parts', [])]) for f in candidatos]:
                        if any(v in parts for v in variants):
                            exact_folder.append(f)
                    if exact_folder:
                        archivo_encontrado = exact_folder[0]
                    else:
                        archivo_encontrado = candidatos[0]

            # 2) Si no se encontró por id_content, buscar por nombre exacto
            if not archivo_encontrado and nombre_buscar:
                nombre_limpio = os.path.basename(str(nombre_buscar)).lower()
                for file_info in available_files:
                    if file_info['filename'].lower() == nombre_limpio:
                        archivo_encontrado = file_info
                        break

            # 3) Si tampoco, intentar por nombre sin extensión
            if not archivo_encontrado and nombre_buscar:
                base = os.path.splitext(os.path.basename(str(nombre_buscar)))[0].lower()
                for file_info in available_files:
                    if os.path.splitext(file_info['filename'].lower())[0] == base:
                        archivo_encontrado = file_info
                        break

            if archivo_encontrado:
                try:
                    if not dry_run:
                        # Vincular archivo al broadcast
                        broadcast.archivo_original = archivo_encontrado['relative_path']
                        # No cambiamos estado aquí; start_bulk_transcode tomará los pendientes
                        broadcast.save(update_fields=['archivo_original'])

                    matched.append({
                        'id': str(broadcast.id),
                        'id_content': id_content,
                        'nombre': broadcast.nombre_original,
                        'archivo': archivo_encontrado['filename'],
                        'path': archivo_encontrado.get('relative_path'),
                        'applied': not dry_run
                    })

                    logger.info(f"✓ Match {'(dry-run) ' if dry_run else ''}: {id_content or nombre_buscar} → {archivo_encontrado['filename']}")

                except Exception as e:
                    errors.append({
                        'id': str(broadcast.id),
                        'id_content': id_content,
                        'nombre': broadcast.nombre_original,
                        'error': str(e)
                    })
            else:
                not_matched.append({
                    'id': str(broadcast.id),
                    'id_content': id_content,
                    'nombre': broadcast.nombre_original,
                    'reason': 'Archivo no encontrado en sources/'
                })
        
        return Response({
            'success': True,
            'repositorio': repositorio.nombre,
            'dry_run': dry_run,
            'total_broadcasts': broadcasts_sin_archivo.count(),
            'matched': len(matched),
            'not_matched': len(not_matched),
            'errors': len(errors),
            'matched_list': matched[:50],  # Primeros 50
            'not_matched_list': not_matched[:50],
            'errors_list': errors,
            'available_files_count': len(available_files)
        })
    
    @action(detail=False, methods=['post'], url_path='start_bulk_transcode')
    def start_bulk_transcode(self, request):
        """
        Inicia la transcodificación masiva de broadcasts con archivo original
        pero sin procesar (estado METADATA_ONLY o con archivo_original pero sin ruta_h264).
        """
        repositorio_id = request.data.get('repositorio_id')
        
        if not repositorio_id:
            return Response({
                'error': 'repositorio_id es requerido'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            repositorio = Repositorio.objects.get(id=repositorio_id)
        except Repositorio.DoesNotExist:
            return Response({
                'error': 'Repositorio no encontrado'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Buscar broadcasts listos para transcodificar
        broadcasts_pendientes = Broadcast.objects.filter(
            repositorio=repositorio,
            archivo_original__isnull=False
        ).exclude(
            archivo_original=''
        ).filter(
            estado_transcodificacion__in=['METADATA_ONLY', 'PENDIENTE', 'ERROR']
        )
        
        count = broadcasts_pendientes.count()
        
        if count == 0:
            return Response({
                'message': 'No hay broadcasts pendientes de transcodificar',
                'count': 0
            })
        
        # Disparar tareas de transcodificación
        initiated = []
        for broadcast in broadcasts_pendientes:
            try:
                broadcast.estado_transcodificacion = 'PROCESANDO'
                broadcast.save()
                
                # Disparar tarea Celery
                transcode_video.delay(str(broadcast.id))
                
                initiated.append({
                    'id': str(broadcast.id),
                    'nombre': broadcast.nombre_original
                })
                
                logger.info(f"🎬 Transcoding started: {broadcast.nombre_original}")
                
            except Exception as e:
                logger.error(f"Error starting transcoding: {e}")
        
        return Response({
            'success': True,
            'repositorio': repositorio.nombre,
            'total_initiated': len(initiated),
            'broadcasts': initiated[:50]  # Primeros 50
        }, status=status.HTTP_202_ACCEPTED)

    @action(detail=False, methods=['get'], url_path='transcode_status')
    def transcode_status(self, request):
        """
        Resumen de estado de transcodificación por repositorio con razones de pendientes y muestras de errores.
        Query params:
          - repositorio: ID del repositorio (opcional; si no se envía, usa permisos del usuario en todos los repos)
          - limit_errors: número de muestras de errores a incluir (default 25)
        """
        try:
            limit_errors = int(request.query_params.get('limit_errors', 25))
        except Exception:
            limit_errors = 25

        qs = self.get_queryset()

        # Filtrar por repositorio si viene en query
        repo_id = request.query_params.get('repositorio')
        if repo_id:
            qs = qs.filter(repositorio_id=repo_id)

        total = qs.count()

        estados = {
            'PENDIENTE': qs.filter(estado_transcodificacion='PENDIENTE').count(),
            'PROCESANDO': qs.filter(estado_transcodificacion='PROCESANDO').count(),
            'COMPLETADO': qs.filter(estado_transcodificacion='COMPLETADO').count(),
            'ERROR': qs.filter(estado_transcodificacion='ERROR').count(),
        }

        # Analizar razones de pendientes
        pendientes = qs.filter(estado_transcodificacion='PENDIENTE')
        sin_original = pendientes.filter(archivo_original__isnull=True) | pendientes.filter(archivo_original='')
        sin_original_count = sin_original.count()

        # Con archivo asignado pero inexistente en filesystem
        with_original = pendientes.exclude(archivo_original__isnull=True).exclude(archivo_original='')
        archivo_no_existe = 0
        listo_para_iniciar = 0
        muestras_archivo_no_existe = []
        try:
            for b in with_original[:500]:  # limitar inspección de filesystem
                try:
                    # path absoluto del original
                    try:
                        file_path = b.archivo_original.path
                    except Exception:
                        from django.conf import settings as dj_settings
                        file_path = os.path.join(dj_settings.MEDIA_ROOT, str(b.archivo_original))
                    if not os.path.exists(file_path):
                        archivo_no_existe += 1
                        if len(muestras_archivo_no_existe) < 10:
                            muestras_archivo_no_existe.append({
                                'id': str(b.id),
                                'nombre': b.nombre_original,
                                'archivo': str(b.archivo_original)
                            })
                    else:
                        listo_para_iniciar += 1
                except Exception:
                    # Si algo falla al evaluar el path, considerarlo como no existente
                    archivo_no_existe += 1
        except Exception:
            # En caso de error inesperado, seguir sin abortar
            pass

        pendientes_por_razon = {
            'Sin archivo original': sin_original_count,
            'Archivo no existe': archivo_no_existe,
            'Listo para iniciar': listo_para_iniciar,
        }

        # Muestras de errores recientes (recortes de last_error)
        errores_qs = qs.filter(estado_transcodificacion='ERROR').order_by('-fecha_subida')
        errores_muestras = []
        for b in errores_qs[:limit_errors]:
            err = (b.last_error or '').strip()
            if err and len(err) > 500:
                err = err[:500] + '…'
            errores_muestras.append({
                'id': str(b.id),
                'nombre': b.nombre_original,
                'archivo': str(b.archivo_original) if b.archivo_original else None,
                'last_error': err or None
            })

        return Response({
            'total': total,
            'estados': estados,
            'pendientes_por_razon': pendientes_por_razon,
            'muestras_archivo_no_existe': muestras_archivo_no_existe,
            'errores_muestras': errores_muestras,
        })

    @action(detail=False, methods=['get'], url_path='pending_details')
    def pending_details(self, request):
        """
        Lista detallada de pendientes por razón.
        Query params:
          - repositorio: ID del repositorio (opcional)
          - reason: sin_archivo | archivo_no_existe | listo_para_iniciar (requerido)
          - limit: cantidad a retornar (default 50)
          - offset: desplazamiento (default 0)
        """
        reason = request.query_params.get('reason')
        if reason not in {'sin_archivo', 'archivo_no_existe', 'listo_para_iniciar'}:
            return Response({'error': 'reason inválido'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            limit = int(request.query_params.get('limit', 50))
            offset = int(request.query_params.get('offset', 0))
        except Exception:
            limit, offset = 50, 0

        qs = self.get_queryset().filter(estado_transcodificacion='PENDIENTE')
        repo_id = request.query_params.get('repositorio')
        if repo_id:
            qs = qs.filter(repositorio_id=repo_id)

        items = []

        if reason == 'sin_archivo':
            base = qs.filter(archivo_original__isnull=True) | qs.filter(archivo_original='')
            for b in base.order_by('-fecha_subida')[offset:offset+limit]:
                items.append({
                    'id': str(b.id),
                    'nombre': b.nombre_original,
                    'archivo': None,
                    'razon': 'Sin archivo original'
                })

        elif reason == 'archivo_no_existe' or reason == 'listo_para_iniciar':
            base = qs.exclude(archivo_original__isnull=True).exclude(archivo_original='')
            # Para evaluar presencia en filesystem, iteramos con margen amplio y aplicamos windowing manual
            matched = []
            skipped = 0
            for b in base.order_by('-fecha_subida'):
                try:
                    try:
                        file_path = b.archivo_original.path
                    except Exception:
                        file_path = os.path.join(settings.MEDIA_ROOT, str(b.archivo_original))
                    exists = os.path.exists(file_path)
                except Exception:
                    exists = False

                is_missing = not exists
                if reason == 'archivo_no_existe' and is_missing:
                    matched.append(b)
                if reason == 'listo_para_iniciar' and not is_missing:
                    matched.append(b)
                # apply offset/limit
                if len(matched) >= offset + limit:
                    break
            window = matched[offset:offset+limit]
            for b in window:
                items.append({
                    'id': str(b.id),
                    'nombre': b.nombre_original,
                    'archivo': str(b.archivo_original),
                    'razon': 'Archivo no existe' if reason == 'archivo_no_existe' else 'Listo para iniciar'
                })

        return Response({
            'count': len(items),
            'items': items
        })

    @action(detail=False, methods=['get'], url_path='sources_overview')
    def sources_overview(self, request):
        """
        Devuelve un resumen de la carpeta MEDIA_ROOT/sources para diagnóstico:
        - Existencia del directorio
        - Total de archivos de video detectados
        - Lista de subdirectorios con conteo y muestras de archivos
        """
        sources_path = os.path.join(settings.MEDIA_ROOT, 'sources')
        overview = {
            'media_root': str(settings.MEDIA_ROOT),
            'sources_path': sources_path,
            'exists': os.path.exists(sources_path),
            'files_total': 0,
            'dirs_total': 0,
            'dirs': [],
            'top_level_files': [],
            'top_level_count': 0,
        }

        if not overview['exists']:
            return Response(overview)

        VIDEO_EXTS = (
            '.mov', '.mp4', '.avi', '.mkv', '.mxf', '.m4v', '.webm', '.wmv', '.mpg', '.mpeg', '.mts'
        )

        # Top-level files in sources
        try:
            for sub in os.scandir(sources_path):
                if sub.is_file():
                    ext = os.path.splitext(sub.name)[1].lower()
                    if ext in VIDEO_EXTS or ext == '':
                        overview['top_level_files'].append(sub.name)
            overview['top_level_files'] = overview['top_level_files'][:50]
            overview['top_level_count'] = len(overview['top_level_files'])
        except Exception as e:
            logger.error(f"Error listando archivos top-level en sources: {e}")

        # Primer nivel de subdirectorios en sources
        try:
            for entry in os.scandir(sources_path):
                if entry.is_dir():
                    dir_info = {
                        'name': entry.name,
                        'relpath': os.path.relpath(entry.path, settings.MEDIA_ROOT),
                        'file_count': 0,
                        'sample_files': []
                    }
                    # Contar archivos de video dentro (no recursivo por ahora)
                    try:
                        for sub in os.scandir(entry.path):
                            if sub.is_file():
                                ext = os.path.splitext(sub.name)[1].lower()
                                if ext in VIDEO_EXTS or ext == '':
                                    dir_info['file_count'] += 1
                                    if len(dir_info['sample_files']) < 5:
                                        dir_info['sample_files'].append(sub.name)
                    except Exception as e:
                        logger.error(f"Error escaneando {entry.path}: {e}")
                    overview['dirs'].append(dir_info)
            overview['dirs_total'] = len(overview['dirs'])
            overview['files_total'] = sum(d['file_count'] for d in overview['dirs']) + overview['top_level_count']
        except Exception as e:
            logger.error(f"Error listando sources: {e}")

        return Response(overview)

    @action(detail=False, methods=['post'], url_path='delete-encoded')
    def delete_encoded_file(self, request):
        """
        Endpoint para eliminar un archivo codificado específico.
        Elimina el archivo del filesystem y lo remueve de la lista encoded_files.
        """
        broadcast_id = request.data.get('broadcast_id')
        filename = request.data.get('filename')
        
        if not broadcast_id or not filename:
            return Response(
                {'error': 'broadcast_id y filename son requeridos'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            broadcast = Broadcast.objects.get(id=broadcast_id)
        except Broadcast.DoesNotExist:
            return Response(
                {'error': 'Broadcast no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Buscar el archivo en la lista
        file_found = False
        if broadcast.encoded_files:
            for i, file_info in enumerate(broadcast.encoded_files):
                if file_info.get('filename') == filename:
                    file_found = True
                    file_path = os.path.join(settings.MEDIA_ROOT, file_info.get('path', ''))
                    
                    # Eliminar archivo físico si existe
                    if os.path.exists(file_path):
                        try:
                            os.remove(file_path)
                            logger.info(f"🗑️ File deleted: {file_path}")
                        except Exception as e:
                            logger.error(f"Error deleting physical file: {e}")
                    
                    # Remover de la lista
                    broadcast.encoded_files.pop(i)
                    broadcast.save()
                    
                    return Response({
                        'success': True,
                        'message': f'Archivo {filename} eliminado exitosamente'
                    }, status=status.HTTP_200_OK)
        
        if not file_found:
            return Response(
                {'error': 'Archivo no encontrado en la lista de codificados'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'], url_path='retry')
    def retry(self, request, pk=None):
        """Reintenta la transcodificación de un broadcast específico."""
        try:
            b = self.get_object()
            # Validar archivo original presente y existente
            if not b.archivo_original:
                return Response({'error': 'El broadcast no tiene archivo original asignado'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                file_path = b.archivo_original.path
            except Exception:
                file_path = os.path.join(settings.MEDIA_ROOT, str(b.archivo_original))
            if not os.path.exists(file_path):
                return Response({'error': f'Archivo original no existe en el filesystem: {b.archivo_original}'}, status=status.HTTP_400_BAD_REQUEST)

            # Limpiar error previo y poner en PROCESANDO
            b.last_error = ''
            b.estado_transcodificacion = 'PROCESANDO'
            b.save(update_fields=['last_error', 'estado_transcodificacion'])
            
            # Disparar tarea Celery
            transcode_video.delay(str(b.id))
            
            return Response({'status': 'queued', 'id': str(b.id)})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='retry_errors')
    def retry_errors(self, request):
        """
        Reintenta en lote todos los broadcasts en ERROR para un repositorio.
        Body: { repositorio_id }
        """
        repositorio_id = request.data.get('repositorio_id')
        if not repositorio_id:
            return Response({'error': 'repositorio_id es requerido'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            _ = Repositorio.objects.get(id=repositorio_id)
        except Repositorio.DoesNotExist:
            return Response({'error': 'Repositorio no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        # Respetar permisos del usuario a través de get_queryset
        qs = self.get_queryset().filter(repositorio_id=repositorio_id, estado_transcodificacion='ERROR')

        queued = 0
        skipped_no_file = 0
        for b in qs.iterator():
            # Validar archivo presente y existente
            if not b.archivo_original:
                skipped_no_file += 1
                continue
            try:
                file_path = b.archivo_original.path
            except Exception:
                file_path = os.path.join(settings.MEDIA_ROOT, str(b.archivo_original))
            if not os.path.exists(file_path):
                skipped_no_file += 1
                continue

            b.last_error = ''
            b.estado_transcodificacion = 'PROCESANDO'
            b.save(update_fields=['last_error', 'estado_transcodificacion'])
            
            # Disparar tarea Celery
            transcode_video.delay(str(b.id))
            queued += 1

        return Response({
            'success': True,
            'queued': queued,
            'skipped_no_file': skipped_no_file
        }, status=status.HTTP_202_ACCEPTED)
    
    @action(detail=False, methods=['post'], permission_classes=[IsAdminUser])
    def delete_all(self, request):
        """
        Elimina TODOS los registros de todos los tipos de contenido: Broadcast, Audio, ImageAsset y StorageAsset.
        Además elimina todos los Directorios y vacía las carpetas principales de media.
        Uso solo para pruebas / reseteo completo. Requiere superusuario.
        """
        if not request.user.is_superuser:
            return Response({'error': 'Solo los superusuarios pueden realizar esta acción.'}, status=status.HTTP_403_FORBIDDEN)
        
        import os
        import shutil
        from pathlib import Path
        from django.conf import settings
        
        deleted_files = 0
        errors = []
        
        # Contar antes de borrar
        broadcast_count = Broadcast.objects.count()
        audio_count = Audio.objects.count()
        image_count = ImageAsset.objects.count()
        storage_count = StorageAsset.objects.count()
        directorio_count = Directorio.objects.count()

        # Borrar en orden: contenido y luego directorios
        Broadcast.objects.all().delete()
        Audio.objects.all().delete()
        ImageAsset.objects.all().delete()
        StorageAsset.objects.all().delete()
        Directorio.objects.all().delete()
        
        # Now COMPLETELY EMPTY the media folders
        media_root = Path(settings.MEDIA_ROOT)
        subdirs = ['sources', 'thumbnails', 'pizarra', 'support', 'encoded', 'encoded_audio']
        
        for subdir in subdirs:
            subdir_path = media_root / subdir
            if subdir_path.exists():
                try:
                    # Count files before deletion
                    files_in_dir = list(subdir_path.rglob('*'))
                    file_count = sum(1 for f in files_in_dir if f.is_file())
                    
                    # Remove ALL contents of the directory
                    for item in subdir_path.iterdir():
                        try:
                            if item.is_file() or item.is_symlink():
                                item.unlink()
                                deleted_files += 1
                            elif item.is_dir():
                                # Skip .DS_Store and hidden folders but delete everything else
                                if not item.name.startswith('.'):
                                    shutil.rmtree(item)
                                    deleted_files += file_count  # Approximate
                        except Exception as e:
                            errors.append(f"Error deleting {item}: {str(e)}")
                    
                    logger.info(f"Limpiado directorio {subdir}: {file_count} archivos eliminados")
                    
                except Exception as e:
                    errors.append(f"Error cleaning directory {subdir}: {str(e)}")
        
        result = {
            'message': 'Se eliminó TODO el contenido y se vaciaron las carpetas de media.',
            'details': {
                'broadcasts': broadcast_count,
                'audios': audio_count,
                'images': image_count,
                'storage_files': storage_count,
                'directorios': directorio_count,
                'archivos_aproximados': deleted_files,
                'carpetas_vaciadas': subdirs,
                'errores': len(errors)
            }
        }
        
        if errors:
            result['errors'] = errors[:10]  # Solo primeros 10 errores
        
        return Response(result, status=status.HTTP_200_OK)


@api_view(['GET', 'POST'])
def shared_link_public(request, link_id):
    """
    Vista pública para acceder a un link compartido (sin autenticación)
    GET: Retorna la información del link y broadcast
    POST: Registra una reproducción (analytics)
    """
    # Buscar el link
    link = get_object_or_404(SharedLink, id=link_id)
    
    # Verificar que esté vigente
    if not link.esta_vigente():
        return Response(
            {'error': 'Este link ha expirado o está deshabilitado'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Verificar password si existe
    if link.password:
        provided_password = request.data.get('password') if request.method == 'POST' else request.query_params.get('password')
        if provided_password != link.password:
            return Response(
                {'error': 'Password incorrecto', 'requires_password': True},
                status=status.HTTP_401_UNAUTHORIZED
            )
    
    # Si es GET, incrementar vistas y retornar datos
    if request.method == 'GET':
        link.vistas += 1
        link.ultima_visita = timezone.now()
        link.save(update_fields=['vistas', 'ultima_visita'])
        
        serializer = SharedLinkPublicSerializer(link, context={'request': request})
        return Response(serializer.data)
    
    # Si es POST, registrar reproducción
    if request.method == 'POST':
        action_type = request.data.get('action')
        if action_type == 'play':
            link.reproducciones += 1
            link.save(update_fields=['reproducciones'])
            return Response({'success': True, 'reproducciones': link.reproducciones})
    
    return Response({'error': 'Método no permitido'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)


# Hacemos la vista pública accesible sin autenticación
shared_link_public.permission_classes = [AllowAny]


class AudioViewSet(viewsets.ModelViewSet):
    """ViewSet para archivos de audio, similar a BroadcastViewSet"""
    serializer_class = AudioSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['repositorio', 'estado_procesamiento', 'modulo', 'directorio']
    search_fields = ['nombre_original', 'metadata__titulo', 'metadata__artista']

    def get_queryset(self):
        """
        Filtrar audios según los permisos del usuario.
        """
        user = self.request.user
        
        # Para desarrollo: si no está autenticado, retornar todos (modo demo)
        if not user.is_authenticated:
            return Audio.objects.all().order_by('-fecha_subida')
        
        # Si es superuser o staff, puede ver todos los audios
        if user.is_superuser or user.is_staff:
            return Audio.objects.all().order_by('-fecha_subida')
        
        # Usuarios normales solo ven audios de sus repositorios asignados
        repositorios_ids = RepositorioPermiso.objects.filter(
            usuario=user,
            puede_ver=True
        ).values_list('repositorio_id', flat=True)
        return Audio.objects.filter(
            repositorio_id__in=repositorios_ids
        ).order_by('-fecha_subida')

    def create(self, request, *args, **kwargs):
        """
        Sobrescribimos el método create para manejar el upload de archivos
        y disparar la tarea de procesamiento de audio.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        extra = {}
        if request.user and request.user.is_authenticated:
            extra['creado_por'] = request.user
        audio = serializer.save(**extra)
        
        # Si hay un archivo original, disparar la tarea de procesamiento
        if audio.archivo_original:
            # Actualizar estado a PROCESANDO
            audio.estado_procesamiento = 'PROCESANDO'
            audio.save()
            
            # Disparar tarea Celery
            process_audio.delay(str(audio.id))
            logger.info(f"🎵 Audio {audio.id} queued for processing")
        
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def _delete_audio_files(self, audio):
        """Elimina archivos físicos asociados a un audio (original, MP3, thumbnails)."""
        archivos_a_eliminar = []

        # 1. Archivo original
        if audio.archivo_original:
            try:
                archivos_a_eliminar.append(audio.archivo_original.path)
                logger.info(f"  - Archivo original: {audio.archivo_original.path}")
            except Exception as e:
                logger.error(f"  - Error obteniendo path del original: {e}")

        # 2. Archivo MP3 (convertido)
        if getattr(audio, 'ruta_mp3', None):
            try:
                mp3_path = os.path.join(settings.MEDIA_ROOT, audio.ruta_mp3)
                archivos_a_eliminar.append(mp3_path)
                logger.info(f"  - Archivo MP3: {mp3_path}")
            except Exception as e:
                logger.error(f"  - Error obteniendo path del MP3: {e}")

        # 3. Thumbnail
        if getattr(audio, 'thumbnail', None):
            try:
                thumbnail_path = os.path.join(settings.MEDIA_ROOT, str(audio.thumbnail))
                archivos_a_eliminar.append(thumbnail_path)
                logger.info(f"  - Thumbnail: {thumbnail_path}")
            except Exception as e:
                logger.error(f"  - Error obteniendo path del thumbnail: {e}")

        # 4. Pizarra thumbnail
        if getattr(audio, 'pizarra_thumbnail', None):
            try:
                pizarra_path = os.path.join(settings.MEDIA_ROOT, str(audio.pizarra_thumbnail))
                archivos_a_eliminar.append(pizarra_path)
                logger.info(f"  - Pizarra thumbnail: {pizarra_path}")
            except Exception as e:
                logger.error(f"  - Error obteniendo path del pizarra: {e}")

        # Eliminar todos los archivos físicos
        for archivo_path in archivos_a_eliminar:
            try:
                if os.path.exists(archivo_path):
                    os.remove(archivo_path)
                    logger.info(f"  ✓ Eliminado: {archivo_path}")
                else:
                    logger.warning(f"  ⚠ Does not exist: {archivo_path}")
            except Exception as e:
                logger.error(f"  ✗ Error deleting {archivo_path}: {e}")

    def destroy(self, request, *args, **kwargs):
        """
        Override destroy method to delete all physical files
        associated with the audio before deleting from database.
        """
        audio = self.get_object()
        logger.info(f"🗑️  Deleting audio {audio.id}")
        self._delete_audio_files(audio)
        logger.info(f"  ✓ Database record deleted")
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='reprocess')
    def reprocess(self, request, pk=None):
        """Dispara nuevamente el procesamiento (encode) del audio."""
        try:
            audio = self.get_object()
            audio.estado_procesamiento = 'PROCESANDO'
            audio.save(update_fields=['estado_procesamiento'])
            
            # Disparar tarea Celery
            process_audio.delay(str(audio.id))
            
            return Response({'status': 'queued'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='encode')
    def encode_custom(self, request):
        """
        Endpoint para codificación personalizada de audios.
        Recibe la configuración de encoding y dispara una tarea Celery.
        """
        audio_id = request.data.get('audio_id')
        settings_data = request.data.get('settings', {})
        preset_id = request.data.get('preset_id', 'custom')
        
        if not audio_id:
            return Response({'error': 'audio_id es requerido'}, status=status.HTTP_400_BAD_REQUEST)

        from .models import Audio
        try:
            audio = Audio.objects.get(id=audio_id)
        except Audio.DoesNotExist:
            return Response({'error': 'Audio no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        if not audio.archivo_original:
            return Response({'error': 'El audio no tiene archivo original'}, status=status.HTTP_400_BAD_REQUEST)

        # Disparar tarea Celery con los settings
        from .tasks import encode_custom_audio
        encode_custom_audio.delay(audio_id=str(audio_id), encoding_settings=settings_data, preset_id=preset_id)

        logger.info(f"🎵 Codificación personalizada iniciada para audio {audio_id} con preset {preset_id}")
        return Response({'message': 'Codificación iniciada', 'audio_id': str(audio_id), 'preset': preset_id}, status=status.HTTP_202_ACCEPTED)


class SistemaInformacionViewSet(viewsets.ModelViewSet):
    """ViewSet para información del sistema (versiones y changelog)"""
    queryset = SistemaInformacion.objects.all()
    serializer_class = SistemaInformacionSerializer
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        """Obtener la versión actual del sistema"""
        current = SistemaInformacion.objects.filter(is_current=True).first()
        if not current:
            current = SistemaInformacion.objects.first()
        if current:
            serializer = self.get_serializer(current)
            return Response(serializer.data)
        return Response({'detail': 'No system information available'}, status=status.HTTP_404_NOT_FOUND)

# Hacemos la vista pública accesible sin autenticación
shared_link_public.permission_classes = [AllowAny]


class ImageAssetViewSet(viewsets.ModelViewSet):
    queryset = ImageAsset.objects.all().order_by('-fecha_subida')
    serializer_class = ImageAssetSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['repositorio', 'directorio', 'modulo', 'tipo_archivo', 'creado_por', 'estado']
    search_fields = ['nombre_original', 'metadata']
    ordering_fields = ['fecha_subida', 'nombre_original', 'tipo_archivo']
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        instance = serializer.save(creado_por=self.request.user)
        
        # Disparar tarea Celery
        process_image.delay(str(instance.id))
        logger.info(f"📸 Image {instance.id} queued for processing")
    
    def _delete_image_files(self, image):
        """Delete physical files associated with an image (original, web, thumbnail)."""
        import os
        from django.conf import settings
        
        archivos_a_eliminar = []

        # 1. Archivo original (sources/)
        if image.archivo_original:
            try:
                archivos_a_eliminar.append(image.archivo_original.path)
                logger.info(f"  - Archivo original: {image.archivo_original.path}")
            except Exception as e:
                logger.error(f"  - Error obteniendo path del original: {e}")

        # 2. Imagen web (support/)
        if image.imagen_web:
            try:
                archivos_a_eliminar.append(image.imagen_web.path)
                logger.info(f"  - Imagen web: {image.imagen_web.path}")
            except Exception as e:
                logger.error(f"  - Error obteniendo path de imagen web: {e}")

        # 3. Thumbnail (thumbnails/)
        if image.thumbnail:
            try:
                archivos_a_eliminar.append(image.thumbnail.path)
                logger.info(f"  - Thumbnail: {image.thumbnail.path}")
            except Exception as e:
                logger.error(f"  - Error obteniendo path del thumbnail: {e}")

        # Eliminar todos los archivos físicos
        for archivo_path in archivos_a_eliminar:
            try:
                if os.path.exists(archivo_path):
                    os.remove(archivo_path)
                    logger.info(f"  ✓ Deleted: {archivo_path}")
                else:
                    logger.warning(f"  ⚠ Does not exist: {archivo_path}")
            except Exception as e:
                logger.error(f"  ✗ Error deleting {archivo_path}: {e}")

    def destroy(self, request, *args, **kwargs):
        """
        Override destroy method to delete all physical files
        associated with the image before deleting from database.
        """
        image = self.get_object()
        logger.info(f"🗑️  Deleting image {image.id} - {image.nombre_original}")
        self._delete_image_files(image)
        # Finally, delete the database record
        logger.info(f"  ✓ Database record deleted")
        return super().destroy(request, *args, **kwargs)
