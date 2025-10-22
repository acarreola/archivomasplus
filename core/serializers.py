import json
from django.contrib.auth.hashers import make_password
from rest_framework import serializers
from .models import Repositorio, Agencia, Broadcast, Audio, CustomUser, SharedLink, Directorio, RepositorioPermiso, Modulo, Perfil, SistemaInformacion

class PerfilSerializer(serializers.ModelSerializer):
    class Meta:
        model = Perfil
        fields = '__all__'

class ModuloSerializer(serializers.ModelSerializer):
    class Meta:
        model = Modulo
        fields = ['id', 'nombre', 'tipo', 'descripcion', 'formatos_permitidos', 'activo']

class RepositorioPermisoSerializer(serializers.ModelSerializer):
    repositorio_nombre = serializers.CharField(source='repositorio.nombre', read_only=True)
    repositorio_folio = serializers.CharField(source='repositorio.folio', read_only=True)
    modulos_permitidos = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Modulo.objects.all(),
        required=False
    )
    modulos_permitidos_detalle = ModuloSerializer(source='modulos_permitidos', many=True, read_only=True)
    
    class Meta:
        model = RepositorioPermiso
        fields = ['id', 'usuario', 'repositorio', 'repositorio_nombre', 'repositorio_folio', 
                  'puede_ver', 'puede_editar', 'puede_borrar', 'modulos_permitidos', 'modulos_permitidos_detalle']

class RepositorioSerializer(serializers.ModelSerializer):
    modulos_detalle = ModuloSerializer(source='modulos', many=True, read_only=True)
    modulos_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Modulo.objects.all(),
        source='modulos',
        write_only=True,
        required=False
    )
    # Lista de usuarios asignados al repositorio (crea RepositorioPermiso)
    users_asignados = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=CustomUser.objects.all(),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Repositorio
        fields = ['id', 'nombre', 'folio', 'position', 'clave', 'activo', 'fecha_creacion', 'modulos', 'modulos_detalle', 'modulos_ids', 'users_asignados']
        read_only_fields = ['fecha_creacion', 'folio']  # Folio is auto-generated

    def validate_clave(self, value):
        """Validate key is exactly 4 uppercase letters"""
        if not value:
            raise serializers.ValidationError('Key (clave) is required.')
        val = str(value).strip().upper()
        if len(val) != 4 or not val.isalpha():
            raise serializers.ValidationError('Key must be exactly 4 uppercase letters (A-Z).')
        return val

    def to_internal_value(self, data):
        # Uppercase normalization for clave
        if 'clave' in data and data['clave']:
            data = {**data, 'clave': str(data['clave']).strip().upper()}
        # Remove folio from input - it's auto-generated
        if 'folio' in data:
            data = {**data}
            data.pop('folio', None)
        return super().to_internal_value(data)

    def create(self, validated_data):
        # Extraer campos especiales
        users = validated_data.pop('users_asignados', []) if 'users_asignados' in validated_data else []
        modulos = validated_data.pop('modulos', []) if 'modulos' in validated_data else []

        # Crear repositorio
        repo = Repositorio.objects.create(**validated_data)
        if modulos:
            repo.modulos.set(modulos)

        # Crear permisos para usuarios asignados (puede_ver=True por defecto)
        for user in users:
            permiso, _ = RepositorioPermiso.objects.get_or_create(usuario=user, repositorio=repo)
            permiso.puede_ver = True
            permiso.save()
            # Si definimos módulos del repo, asignarlos como permitidos por defecto
            if modulos:
                permiso.modulos_permitidos.set(modulos)

        return repo

    def update(self, instance, validated_data):
        users = validated_data.pop('users_asignados', None)
        modulos = validated_data.pop('modulos', None)

        # Actualizar campos simples
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Actualizar módulos del repositorio si fueron enviados
        if modulos is not None:
            instance.modulos.set(modulos)
            # Opcional: actualizar módulos_permitidos para todos los permisos a los del repo
            for permiso in instance.permisos_usuario.all():
                permiso.modulos_permitidos.set(modulos)

        # Sincronizar usuarios asignados si fue enviado el campo
        if users is not None:
            current_user_ids = set(instance.permisos_usuario.values_list('usuario_id', flat=True))
            new_user_ids = set([u.id if isinstance(u, CustomUser) else int(u) for u in users])
            # Crear permisos faltantes
            to_add = new_user_ids - current_user_ids
            for uid in to_add:
                permiso, _ = RepositorioPermiso.objects.get_or_create(usuario_id=uid, repositorio=instance)
                permiso.puede_ver = True
                permiso.save()
                if modulos is not None:
                    permiso.modulos_permitidos.set(modulos)
            # Eliminar permisos de usuarios removidos
            to_remove = current_user_ids - new_user_ids
            if to_remove:
                RepositorioPermiso.objects.filter(repositorio=instance, usuario_id__in=to_remove).delete()

        return instance

class DirectorioSerializer(serializers.ModelSerializer):
    repositorio_nombre = serializers.CharField(source='repositorio.nombre', read_only=True)
    broadcasts_count = serializers.SerializerMethodField()
    id_dir = serializers.CharField(read_only=True)
    
    class Meta:
        model = Directorio
        fields = ['id', 'nombre', 'repositorio', 'repositorio_nombre', 'modulo', 'parent', 'id_dir', 'fecha_creacion', 'broadcasts_count']
    
    def get_broadcasts_count(self, obj):
        return obj.broadcasts.count()

class AgenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Agencia
        fields = '__all__'

class BroadcastSerializer(serializers.ModelSerializer):
    repositorio_nombre = serializers.CharField(source='repositorio.nombre', read_only=True)
    repositorio_folio = serializers.CharField(source='repositorio.folio', read_only=True)
    repositorio_clave = serializers.CharField(source='repositorio.clave', read_only=True)
    directorio_nombre = serializers.CharField(source='directorio.nombre', read_only=True, allow_null=True)
    modulo_info = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    pizarra_thumbnail_url = serializers.SerializerMethodField()
    file_size = serializers.SerializerMethodField()
    creado_por_username = serializers.CharField(source='creado_por.username', read_only=True)
    status_display = serializers.SerializerMethodField()
    last_error = serializers.CharField(read_only=True)
    
    class Meta:
        model = Broadcast
        fields = [
            'id', 
            'repositorio', 
            'repositorio_nombre',
            'repositorio_folio',
            'repositorio_clave',
            'directorio',
            'directorio_nombre',
            'modulo',
            'modulo_info',
            'archivo_original',
            'nombre_original',
            'file_size',
            'ruta_proxy',
            'ruta_h264',
            'encoded_files',
            'thumbnail',
            'thumbnail_url',
            'pizarra_thumbnail',
            'pizarra_thumbnail_url',
            'estado_transcodificacion', 
            'pizarra', 
            'fecha_subida',
            'creado_por',
            'creado_por_username',
            'status_display',
            'last_error'
        ]
    
    def get_modulo_info(self, obj):
        """Retorna info del módulo si existe"""
        if obj.modulo:
            return {
                'id': obj.modulo.id,
                'nombre': obj.modulo.nombre,
                'tipo': obj.modulo.tipo
            }
        return None
    
    def get_file_size(self, obj):
        """Retorna el tamaño del archivo original en bytes"""
        if obj.archivo_original:
            try:
                return obj.archivo_original.size
            except (OSError, AttributeError):
                return None
        return None

    def get_status_display(self, obj):
        # Map to human-friendly status for CSV "Status"
        mapping = {
            'PENDIENTE': 'Pending',
            'PROCESANDO': 'Processing',
            'COMPLETADO': 'Completed',
            'ERROR': 'Error'
        }
        return mapping.get(obj.estado_transcodificacion, obj.estado_transcodificacion)
    
    def get_thumbnail_url(self, obj):
        """Retorna la URL completa del thumbnail principal si existe"""
        if obj.thumbnail:
            request = self.context.get('request')
            # Si thumbnail es un string (ruta relativa)
            if isinstance(obj.thumbnail, str):
                thumbnail_path = f'/media/{obj.thumbnail}'
                if request:
                    return request.build_absolute_uri(thumbnail_path)
                return thumbnail_path
            # Si es un ImageField con .url
            if hasattr(obj.thumbnail, 'url'):
                if request:
                    return request.build_absolute_uri(obj.thumbnail.url)
                return obj.thumbnail.url
        return None
    
    def get_pizarra_thumbnail_url(self, obj):
        """Retorna la URL completa del pizarra thumbnail si existe"""
        if obj.pizarra_thumbnail:
            request = self.context.get('request')
            # Si pizarra_thumbnail es un string (ruta relativa)
            if isinstance(obj.pizarra_thumbnail, str):
                pizarra_path = f'/media/{obj.pizarra_thumbnail}'
                if request:
                    return request.build_absolute_uri(pizarra_path)
                return pizarra_path
            # Si es un ImageField con .url
            if hasattr(obj.pizarra_thumbnail, 'url'):
                if request:
                    return request.build_absolute_uri(obj.pizarra_thumbnail.url)
                return obj.pizarra_thumbnail.url
        return None

    def create(self, validated_data):
        # Parseamos el string JSON de la pizarra a un diccionario de Python
        pizarra_str = validated_data.pop('pizarra', '{}')
        try:
            # Si ya es un dict, usarlo directamente; si es string, parsearlo
            if isinstance(pizarra_str, dict):
                pizarra_data = pizarra_str
            else:
                pizarra_data = json.loads(pizarra_str)
        except (json.JSONDecodeError, TypeError):
            pizarra_data = {}
        
        # Asignamos el diccionario al campo JSONField del modelo
        validated_data['pizarra'] = pizarra_data
        
        # Save original filename
        archivo = validated_data.get('archivo_original')
        if archivo and hasattr(archivo, 'name'):
            validated_data['nombre_original'] = archivo.name
        
        broadcast = Broadcast.objects.create(**validated_data)
        return broadcast
    
    def update(self, instance, validated_data):
        # If pizarra comes as string, parse it
        if 'pizarra' in validated_data:
            pizarra_str = validated_data.pop('pizarra')
            try:
                pizarra_data = json.loads(pizarra_str) if isinstance(pizarra_str, str) else pizarra_str
                instance.pizarra = pizarra_data
            except json.JSONDecodeError:
                pass
        
        # Update other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance
    
    def to_representation(self, instance):
        """
        Override this method to ensure pizarra is serialized correctly.
        """
        representation = super().to_representation(instance)
        # Pizarra is already a dict in the model, no parsing needed
        if hasattr(instance, 'pizarra') and instance.pizarra:
            representation['pizarra'] = instance.pizarra
        return representation

class AudioSerializer(serializers.ModelSerializer):
    """Serializer para archivos de audio, similar a BroadcastSerializer"""
    repositorio_nombre = serializers.CharField(source='repositorio.nombre', read_only=True)
    repositorio_folio = serializers.CharField(source='repositorio.folio', read_only=True)
    repositorio_clave = serializers.CharField(source='repositorio.clave', read_only=True)
    directorio_nombre = serializers.CharField(source='directorio.nombre', read_only=True, allow_null=True)
    modulo_info = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    pizarra_thumbnail_url = serializers.SerializerMethodField()
    file_size = serializers.SerializerMethodField()
    creado_por_username = serializers.CharField(source='creado_por.username', read_only=True)
    status_display = serializers.SerializerMethodField()
    
    class Meta:
        model = Audio
        fields = [
            'id', 
            'repositorio', 
            'repositorio_nombre',
            'repositorio_folio',
            'repositorio_clave',
            'directorio',
            'directorio_nombre',
            'modulo',
            'modulo_info',
            'archivo_original',
            'nombre_original',
            'file_size',
            'ruta_mp3',
            'thumbnail',
            'thumbnail_url',
            'pizarra_thumbnail',
            'pizarra_thumbnail_url',
            'estado_procesamiento', 
            'metadata', 
            'fecha_subida',
            'creado_por',
            'creado_por_username',
            'status_display'
        ]
    
    def get_modulo_info(self, obj):
        """Retorna info del módulo si existe"""
        if obj.modulo:
            return {
                'id': obj.modulo.id,
                'nombre': obj.modulo.nombre,
                'tipo': obj.modulo.tipo
            }
        return None
    
    def get_file_size(self, obj):
        """Retorna el tamaño del archivo original en bytes"""
        if obj.archivo_original:
            try:
                return obj.archivo_original.size
            except (OSError, AttributeError):
                return None
        return None

    def get_status_display(self, obj):
        mapping = {
            'PENDIENTE': 'Pending',
            'PROCESANDO': 'Processing',
            'COMPLETADO': 'Completed',
            'ERROR': 'Error'
        }
        return mapping.get(obj.estado_procesamiento, obj.estado_procesamiento)
    
    def get_thumbnail_url(self, obj):
        """Retorna la URL completa del thumbnail si existe"""
        if obj.thumbnail:
            request = self.context.get('request')
            if isinstance(obj.thumbnail, str):
                thumbnail_path = f'/media/{obj.thumbnail}'
                if request:
                    return request.build_absolute_uri(thumbnail_path)
                return thumbnail_path
            if hasattr(obj.thumbnail, 'url'):
                if request:
                    return request.build_absolute_uri(obj.thumbnail.url)
                return obj.thumbnail.url
        return None
    
    def get_pizarra_thumbnail_url(self, obj):
        """Retorna la URL completa del pizarra thumbnail si existe"""
        if obj.pizarra_thumbnail:
            request = self.context.get('request')
            if isinstance(obj.pizarra_thumbnail, str):
                pizarra_path = f'/media/{obj.pizarra_thumbnail}'
                if request:
                    return request.build_absolute_uri(pizarra_path)
                return pizarra_path
            if hasattr(obj.pizarra_thumbnail, 'url'):
                if request:
                    return request.build_absolute_uri(obj.pizarra_thumbnail.url)
                return obj.pizarra_thumbnail.url
        return None

    def create(self, validated_data):
        # Parseamos metadata si viene como string
        metadata_str = validated_data.pop('metadata', '{}')
        try:
            if isinstance(metadata_str, dict):
                metadata_data = metadata_str
            else:
                metadata_data = json.loads(metadata_str)
        except (json.JSONDecodeError, TypeError):
            metadata_data = {}
        
        validated_data['metadata'] = metadata_data
        
        # Save original filename
        archivo = validated_data.get('archivo_original')
        if archivo and hasattr(archivo, 'name'):
            validated_data['nombre_original'] = archivo.name
        
        audio = Audio.objects.create(**validated_data)
        return audio
    
    def update(self, instance, validated_data):
        # If metadata comes as string, parse it
        if 'metadata' in validated_data:
            metadata_str = validated_data.pop('metadata')
            try:
                metadata_data = json.loads(metadata_str) if isinstance(metadata_str, str) else metadata_str
                instance.metadata = metadata_data
            except json.JSONDecodeError:
                pass
        
        # Update other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance
    
    def to_representation(self, instance):
        """Override to ensure metadata is serialized correctly"""
        representation = super().to_representation(instance)
        if hasattr(instance, 'metadata') and instance.metadata:
            representation['metadata'] = instance.metadata
        return representation

class SharedLinkSerializer(serializers.ModelSerializer):
    """Serializer to create and manage shared links"""
    broadcast_data = BroadcastSerializer(source='broadcast', read_only=True)
    creado_por_username = serializers.CharField(source='creado_por.username', read_only=True)
    url = serializers.SerializerMethodField()
    esta_vigente = serializers.SerializerMethodField()
    
    class Meta:
        model = SharedLink
        fields = [
            'id', 'broadcast', 'broadcast_data', 'titulo', 'password', 
            'fecha_expiracion', 'permitir_descarga', 'activo',
            'vistas', 'reproducciones', 'ultima_visita',
            'creado_por', 'creado_por_username', 'fecha_creacion',
            'url', 'esta_vigente'
        ]
        read_only_fields = ['id', 'vistas', 'reproducciones', 'ultima_visita', 'fecha_creacion']
    
    def get_url(self, obj):
        """Generate the full URL of the shared link"""
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(f'/shared/{obj.id}')
        return f'/shared/{obj.id}'
    
    def get_esta_vigente(self, obj):
        """Indicates if the link is valid"""
        return obj.esta_vigente()


class SharedLinkPublicSerializer(serializers.ModelSerializer):
    """Serializer for public access (without exposing sensitive data)"""
    broadcast_data = serializers.SerializerMethodField()
    
    class Meta:
        model = SharedLink
        fields = ['id', 'titulo', 'broadcast_data', 'permitir_descarga', 'fecha_creacion']
    
    def get_broadcast_data(self, obj):
        """Returns only necessary broadcast metadata"""
        broadcast = obj.broadcast
        request = self.context.get('request')
        
        # URL of proxy or original for playback
        video_url = None
        if broadcast.ruta_proxy:
            video_url = request.build_absolute_uri(f'/media/{broadcast.ruta_proxy}') if request else f'/media/{broadcast.ruta_proxy}'
        elif broadcast.archivo_original:
            video_url = request.build_absolute_uri(broadcast.archivo_original.url) if request else broadcast.archivo_original.url
        
        # Thumbnail URL
        thumbnail_url = None
        if broadcast.thumbnail:
            thumbnail_url = request.build_absolute_uri(broadcast.thumbnail.url) if request else broadcast.thumbnail.url
        
        return {
            'id': str(broadcast.id),
            'video_url': video_url,
            'thumbnail_url': thumbnail_url,
            'pizarra': broadcast.pizarra,
            'repositorio_nombre': broadcast.repositorio.nombre,
            'fecha_subida': broadcast.fecha_subida
        }

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    permisos_repositorios = serializers.SerializerMethodField()
    perfil_info = PerfilSerializer(source='perfil', read_only=True)
    tipo = serializers.SerializerMethodField()  # Para compatibilidad con frontend
    
    class Meta:
        model = CustomUser
        fields = [
            'id', 
            'email',  # Campo principal de login
            'password',
            'perfil',
            'perfil_info',
            'nombre_completo',
            'compania', 
            'telefono', 
            'is_active',
            'is_superuser',
            'date_joined',
            'permisos_repositorios',
            'tipo'  # Para compatibilidad
        ]
        read_only_fields = ['id', 'date_joined']
    
    def get_tipo(self, obj):
        """Devuelve el tipo basado en el perfil para compatibilidad con frontend"""
        if obj.is_superuser:
            return 'administrador'
        if obj.perfil:
            clave = obj.perfil.clave.lower()
            # Map profile keys to frontend expected values
            if clave in ['admin', 'administrador']:
                return 'administrador'
            elif clave in ['operador', 'operator']:
                return 'operador'
            else:
                return 'cliente'
        return 'cliente'
    
    def get_permisos_repositorios(self, obj):
        permisos = RepositorioPermiso.objects.filter(usuario=obj).select_related('repositorio')
        return [{
            'id': p.id,
            'repositorio_id': p.repositorio.id,
            'repositorio_nombre': p.repositorio.nombre,
            'repositorio_folio': p.repositorio.folio,
            'puede_ver': p.puede_ver,
            'puede_editar': p.puede_editar,
            'puede_borrar': p.puede_borrar
        } for p in permisos]
    
    def validate_email(self, value):
        """Validar que el email sea único (excepto para el mismo usuario)"""
        user_id = self.instance.id if self.instance else None
        if CustomUser.objects.filter(email=value).exclude(id=user_id).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value
    
    def create(self, validated_data):
        password = validated_data.pop('password', None)
        
        # El email es obligatorio
        if not validated_data.get('email'):
            raise serializers.ValidationError({'email': 'Email is required.'})
        
        # nombre_completo es obligatorio
        if not validated_data.get('nombre_completo'):
            raise serializers.ValidationError({'nombre_completo': 'Full name is required.'})
        
        user = CustomUser(**validated_data)
        if password:
            user.set_password(password)
        else:
            raise serializers.ValidationError({'password': 'Password is required for new users.'})
        
        user.save()
        return user
    
    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        if password:
            instance.set_password(password)
        
        instance.save()
        return instance


class SistemaInformacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = SistemaInformacion
        fields = ['id', 'version', 'release_date', 'updates', 'fecha_creacion', 'is_current']
        read_only_fields = ['fecha_creacion']
