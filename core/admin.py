# core/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, Repositorio, Agencia, Broadcast, Audio, SharedLink, RepositorioPermiso, Modulo, Perfil, ImageAsset, StorageAsset, ProcessingError, EncodingPreset

@admin.register(Perfil)
class PerfilAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'clave', 'color', 'activo', 'puede_acceder_administracion')
    list_filter = ('activo', 'puede_acceder_administracion')
    fieldsets = (
        ('Información Básica', {
            'fields': ('clave', 'nombre', 'descripcion', 'color', 'activo')
        }),
        ('Permisos de Administración', {
            'fields': ('puede_acceder_administracion', 'puede_gestionar_repositorios', 
                      'puede_gestionar_usuarios', 'puede_gestionar_configuracion')
        }),
        ('Permisos de Archivos', {
            'fields': ('puede_crear_directorio', 'puede_actualizar_directorio', 'puede_borrar_directorio',
                      'puede_subir_archivo', 'puede_actualizar_archivo', 'puede_borrar_archivo',
                      'puede_descargar', 'puede_mover_archivos', 'puede_compartir', 
                      'puede_comentar', 'puede_guardar_coleccion')
        }),
    )

class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ('Información Adicional', {'fields': ('perfil', 'nombre_completo', 'compania', 'telefono')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Información Adicional', {'fields': ('perfil', 'nombre_completo', 'compania', 'telefono')}),
    )
    list_display = ('username', 'email', 'nombre_completo', 'perfil', 'compania', 'is_staff', 'is_active')

class ModuloAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'tipo', 'activo')
    list_filter = ('tipo', 'activo')

class RepositorioAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'folio', 'clave', 'activo', 'fecha_creacion')
    readonly_fields = ('folio',)
    list_filter = ('activo',)
    filter_horizontal = ('modulos',)

class BroadcastAdmin(admin.ModelAdmin):
    # Show fields derived from pizarra along with new fields
    list_display = ('p_producto', 'p_version', 'repositorio', 'estado_transcodificacion', 'fecha_subida')
    list_filter = ('repositorio', 'estado_transcodificacion', 'fecha_subida')
    search_fields = ('pizarra__producto', 'pizarra__version')

    def p_producto(self, obj):
        return obj.pizarra.get('producto', '') if obj.pizarra else ''
    p_producto.short_description = 'Product'

    def p_version(self, obj):
        return obj.pizarra.get('version', '') if obj.pizarra else ''
    p_version.short_description = 'Version'

class AudioAdmin(admin.ModelAdmin):
    """Admin para archivos de audio"""
    list_display = ('nombre_original', 'repositorio', 'estado_procesamiento', 'fecha_subida')
    list_filter = ('repositorio', 'estado_procesamiento', 'fecha_subida')
    search_fields = ('nombre_original', 'metadata__titulo', 'metadata__artista')
    readonly_fields = ('id', 'fecha_subida', 'ruta_mp3')

class SharedLinkAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'broadcast', 'activo', 'vistas', 'reproducciones', 'fecha_expiracion', 'creado_por', 'fecha_creacion')
    list_filter = ('activo', 'fecha_creacion', 'fecha_expiracion')
    search_fields = ('titulo', 'broadcast__pizarra__producto')
    readonly_fields = ('id', 'vistas', 'reproducciones', 'ultima_visita', 'fecha_creacion')
    
    def get_readonly_fields(self, request, obj=None):
        if obj:  # If object already exists
            return self.readonly_fields + ('broadcast', 'creado_por')
        return self.readonly_fields

class RepositorioPermisoAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'repositorio', 'puede_ver', 'puede_editar', 'puede_borrar')
    list_filter = ('puede_ver', 'puede_editar', 'puede_borrar')
    search_fields = ('usuario__username', 'repositorio__nombre')

class ImageAssetAdmin(admin.ModelAdmin):
    """Admin para archivos de imagen"""
    list_display = ('nombre_original', 'tipo_archivo', 'repositorio', 'estado', 'fecha_subida')
    list_filter = ('repositorio', 'estado', 'tipo_archivo', 'fecha_subida')
    search_fields = ('nombre_original', 'metadata__titulo')
    readonly_fields = ('id', 'fecha_subida')

@admin.register(StorageAsset)
class StorageAssetAdmin(admin.ModelAdmin):
    list_display = ('nombre_original', 'tipo_archivo', 'repositorio', 'estado', 'file_size', 'fecha_subida')
    list_filter = ('repositorio', 'estado', 'tipo_archivo', 'fecha_subida')
    search_fields = ('nombre_original',)
    readonly_fields = ('id', 'fecha_subida')

admin.site.register(CustomUser, CustomUserAdmin)
admin.site.register(Modulo, ModuloAdmin)
admin.site.register(Repositorio, RepositorioAdmin)
admin.site.register(Agencia)
admin.site.register(Broadcast, BroadcastAdmin)
admin.site.register(Audio, AudioAdmin)
admin.site.register(SharedLink, SharedLinkAdmin)
admin.site.register(RepositorioPermiso, RepositorioPermisoAdmin)
admin.site.register(ImageAsset, ImageAssetAdmin)


@admin.register(ProcessingError)
class ProcessingErrorAdmin(admin.ModelAdmin):
    list_display = ('file_name', 'stage', 'repositorio', 'modulo', 'directorio', 'fecha_creacion', 'resolved')
    list_filter = ('stage', 'repositorio', 'modulo', 'resolved', 'fecha_creacion')
    search_fields = ('file_name', 'error_message')
    readonly_fields = ('fecha_creacion',)


@admin.register(EncodingPreset)
class EncodingPresetAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'categoria', 'creado_por', 'es_global', 'activo', 'veces_usado', 'fecha_creacion')
    list_filter = ('categoria', 'es_global', 'activo', 'fecha_creacion')
    search_fields = ('nombre', 'descripcion')
    readonly_fields = ('fecha_creacion', 'fecha_modificacion', 'veces_usado')
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('nombre', 'descripcion', 'categoria')
        }),
        ('Configuración FFmpeg', {
            'fields': ('settings',),
            'description': 'JSON con la configuración de FFmpeg (formato, codec, bitrate, etc.)'
        }),
        ('Control de Acceso', {
            'fields': ('creado_por', 'es_global', 'activo')
        }),
        ('Estadísticas', {
            'fields': ('veces_usado', 'fecha_creacion', 'fecha_modificacion'),
            'classes': ('collapse',)
        }),
    )
