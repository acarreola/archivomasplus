# core/models.py
import uuid
import os
import random
import string
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone

def get_short_uuid():
    """Genera un UUID corto de 8 caracteres"""
    return str(uuid.uuid4())[:8]

def upload_to_originals(instance, filename):
    """Genera ruta para archivos sources (originales) con UUID corto"""
    ext = os.path.splitext(filename)[1]
    short_id = str(instance.id)[:8] if instance.id else get_short_uuid()
    return f'sources/{short_id}{ext}'

class Modulo(models.Model):
    """Módulos/Particiones del sistema (Storage, Reel, Broadcast, Audio, Images)"""
    TIPOS_MODULO = [
        ('storage', 'Storage - Sin restricciones'),
        ('reel', 'Reel - Solo H.264'),
        ('broadcast', 'Broadcast - Solo Masters'),
        ('audio', 'Audio - Solo Audio'),
        ('images', 'Images - Solo Imágenes'),
    ]
    
    nombre = models.CharField(max_length=50, unique=True, help_text="Nombre del módulo")
    tipo = models.CharField(max_length=20, choices=TIPOS_MODULO, unique=True, help_text="Tipo de módulo")
    descripcion = models.TextField(blank=True, help_text="Descripción del módulo y sus restricciones")
    formatos_permitidos = models.JSONField(default=list, blank=True, help_text="Lista de extensiones permitidas (ej: ['.mp4', '.mov'])")
    activo = models.BooleanField(default=True, help_text="Módulo activo")
    
    class Meta:
        verbose_name = "Módulo"
        verbose_name_plural = "Módulos"
        ordering = ['nombre']
    
    def __str__(self):
        return f"{self.nombre} ({self.get_tipo_display()})"

class Perfil(models.Model):
    """Perfiles/Roles del sistema con permisos granulares"""
    clave = models.CharField(max_length=50, unique=True, verbose_name="Clave del Perfil", help_text="ID único del perfil (ej: admin, operador, cliente)")
    nombre = models.CharField(max_length=100, verbose_name="Nombre del Perfil")
    descripcion = models.TextField(blank=True, verbose_name="Descripción")
    color = models.CharField(max_length=7, default='#5fbf00', help_text="Color en hexadecimal (ej: #5fbf00)")
    activo = models.BooleanField(default=True, verbose_name="Activo")
    
    # Permisos de Administración
    puede_acceder_administracion = models.BooleanField(default=False, verbose_name="Acceder a Administración")
    puede_gestionar_repositorios = models.BooleanField(default=False, verbose_name="Gestionar Repositorios")
    puede_gestionar_usuarios = models.BooleanField(default=False, verbose_name="Gestionar Usuarios")
    puede_gestionar_configuracion = models.BooleanField(default=False, verbose_name="Gestionar Configuración")
    
    # Permisos de Archivos/Comerciales
    puede_crear_directorio = models.BooleanField(default=False, verbose_name="Crear Directorios")
    puede_actualizar_directorio = models.BooleanField(default=False, verbose_name="Actualizar Directorios")
    puede_borrar_directorio = models.BooleanField(default=False, verbose_name="Borrar Directorios")
    puede_subir_archivo = models.BooleanField(default=False, verbose_name="Subir Archivos")
    puede_actualizar_archivo = models.BooleanField(default=False, verbose_name="Actualizar Archivos")
    puede_borrar_archivo = models.BooleanField(default=False, verbose_name="Borrar Archivos")
    puede_descargar = models.BooleanField(default=True, verbose_name="Descargar Archivos")
    puede_mover_archivos = models.BooleanField(default=False, verbose_name="Mover Archivos")
    puede_compartir = models.BooleanField(default=False, verbose_name="Compartir con Privilegios")
    puede_comentar = models.BooleanField(default=False, verbose_name="Comentar")
    puede_guardar_coleccion = models.BooleanField(default=False, verbose_name="Guardar Colecciones")
    
    class Meta:
        verbose_name = "Perfil"
        verbose_name_plural = "Perfiles"
        ordering = ['nombre']
    
    def __str__(self):
        return self.nombre

class Repositorio(models.Model):
    nombre = models.CharField(max_length=255, unique=True, help_text="Nombre del cliente o proyecto")
    folio = models.CharField(max_length=50, unique=True, help_text="Folio autogenerado del repositorio (~15-20 caracteres)")
    position = models.PositiveIntegerField(default=0, help_text="Posición/orden del repositorio en el tablero")
    clave = models.CharField(max_length=4, help_text="Clave/Key de exactamente 4 letras mayúsculas (A-Z)")
    activo = models.BooleanField(default=True, help_text="Repositorio activo o inactivo")
    modulos = models.ManyToManyField(Modulo, blank=True, related_name='repositorios', help_text="Módulos asignados a este repositorio")
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.folio} - {self.nombre}"

    def _generate_folio(self) -> str:
        """Genera un folio único de aprox 15-20 caracteres"""
        import time
        timestamp = str(int(time.time() * 1000))[-10:]  # 10 dígitos del timestamp en milisegundos
        random_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        candidate = f"{timestamp}-{random_part}"  # Formato: 1234567890-ABCD1234 (19 chars)
        
        # Verificar que sea único
        counter = 0
        while Repositorio.objects.filter(folio=candidate).exists() and counter < 100:
            random_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
            candidate = f"{timestamp}-{random_part}"
            counter += 1
        
        return candidate

    def save(self, *args, **kwargs):
        # Auto-generar folio si no existe
        if not self.folio:
            self.folio = self._generate_folio()
        
        # Normalizar clave a exactamente 4 letras mayúsculas
        if self.clave:
            self.clave = str(self.clave).strip().upper()[:4]
            # Rellenar con 'X' si es menor a 4
            if len(self.clave) < 4:
                self.clave = self.clave.ljust(4, 'X')
        
        super().save(*args, **kwargs)

class CustomUser(AbstractUser):
    # Email como identificador principal (requerido y único)
    email = models.EmailField(unique=True, verbose_name="Email")
    username = models.CharField(max_length=150, blank=True, null=True, verbose_name="Username (opcional)")
    
    # Campos de perfil
    perfil = models.ForeignKey(Perfil, on_delete=models.SET_NULL, null=True, blank=True, related_name='usuarios', verbose_name="Perfil/Rol")
    nombre_completo = models.CharField(max_length=255, blank=True, verbose_name="Full Name")
    compania = models.CharField(max_length=255, blank=True, verbose_name="Company")
    telefono = models.CharField(max_length=20, blank=True, verbose_name="Phone")
    
    # Configurar email como el campo de autenticación
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['nombre_completo']  # Requeridos además de email y password
    
    class Meta:
        verbose_name = "Usuario"
        verbose_name_plural = "Usuarios"
    
    def __str__(self):
        return f"{self.nombre_completo or self.email}"
    
    def save(self, *args, **kwargs):
        # Si no hay username, usar el email
        if not self.username:
            self.username = self.email
        super().save(*args, **kwargs)
    
    def tiene_permiso(self, permiso):
        """Verifica si el usuario tiene un permiso específico según su perfil"""
        if self.is_superuser:
            return True
        if not self.perfil or not self.perfil.activo:
            return False
        return getattr(self.perfil, permiso, False)

class RepositorioPermiso(models.Model):
    """Granular user permissions on repository"""
    usuario = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='permisos_repositorio')
    repositorio = models.ForeignKey(Repositorio, on_delete=models.CASCADE, related_name='permisos_usuario')
    puede_ver = models.BooleanField(default=True, help_text="Can view repository content")
    puede_editar = models.BooleanField(default=False, help_text="Can edit broadcasts")
    puede_borrar = models.BooleanField(default=False, help_text="Can delete broadcasts")
    # Conjunto de módulos del repositorio que el usuario puede usar
    modulos_permitidos = models.ManyToManyField(Modulo, blank=True, related_name='permisos_repositorio', help_text="Módulos habilitados para este usuario en este repositorio")
    
    class Meta:
        unique_together = [['usuario', 'repositorio']]
        verbose_name = "Permiso de Repositorio"
        verbose_name_plural = "Permisos de Repositorio"
    
    def __str__(self):
        return f"{self.usuario.username} - {self.repositorio.nombre}"

class Agencia(models.Model):
    nombre = models.CharField(max_length=255, unique=True, help_text="Nombre de la agencia de publicidad")
    def __str__(self):
        return self.nombre

class Directorio(models.Model):
    """Carpetas/folders para organizar comerciales dentro de un repositorio"""
    nombre = models.CharField(max_length=255, help_text="Nombre del directorio/folder")
    repositorio = models.ForeignKey(Repositorio, on_delete=models.CASCADE, related_name='directorios')
    modulo = models.ForeignKey(Modulo, on_delete=models.CASCADE, null=True, blank=True, related_name='directorios', help_text="Módulo al que pertenece este directorio")
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='subdirectorios', help_text="Directorio padre (para estructura jerárquica)")
    id_dir = models.CharField(max_length=15, blank=True, null=True, db_index=True, help_text="Folio único del directorio (ej: DIR-mnopq)")
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = [['nombre', 'repositorio', 'modulo', 'parent']]
        ordering = ['nombre']
    
    def __str__(self):
        return f"{self.repositorio.nombre}/{self.nombre}"

class Broadcast(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    repositorio = models.ForeignKey(Repositorio, on_delete=models.CASCADE, related_name='broadcasts')
    directorio = models.ForeignKey(Directorio, on_delete=models.SET_NULL, null=True, blank=True, related_name='broadcasts', help_text="Directory/folder where the broadcast is located")
    modulo = models.ForeignKey(Modulo, on_delete=models.SET_NULL, null=True, blank=True, related_name='broadcasts', help_text="Module this file belongs to (Storage, Reel, Broadcast, Audio, Images)")
    creado_por = models.ForeignKey('CustomUser', on_delete=models.SET_NULL, null=True, blank=True, related_name='broadcasts_creados', help_text="Usuario que registró/subió el broadcast")
    
    archivo_original = models.FileField(upload_to=upload_to_originals, max_length=512, blank=True, null=True, help_text="Original master file uploaded by user")
    nombre_original = models.CharField(max_length=512, blank=True, null=True, help_text="Original filename uploaded")
    
    ruta_proxy = models.CharField(max_length=1024, blank=True, null=True, help_text="Path to transcoded H.265 proxy file")
    ruta_h264 = models.CharField(max_length=1024, blank=True, null=True, help_text="Path to transcoded H.264 file")
    encoded_files = models.JSONField(default=list, blank=True, help_text="List of custom encoded files with their metadata")
    
    thumbnail = models.ImageField(upload_to='thumbnails/', blank=True, null=True, help_text="Main thumbnail (frame at 07:03) to display in frontend")
    pizarra_thumbnail = models.ImageField(upload_to='pizarra/', blank=True, null=True, help_text="Slate thumbnail (frame at 00:02) for edit view")

    ESTADO_CHOICES = [
        ('PENDIENTE', 'Pending'), 
        ('PROCESANDO', 'Processing'), 
        ('COMPLETADO', 'Completed'), 
        ('ERROR', 'Error')
    ]
    estado_transcodificacion = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='PENDIENTE')
    
    id_content = models.CharField(max_length=15, blank=True, null=True, db_index=True, help_text="Folio único del contenido (ej: CNT-asdfg)")
    pizarra = models.JSONField(default=dict, blank=True, help_text="Flexible broadcast metadata (product, version, etc.)")

    fecha_subida = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        # Try to get product from pizarra, with fallback if it doesn't exist
        producto = self.pizarra.get('producto', 'N/A')
        return f"{producto} ({self.repositorio.nombre})"


class SharedLink(models.Model):
    """
    Shareable links to access broadcasts without authentication.
    Similar to Wiredrive/MediaValet share links.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    broadcast = models.ForeignKey(Broadcast, on_delete=models.CASCADE, related_name='shared_links')
    
    titulo = models.CharField(max_length=255, blank=True, help_text="Descriptive title of the shared link")
    password = models.CharField(max_length=128, blank=True, null=True, help_text="Optional password to access")
    fecha_expiracion = models.DateTimeField(blank=True, null=True, help_text="Link expiration date")
    
    permitir_descarga = models.BooleanField(default=True, help_text="Allow video download")
    activo = models.BooleanField(default=True, help_text="Link active or disabled")
    
    # Analytics
    vistas = models.IntegerField(default=0, help_text="Number of times viewed")
    reproducciones = models.IntegerField(default=0, help_text="Number of times played")
    ultima_visita = models.DateTimeField(blank=True, null=True, help_text="Last time the link was accessed")
    
    # Metadata
    creado_por = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, related_name='links_creados')
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-fecha_creacion']
    
    def __str__(self):
        return f"{self.titulo or self.broadcast} - {self.id}"
    
    def esta_vigente(self):
        """Verifies if the link is valid (active and not expired)"""
        if not self.activo:
            return False
        if self.fecha_expiracion:
            return timezone.now() < self.fecha_expiracion
        return True


class SistemaInformacion(models.Model):
    """Información del sistema: versión, changelog, release history"""
    version = models.CharField(max_length=50, unique=True, help_text="Número de versión (e.g., 1.0.0)")
    release_date = models.CharField(max_length=100, help_text="Fecha de lanzamiento (e.g., October 2025)")
    updates = models.TextField(help_text="Notas de actualización (una línea por cambio)")
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    is_current = models.BooleanField(default=False, help_text="Es la versión actual del sistema")
    
    class Meta:
        verbose_name = "Información del Sistema"
        verbose_name_plural = "Información del Sistema"
        ordering = ['-fecha_creacion']
    
    def __str__(self):
        return f"v{self.version} - {self.release_date}"
    
    def save(self, *args, **kwargs):
        """Si se marca como current, desmarcar las demás"""
        if self.is_current:
            SistemaInformacion.objects.filter(is_current=True).update(is_current=False)
        super().save(*args, **kwargs)
