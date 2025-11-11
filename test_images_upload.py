#!/usr/bin/env python
"""
Script de prueba para subir una imagen al módulo Images
Genera una imagen de prueba y la sube via API
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, '/Users/acarreola/Sites/archivoplus')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'archivoplus_backend.settings')
django.setup()

from core.models import ImageAsset, Repositorio, Modulo, CustomUser
from PIL import Image, ImageDraw, ImageFont
from io import BytesIO
from django.core.files.uploadedfile import SimpleUploadedFile

def create_test_image(width=3000, height=2000, format='PNG'):
    """Crea una imagen de prueba con texto"""
    # Crear imagen con gradiente
    img = Image.new('RGB', (width, height))
    draw = ImageDraw.Draw(img)
    
    # Gradiente de fondo
    for y in range(height):
        r = int(255 * (y / height))
        g = int(128 * (1 - y / height))
        b = 200
        draw.rectangle([(0, y), (width, y+1)], fill=(r, g, b))
    
    # Texto
    try:
        # Intentar usar una fuente del sistema
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", size=120)
    except:
        font = ImageFont.load_default()
    
    text = f"Test Image {width}x{height}"
    # Usar textbbox para obtener dimensiones del texto
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    x = (width - text_width) / 2
    y = (height - text_height) / 2
    
    # Sombra
    draw.text((x+5, y+5), text, font=font, fill=(0, 0, 0))
    # Texto
    draw.text((x, y), text, font=font, fill=(255, 255, 255))
    
    # Convertir a bytes
    buffer = BytesIO()
    img.save(buffer, format=format)
    buffer.seek(0)
    
    return buffer.getvalue()

def main():
    print("🎨 Script de prueba - Módulo Images")
    print("=" * 60)
    
    # 1. Verificar repositorio activo
    repo = Repositorio.objects.filter(activo=True).first()
    if not repo:
        print("❌ No hay repositorios activos")
        return
    
    print(f"✅ Repositorio: {repo.folio} - {repo.nombre}")
    
    # 2. Buscar módulo de tipo 'images'
    modulo = Modulo.objects.filter(tipo='images').first()
    if not modulo:
        print("⚠️ No hay módulo de tipo 'images', creando uno...")
        modulo = Modulo.objects.create(
            nombre='Images',
            tipo='images',
            descripcion='Módulo para almacenamiento de imágenes (JPG, PNG, TIFF, PSD, etc.)',
            formatos_permitidos=['.jpg', '.jpeg', '.png', '.tiff', '.tif', '.psd']
        )
        # Agregar módulo al repositorio
        repo.modulos.add(modulo)
    
    print(f"✅ Módulo: {modulo.nombre} (tipo: {modulo.tipo})")
    
    # 3. Obtener usuario
    user = CustomUser.objects.filter(is_superuser=True).first()
    if not user:
        user = CustomUser.objects.first()
    
    print(f"✅ Usuario: {user.username if user else 'Sin usuario'}")
    
    # 4. Crear imágenes de prueba
    test_cases = [
        ('test_png_large.png', 3000, 2000, 'PNG'),
        ('test_png_rgba.png', 1500, 1500, 'PNG'),  # Con alpha
        ('test_jpg_small.jpg', 800, 600, 'JPEG'),
    ]
    
    for filename, width, height, format in test_cases:
        print(f"\n📤 Creando imagen: {filename} ({width}x{height}, {format})")
        
        # Generar imagen
        if 'rgba' in filename:
            # Crear imagen con transparencia
            img = Image.new('RGBA', (width, height), (255, 100, 100, 128))
            draw = ImageDraw.Draw(img)
            draw.ellipse([width//4, height//4, 3*width//4, 3*height//4], 
                        fill=(100, 100, 255, 200))
            buffer = BytesIO()
            img.save(buffer, format='PNG')
            buffer.seek(0)
            image_data = buffer.getvalue()
        else:
            image_data = create_test_image(width, height, format)
        
        # Crear objeto ImageAsset
        file_obj = SimpleUploadedFile(
            filename,
            image_data,
            content_type=f'image/{format.lower()}'
        )
        
        # Determinar tipo de archivo
        tipo_archivo = filename.split('.')[-1].upper()
        
        # Crear registro
        image_asset = ImageAsset.objects.create(
            repositorio=repo,
            modulo=modulo,
            creado_por=user,
            archivo_original=file_obj,
            nombre_original=filename.rsplit('.', 1)[0],
            tipo_archivo=tipo_archivo,
        )
        
        print(f"   ✅ ImageAsset creado: ID={image_asset.id}")
        print(f"   📁 Original: {image_asset.archivo_original.name}")
        
        # Procesar imagen
        from core.tasks import process_image
        print(f"   🔄 Procesando imagen...")
        
        try:
            process_image(str(image_asset.id))
            image_asset.refresh_from_db()
            print(f"   ✅ Estado: {image_asset.estado}")
            
            if image_asset.estado == 'COMPLETADO':
                print(f"   📁 Imagen web: {image_asset.imagen_web.name if image_asset.imagen_web else 'N/A'}")
                print(f"   📁 Thumbnail: {image_asset.thumbnail.name if image_asset.thumbnail else 'N/A'}")
                if image_asset.metadata:
                    print(f"   📊 Metadata: {image_asset.metadata}")
            else:
                print(f"   ❌ Error: {image_asset.last_error}")
                
        except Exception as e:
            print(f"   ❌ Error procesando: {e}")
            import traceback
            traceback.print_exc()
    
    # 5. Resumen final
    print("\n" + "=" * 60)
    print("📊 RESUMEN")
    print("=" * 60)
    
    total = ImageAsset.objects.count()
    completadas = ImageAsset.objects.filter(estado='COMPLETADO').count()
    errores = ImageAsset.objects.filter(estado='ERROR').count()
    pendientes = ImageAsset.objects.filter(estado='PENDIENTE').count()
    
    print(f"Total imágenes: {total}")
    print(f"  ✅ Completadas: {completadas}")
    print(f"  ❌ Con errores: {errores}")
    print(f"  ⏳ Pendientes: {pendientes}")
    
    if completadas > 0:
        print("\n📁 Archivos generados:")
        for img in ImageAsset.objects.filter(estado='COMPLETADO')[:5]:
            print(f"\n  {img.nombre_original}:")
            print(f"    - Original: {img.archivo_original.name}")
            if img.imagen_web:
                print(f"    - Web: {img.imagen_web.name}")
            if img.thumbnail:
                print(f"    - Thumbnail: {img.thumbnail.name}")

if __name__ == '__main__':
    main()
