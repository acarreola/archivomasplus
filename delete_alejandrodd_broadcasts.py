#!/usr/bin/env python
"""
Script para eliminar todos los broadcasts del repositorio AlejandroDD
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'archivoplus_backend.settings')
django.setup()

from core.models import Repositorio, Broadcast

def delete_alejandrodd_broadcasts():
    try:
        # Buscar el repositorio por nombre
        repo = Repositorio.objects.get(nombre='AlejandroDD')
        print(f"✓ Repositorio encontrado: {repo.nombre} (ID: {repo.id}, Folio: {repo.folio})")
        
        # Obtener todos los broadcasts de este repositorio
        broadcasts = Broadcast.objects.filter(repositorio=repo)
        count = broadcasts.count()
        
        print(f"\n📊 Total de broadcasts a eliminar: {count}")
        
        if count == 0:
            print("✓ No hay broadcasts para eliminar")
            return
        
        # Confirmar
        print("\n⚠️  Se eliminarán los siguientes broadcasts:")
        for i, b in enumerate(broadcasts[:10], 1):  # Mostrar solo los primeros 10
            print(f"  {i}. {b.nombre_original or 'Sin nombre'} - {b.id}")
        
        if count > 10:
            print(f"  ... y {count - 10} más")
        
        # Eliminar
        print("\n🗑️  Eliminando broadcasts...")
        deleted_count = 0
        for broadcast in broadcasts:
            # Eliminar archivos físicos
            if broadcast.archivo_original:
                try:
                    if os.path.exists(broadcast.archivo_original.path):
                        os.remove(broadcast.archivo_original.path)
                        print(f"  ✓ Eliminado archivo: {broadcast.archivo_original.path}")
                except Exception as e:
                    print(f"  ⚠️  Error eliminando archivo: {e}")
            
            # Eliminar thumbnails
            if broadcast.thumbnail:
                try:
                    thumbnail_path = os.path.join('/app/media', str(broadcast.thumbnail))
                    if os.path.exists(thumbnail_path):
                        os.remove(thumbnail_path)
                except Exception as e:
                    print(f"  ⚠️  Error eliminando thumbnail: {e}")
            
            # Eliminar el broadcast de la BD
            broadcast.delete()
            deleted_count += 1
        
        print(f"\n✅ {deleted_count} broadcasts eliminados exitosamente")
        
    except Repositorio.DoesNotExist:
        print("❌ Error: Repositorio 'AlejandroDD' no encontrado")
        print("\nRepositorios disponibles:")
        for repo in Repositorio.objects.all():
            print(f"  - {repo.nombre} (Folio: {repo.folio})")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    delete_alejandrodd_broadcasts()
