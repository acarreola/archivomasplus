#!/usr/bin/env python
"""
Script para listar archivos en /media/sources/ y broadcasts sin archivo
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'archivoplus_backend.settings')
django.setup()

from core.models import Repositorio, Broadcast
from django.conf import settings

def list_sources_and_broadcasts():
    sources_path = os.path.join(settings.MEDIA_ROOT, 'sources')
    
    print("=" * 80)
    print("📁 ARCHIVOS EN /media/sources/")
    print("=" * 80)
    
    if not os.path.exists(sources_path):
        print(f"❌ El directorio {sources_path} no existe")
        return
    
    video_files = []
    for root, dirs, files in os.walk(sources_path):
        for filename in files:
            if filename.lower().endswith(('.mov', '.mp4', '.avi', '.mkv', '.mxf', '.m4v')):
                file_path = os.path.join(root, filename)
                size_mb = os.path.getsize(file_path) / (1024 * 1024)
                video_files.append({
                    'filename': filename,
                    'path': file_path,
                    'size_mb': size_mb
                })
    
    print(f"\n✓ Total de archivos de video encontrados: {len(video_files)}\n")
    
    for i, file_info in enumerate(video_files[:20], 1):
        print(f"{i}. {file_info['filename']}")
        print(f"   Tamaño: {file_info['size_mb']:.2f} MB")
        print(f"   Ruta: {file_info['path']}")
        print()
    
    if len(video_files) > 20:
        print(f"... y {len(video_files) - 20} archivos más\n")
    
    print("\n" + "=" * 80)
    print("📊 BROADCASTS SIN ARCHIVO ORIGINAL (por repositorio)")
    print("=" * 80)
    
    for repo in Repositorio.objects.all():
        broadcasts_sin_archivo = Broadcast.objects.filter(
            repositorio=repo
        ).filter(
            archivo_original__isnull=True
        ) | Broadcast.objects.filter(
            repositorio=repo,
            archivo_original=''
        )
        
        count = broadcasts_sin_archivo.count()
        
        if count > 0:
            print(f"\n🏢 {repo.nombre} (Folio: {repo.folio})")
            print(f"   Broadcasts sin archivo: {count}")
            print(f"   Ejemplos:")
            
            for i, b in enumerate(broadcasts_sin_archivo[:5], 1):
                print(f"     {i}. {b.nombre_original or 'Sin nombre'}")
                print(f"        ID: {b.id}")
                print(f"        Estado: {b.estado_transcodificacion}")
            
            if count > 5:
                print(f"     ... y {count - 5} más")
    
    print("\n" + "=" * 80)

if __name__ == '__main__':
    list_sources_and_broadcasts()
