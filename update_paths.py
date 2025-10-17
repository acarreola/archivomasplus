#!/usr/bin/env python
"""Script para actualizar rutas de archivos en la base de datos"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'archivoplus_backend.settings')
django.setup()

from core.models import Comercial

# Actualizar rutas de archivo_original
count_original = 0
for comercial in Comercial.objects.all():
    if comercial.archivo_original and 'originals/' in str(comercial.archivo_original):
        old_path = str(comercial.archivo_original)
        new_path = old_path.replace('originals/', 'sources/')
        comercial.archivo_original = new_path
        comercial.save(update_fields=['archivo_original'])
        count_original += 1

print(f"✅ Actualizados {count_original} archivos originales: originals → sources")

# Actualizar rutas de transcodificados
count_h264 = 0
count_h265 = 0
for comercial in Comercial.objects.all():
    updated = False
    if comercial.ruta_h264 and 'transcoded/' in comercial.ruta_h264:
        comercial.ruta_h264 = comercial.ruta_h264.replace('transcoded/', 'support/')
        count_h264 += 1
        updated = True
    if comercial.ruta_proxy and 'transcoded/' in comercial.ruta_proxy:
        comercial.ruta_proxy = comercial.ruta_proxy.replace('transcoded/', 'support/')
        count_h265 += 1
        updated = True
    if updated:
        comercial.save()

print(f"✅ Actualizados {count_h264} archivos H.264: transcoded → support")
print(f"✅ Actualizados {count_h265} archivos H.265: transcoded → support")
print("\n🎉 Migración de rutas completada exitosamente!")
