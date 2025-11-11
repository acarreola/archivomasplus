"""
Django management command para verificar configuración FFmpeg
"""
from django.core.management.base import BaseCommand
from django.conf import settings
import shutil
import os

class Command(BaseCommand):
    help = 'Verifica la configuración de FFmpeg y directorios de media'

    def handle(self, *args, **options):
        self.stdout.write("=" * 60)
        self.stdout.write(self.style.SUCCESS('🎬 Verificación de FFmpeg - ArchivoPlus'))
        self.stdout.write("=" * 60)
        
        # 1. Verificar ffmpeg
        ffmpeg_path = shutil.which('ffmpeg')
        if ffmpeg_path:
            self.stdout.write(self.style.SUCCESS(f"✅ FFmpeg encontrado: {ffmpeg_path}"))
        else:
            self.stdout.write(self.style.ERROR("❌ FFmpeg NO encontrado"))
            self.stdout.write("   Instalar con: brew install ffmpeg")
            return
        
        # 2. Verificar ffprobe
        ffprobe_path = shutil.which('ffprobe')
        if ffprobe_path:
            self.stdout.write(self.style.SUCCESS(f"✅ FFprobe encontrado: {ffprobe_path}"))
        else:
            self.stdout.write(self.style.ERROR("❌ FFprobe NO encontrado"))
            return
        
        # 3. Verificar versión
        import subprocess
        try:
            result = subprocess.run(
                [ffmpeg_path, '-version'],
                capture_output=True,
                text=True,
                timeout=5
            )
            version_line = result.stdout.split('\n')[0]
            self.stdout.write(f"   {version_line}")
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"⚠️  No se pudo obtener versión: {e}"))
        
        # 4. Verificar encoders
        self.stdout.write("\n📊 Encoders disponibles:")
        encoders_to_check = [
            ('h264_videotoolbox', 'VideoToolbox H.264 (GPU macOS)'),
            ('hevc_videotoolbox', 'VideoToolbox HEVC (GPU macOS)'),
            ('libx264', 'x264 (Software)'),
            ('libx265', 'x265 (Software)'),
        ]
        
        try:
            result = subprocess.run(
                [ffmpeg_path, '-hide_banner', '-encoders'],
                capture_output=True,
                text=True,
                timeout=5
            )
            encoders_output = result.stdout
            
            for encoder, description in encoders_to_check:
                if encoder in encoders_output:
                    self.stdout.write(self.style.SUCCESS(f"   ✅ {encoder} ({description})"))
                else:
                    self.stdout.write(f"   ⚪ {encoder} no disponible")
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"⚠️  No se pudo listar encoders: {e}"))
        
        # 5. Verificar MEDIA_ROOT
        self.stdout.write("\n📁 Directorios de media:")
        media_root = settings.MEDIA_ROOT
        self.stdout.write(f"   MEDIA_ROOT: {media_root}")
        
        if os.path.exists(media_root):
            self.stdout.write(self.style.SUCCESS(f"   ✅ Existe"))
        else:
            self.stdout.write(self.style.WARNING(f"   ⚠️  No existe - se creará al subir archivos"))
        
        if os.access(media_root, os.W_OK):
            self.stdout.write(self.style.SUCCESS(f"   ✅ Escribible"))
        else:
            self.stdout.write(self.style.ERROR(f"   ❌ NO escribible - verificar permisos"))
        
        # 6. Verificar subdirectorios
        subdirs = ['sources', 'support', 'thumbnails', 'pizarra']
        self.stdout.write("\n📂 Subdirectorios:")
        for subdir in subdirs:
            path = os.path.join(media_root, subdir)
            try:
                os.makedirs(path, exist_ok=True)
                writable = os.access(path, os.W_OK)
                if writable:
                    self.stdout.write(self.style.SUCCESS(f"   ✅ {subdir}/ - OK"))
                else:
                    self.stdout.write(self.style.ERROR(f"   ❌ {subdir}/ - no escribible"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"   ❌ {subdir}/ - error: {e}"))
        
        # 7. Variables de entorno
        self.stdout.write("\n🔧 Variables de entorno:")
        ffmpeg_bin = os.getenv('FFMPEG_BIN')
        ffprobe_bin = os.getenv('FFPROBE_BIN')
        
        if ffmpeg_bin:
            self.stdout.write(f"   FFMPEG_BIN: {ffmpeg_bin}")
        else:
            self.stdout.write(f"   FFMPEG_BIN: (no configurada, usando PATH)")
        
        if ffprobe_bin:
            self.stdout.write(f"   FFPROBE_BIN: {ffprobe_bin}")
        else:
            self.stdout.write(f"   FFPROBE_BIN: (no configurada, usando PATH)")
        
        # Resumen
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(self.style.SUCCESS("🎉 Configuración FFmpeg lista"))
        self.stdout.write("=" * 60)
        self.stdout.write("\n💡 Próximos pasos:")
        self.stdout.write("   1. Inicia el servidor: python manage.py runserver")
        self.stdout.write("   2. Sube un archivo Broadcast desde el frontend")
        self.stdout.write("   3. Observa los logs de transcodificación en consola")
        self.stdout.write("   4. Verifica thumbnails y proxy generados\n")
