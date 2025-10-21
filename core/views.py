import os
import logging
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAdminUser
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from .models import Repositorio, Agencia, Broadcast, CustomUser, SharedLink, Directorio, RepositorioPermiso, Modulo, Perfil, SistemaInformacion
from .serializers import (
    RepositorioSerializer, AgenciaSerializer, BroadcastSerializer, 
    UserSerializer, SharedLinkSerializer, SharedLinkPublicSerializer, DirectorioSerializer,
    RepositorioPermisoSerializer, ModuloSerializer, PerfilSerializer, SistemaInformacionSerializer
)
from .tasks import transcode_video

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """Login de usuarios - usa email como username"""
    # Accept both 'email' and 'username' for backwards compatibility
    email = request.data.get('email') or request.data.get('username')
    password = request.data.get('password')
    
    if not email or not password:
        return Response({
            'success': False,
            'message': 'Email and password are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Authenticate using email (EmailBackend will handle this)
    user = authenticate(request, username=email, password=password)
    
    if user is not None:
        if not user.is_active:
            return Response({
                'success': False,
                'message': 'User account is disabled'
            }, status=status.HTTP_403_FORBIDDEN)
        
        login(request, user)
        serializer = UserSerializer(user)
        return Response({
            'success': True,
            'message': 'Login successful',
            'user': serializer.data
        })
    else:
        return Response({
            'success': False,
            'message': 'Invalid credentials'
        }, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
def logout_view(request):
    """Logout de usuarios"""
    logout(request)
    return Response({
        'success': True,
        'message': 'Logout exitoso'
    })

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
        
        return user.repositorios.all()

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
    search_fields = ['pizarra__producto', 'pizarra__version']

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
        repositorios_ids = user.repositorios.values_list('id', flat=True)
        return Broadcast.objects.filter(
            repositorio_id__in=repositorios_ids
        ).order_by('-fecha_subida')

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
                    logger.warning(f"  ⚠ No existe: {archivo_path}")
            except Exception as e:
                logger.error(f"  ✗ Error al eliminar {archivo_path}: {e}")

    def destroy(self, request, *args, **kwargs):
        """
        Sobrescribimos el método destroy para eliminar todos los archivos físicos
        asociados al broadcast antes de eliminarlo de la base de datos.
        """
        broadcast = self.get_object()
        logger.info(f"🗑️  Eliminando broadcast {broadcast.id}")
        self._delete_broadcast_files(broadcast)
        # Finalmente, eliminar el registro de la base de datos
        logger.info(f"  ✓ Registro eliminado de la base de datos")
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
    
    @action(detail=False, methods=['post'], url_path='encode')
    def encode_custom(self, request):
        """
        Endpoint para codificación personalizada de videos.
        Recibe la configuración de encoding y dispara una tarea Celery.
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
    
    @action(detail=False, methods=['post'], url_path='cancel_stuck_processes')
    def cancel_stuck_processes(self, request):
        """
        Cancela todos los procesos de encoding atascados.
        Marca como FALLIDO todos los broadcasts que están en PROCESANDO.
        """
        from datetime import timedelta
        
        # Obtener broadcasts en PROCESANDO que llevan más de 1 hora
        time_threshold = timezone.now() - timedelta(hours=1)
        stuck_broadcasts = Broadcast.objects.filter(
            estado_transcodificacion='PROCESANDO',
            fecha_subida__lt=time_threshold
        )
        
        count = stuck_broadcasts.count()
        
        if count == 0:
            return Response({
                'message': 'No stuck processes found',
                'updated_count': 0
            })
        
        # Actualizar a FALLIDO
        stuck_broadcasts.update(estado_transcodificacion='FALLIDO')
        
        logger.info(f"🛑 {count} broadcasts stuck in PROCESANDO marked as FALLIDO")
        
        return Response({
            'message': f'{count} stuck processes cancelled',
            'updated_count': count
        })
    
    @action(detail=False, methods=['post'], url_path='cancel_all_processing')
    def cancel_all_processing(self, request):
        """
        Cancela TODOS los procesos en PROCESANDO sin importar el tiempo.
        Útil para cancelar manualmente procesos que se quedaron atascados.
        """
        # Obtener TODOS los broadcasts en PROCESANDO
        processing_broadcasts = Broadcast.objects.filter(
            estado_transcodificacion='PROCESANDO'
        )
        
        count = processing_broadcasts.count()
        
        if count == 0:
            return Response({
                'message': 'No processing broadcasts found',
                'updated_count': 0
            })
        
        # Actualizar a FALLIDO
        processing_broadcasts.update(estado_transcodificacion='FALLIDO')
        
        logger.info(f"🛑 {count} broadcasts in PROCESANDO manually cancelled and marked as FALLIDO")
        
        return Response({
            'message': f'{count} processes cancelled',
            'updated_count': count
        })
    
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
                
                logger.info(f"🎬 Transcodificación iniciada: {broadcast.nombre_original}")
                
            except Exception as e:
                logger.error(f"Error al iniciar transcodificación: {e}")
        
        return Response({
            'success': True,
            'repositorio': repositorio.nombre,
            'total_initiated': len(initiated),
            'broadcasts': initiated[:50]  # Primeros 50
        }, status=status.HTTP_202_ACCEPTED)

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
                            logger.info(f"🗑️ Archivo eliminado: {file_path}")
                        except Exception as e:
                            logger.error(f"Error al eliminar archivo físico: {e}")
                    
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
    
    @action(detail=False, methods=['post'], permission_classes=[IsAdminUser])
    def delete_all(self, request):
        """
        Deletes all Broadcast records. For testing purposes only.
        """
        if not request.user.is_superuser:
            return Response({'error': 'Solo los superusuarios pueden realizar esta acción.'}, status=status.HTTP_403_FORBIDDEN)
            
        count, _ = Broadcast.objects.all().delete()
        return Response({'message': f'Se eliminaron {count} registros de Broadcasts.'}, status=status.HTTP_200_OK)


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