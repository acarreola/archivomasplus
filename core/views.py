import os
import logging
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from .models import Repositorio, Agencia, Broadcast, CustomUser, SharedLink, Directorio, RepositorioPermiso, Modulo, Perfil
from .serializers import (
    RepositorioSerializer, AgenciaSerializer, BroadcastSerializer, 
    UserSerializer, SharedLinkSerializer, SharedLinkPublicSerializer, DirectorioSerializer,
    RepositorioPermisoSerializer, ModuloSerializer, PerfilSerializer
)
from .tasks import transcode_video

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """Login de usuarios"""
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not username or not password:
        return Response({
            'success': False,
            'message': 'Usuario y contraseña requeridos'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    user = authenticate(request, username=username, password=password)
    
    if user is not None:
        if not user.is_active:
            return Response({
                'success': False,
                'message': 'Usuario desactivado'
            }, status=status.HTTP_403_FORBIDDEN)
        
        login(request, user)
        serializer = UserSerializer(user)
        return Response({
            'success': True,
            'message': 'Login exitoso',
            'user': serializer.data
        })
    else:
        return Response({
            'success': False,
            'message': 'Credenciales inválidas'
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
        # Validar que no exista un broadcast con el mismo nombre_original
        nombre_original = request.data.get('nombre_original')
        if nombre_original:
            # Buscar si ya existe un broadcast con este nombre
            existing = Broadcast.objects.filter(nombre_original=nombre_original).first()
            if existing:
                return Response(
                    {
                        'error': 'duplicate_file',
                        'message': f'El archivo "{nombre_original}" ya fue cargado anteriormente.'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        broadcast = serializer.save()
        
        # Si hay un archivo original, disparar la tarea de transcodificación
        if broadcast.archivo_original:
            # Actualizar estado a PROCESANDO
            broadcast.estado_transcodificacion = 'PROCESANDO'
            broadcast.save()
            
            # Disparar tarea Celery asíncrona
            transcode_video.delay(str(broadcast.id))
        
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def destroy(self, request, *args, **kwargs):
        """
        Sobrescribimos el método destroy para eliminar todos los archivos físicos
        asociados al broadcast antes de eliminarlo de la base de datos.
        """
        broadcast = self.get_object()
        
        logger.info(f"🗑️  Eliminando broadcast {broadcast.id}")
        
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
        if broadcast.ruta_h264:
            try:
                h264_path = os.path.join(settings.MEDIA_ROOT, broadcast.ruta_h264)
                archivos_a_eliminar.append(h264_path)
                logger.info(f"  - Archivo H.264: {h264_path}")
            except Exception as e:
                logger.error(f"  - Error obteniendo path del H.264: {e}")
        
        # 3. Archivo proxy/H.265 (transcodificado)
        if broadcast.ruta_proxy:
            try:
                proxy_path = os.path.join(settings.MEDIA_ROOT, broadcast.ruta_proxy)
                archivos_a_eliminar.append(proxy_path)
                logger.info(f"  - Archivo proxy (H.265): {proxy_path}")
            except Exception as e:
                logger.error(f"  - Error obteniendo path del proxy: {e}")
        
        # 4. Thumbnail principal
        if broadcast.thumbnail:
            try:
                # thumbnail es un string con la ruta relativa
                thumbnail_path = os.path.join(settings.MEDIA_ROOT, str(broadcast.thumbnail))
                archivos_a_eliminar.append(thumbnail_path)
                logger.info(f"  - Thumbnail: {thumbnail_path}")
            except Exception as e:
                logger.error(f"  - Error obteniendo path del thumbnail: {e}")
        
        # 5. Pizarra thumbnail
        if broadcast.pizarra_thumbnail:
            try:
                # pizarra_thumbnail es un string con la ruta relativa
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
        
        # Finalmente, eliminar el registro de la base de datos
        logger.info(f"  ✓ Registro eliminado de la base de datos")
        return super().destroy(request, *args, **kwargs)
    
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


class SharedLinkViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar links compartidos (requiere autenticación)"""
    serializer_class = SharedLinkSerializer
    
    def get_queryset(self):
        """
        Usuarios normales solo ven sus propios links
        Admins ven todos
        """
        user = self.request.user
        
        if not user.is_authenticated:
            return SharedLink.objects.none()
        
        if user.is_superuser or user.is_staff:
            return SharedLink.objects.all()
        
        return SharedLink.objects.filter(creado_por=user)
    
    def perform_create(self, serializer):
        """Asignar el usuario actual como creador"""
        serializer.save(creado_por=self.request.user)
    
    @action(detail=False, methods=['get'], url_path='by-broadcast/(?P<broadcast_id>[^/.]+)')
    def by_broadcast(self, request, broadcast_id=None):
        """Get all links for a specific broadcast"""
        links = self.get_queryset().filter(broadcast_id=broadcast_id)
        serializer = self.get_serializer(links, many=True)
        return Response(serializer.data)


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