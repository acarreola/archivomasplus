from django.db import migrations


def seed_defaults(apps, schema_editor):
    Modulo = apps.get_model('core', 'Modulo')
    Perfil = apps.get_model('core', 'Perfil')
    User = apps.get_model('core', 'CustomUser')

    # Seed Modulos if none exist
    if not Modulo.objects.exists():
        modulos = [
            {
                'nombre': 'Storage',
                'tipo': 'storage',
                'descripcion': 'Almacenamiento general sin restricciones',
                'formatos_permitidos': [],
                'activo': True,
            },
            {
                'nombre': 'Reel',
                'tipo': 'reel',
                'descripcion': 'Reel - Solo H.264',
                'formatos_permitidos': ['.mp4', '.mov'],
                'activo': True,
            },
            {
                'nombre': 'Broadcast',
                'tipo': 'broadcast',
                'descripcion': 'Broadcast - Solo Masters',
                'formatos_permitidos': ['.mxf', '.mov', '.mp4'],
                'activo': True,
            },
            {
                'nombre': 'Audio',
                'tipo': 'audio',
                'descripcion': 'Audio - Solo audio',
                'formatos_permitidos': ['.wav', '.aif', '.aiff', '.mp3', '.m4a', '.aac'],
                'activo': True,
            },
            {
                'nombre': 'Images',
                'tipo': 'images',
                'descripcion': 'Images - Solo imágenes',
                'formatos_permitidos': ['.png', '.jpg', '.jpeg', '.webp'],
                'activo': True,
            },
        ]
        for m in modulos:
            Modulo.objects.create(**m)

    # Seed Perfiles if none exist
    if not Perfil.objects.exists():
        admin = Perfil.objects.create(
            clave='admin', nombre='Administrador', descripcion='Acceso total', color='#5fbf00', activo=True,
            puede_acceder_administracion=True,
            puede_gestionar_repositorios=True,
            puede_gestionar_usuarios=True,
            puede_gestionar_configuracion=True,
            puede_crear_directorio=True,
            puede_actualizar_directorio=True,
            puede_borrar_directorio=True,
            puede_subir_archivo=True,
            puede_actualizar_archivo=True,
            puede_borrar_archivo=True,
            puede_descargar=True,
            puede_mover_archivos=True,
            puede_compartir=True,
            puede_comentar=True,
            puede_guardar_coleccion=True,
        )

        operador = Perfil.objects.create(
            clave='operador', nombre='Operador', descripcion='Operación de contenidos', color='#3b82f6', activo=True,
            puede_acceder_administracion=False,
            puede_gestionar_repositorios=False,
            puede_gestionar_usuarios=False,
            puede_gestionar_configuracion=False,
            puede_crear_directorio=True,
            puede_actualizar_directorio=True,
            puede_borrar_directorio=False,
            puede_subir_archivo=True,
            puede_actualizar_archivo=True,
            puede_borrar_archivo=False,
            puede_descargar=True,
            puede_mover_archivos=True,
            puede_compartir=True,
            puede_comentar=True,
            puede_guardar_coleccion=True,
        )

        cliente = Perfil.objects.create(
            clave='cliente', nombre='Cliente', descripcion='Acceso de cliente', color='#9ca3af', activo=True,
            puede_acceder_administracion=False,
            puede_gestionar_repositorios=False,
            puede_gestionar_usuarios=False,
            puede_gestionar_configuracion=False,
            puede_crear_directorio=False,
            puede_actualizar_directorio=False,
            puede_borrar_directorio=False,
            puede_subir_archivo=False,
            puede_actualizar_archivo=False,
            puede_borrar_archivo=False,
            puede_descargar=True,
            puede_mover_archivos=False,
            puede_compartir=False,
            puede_comentar=True,
            puede_guardar_coleccion=True,
        )

        # Attach admin perfil to superusers with no perfil set
        for u in User.objects.filter(is_superuser=True, perfil__isnull=True):
            u.perfil = admin
            u.save(update_fields=['perfil'])


def unseed_defaults(apps, schema_editor):
    # No destructive rollback; leave seeded data in place
    pass


class Migration(migrations.Migration):
    dependencies = [
        ('core', '0025_audio_model'),
    ]

    operations = [
        migrations.RunPython(seed_defaults, unseed_defaults),
    ]
