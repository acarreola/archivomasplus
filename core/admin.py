# core/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, Repositorio, Agencia, Broadcast, SharedLink, RepositorioPermiso, Modulo, Perfil

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

admin.site.register(CustomUser, CustomUserAdmin)
admin.site.register(Modulo, ModuloAdmin)
admin.site.register(Repositorio, RepositorioAdmin)
admin.site.register(Agencia)
admin.site.register(Broadcast, BroadcastAdmin)
admin.site.register(SharedLink, SharedLinkAdmin)
admin.site.register(RepositorioPermiso, RepositorioPermisoAdmin)
