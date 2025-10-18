import json
from django.contrib.auth.hashers import make_password
from rest_framework import serializers
from .models import Repositorio, Agencia, Broadcast, CustomUser, SharedLink, Directorio, RepositorioPermiso, Modulo, Perfil

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
    
    class Meta:
        model = RepositorioPermiso
        fields = ['id', 'usuario', 'repositorio', 'repositorio_nombre', 'repositorio_folio', 
                  'puede_ver', 'puede_editar', 'puede_borrar']

class RepositorioSerializer(serializers.ModelSerializer):
    modulos_detalle = ModuloSerializer(source='modulos', many=True, read_only=True)
    modulos_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Modulo.objects.all(),
        source='modulos',
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Repositorio
        fields = ['id', 'nombre', 'folio', 'clave', 'activo', 'fecha_creacion', 'modulos', 'modulos_detalle', 'modulos_ids']
        read_only_fields = ['folio', 'fecha_creacion']

class DirectorioSerializer(serializers.ModelSerializer):
    repositorio_nombre = serializers.CharField(source='repositorio.nombre', read_only=True)
    broadcasts_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Directorio
        fields = ['id', 'nombre', 'repositorio', 'repositorio_nombre', 'modulo', 'parent', 'fecha_creacion', 'broadcasts_count']
    
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
            'fecha_subida'
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

class UserSerializer(serializers.ModelSerializer):
    # Hacemos la contraseña de solo escritura
    password = serializers.CharField(write_only=True, required=False)
    repositorios = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Repositorio.objects.all(), required=False
    )

    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'nombre_compania', 'is_active', 'password', 'repositorios']

    def create(self, validated_data):
        # Encriptamos la contraseña al crear un nuevo usuario
        validated_data['password'] = make_password(validated_data.get('password'))
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Encriptamos la contraseña si se está actualizando
        if 'password' in validated_data:
            validated_data['password'] = make_password(validated_data.get('password'))
        return super().update(instance, validated_data)


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
    
    class Meta:
        model = CustomUser
        fields = [
            'id', 
            'username', 
            'email', 
            'password',
            'perfil',
            'perfil_info',
            'nombre_completo', 
            'compania', 
            'telefono', 
            'is_active',
            'is_superuser',
            'date_joined',
            'permisos_repositorios'
        ]
        read_only_fields = ['id', 'date_joined']
    
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
    
    def create(self, validated_data):
        password = validated_data.pop('password', None)
        
        user = CustomUser(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
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
