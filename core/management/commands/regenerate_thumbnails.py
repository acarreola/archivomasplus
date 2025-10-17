# core/management/commands/regenerate_thumbnails.py
import subprocess
from pathlib import Path
from django.core.management.base import BaseCommand
from django.conf import settings
from django.core.files import File
from core.models import Comercial


class Command(BaseCommand):
    help = 'Regenera thumbnails (02:03) y pizarra (00:02) para comerciales existentes'

    def add_arguments(self, parser):
        parser.add_argument(
            '--all',
            action='store_true',
            help='Regenerar thumbnails para TODOS los comerciales (incluso los que ya tienen)'
        )
        parser.add_argument(
            '--comercial-id',
            type=str,
            help='Regenerar thumbnail para un comercial específico por UUID'
        )

    def handle(self, *args, **options):
        # Filtrar comerciales
        if options['comercial_id']:
            comerciales = Comercial.objects.filter(
                id=options['comercial_id'],
                estado_transcodificacion='COMPLETADO'
            )
        elif options['all']:
            comerciales = Comercial.objects.filter(estado_transcodificacion='COMPLETADO')
        else:
            # Solo los que no tienen thumbnail
            comerciales = Comercial.objects.filter(
                estado_transcodificacion='COMPLETADO',
                thumbnail=''
            )

        if not comerciales.exists():
            self.stdout.write(self.style.WARNING('No hay comerciales para procesar'))
            return

        self.stdout.write(f'Procesando {comerciales.count()} comerciales...')

        # Crear directorios si no existen
        thumbnail_dir = Path(settings.MEDIA_ROOT) / 'thumbnails'
        thumbnail_dir.mkdir(parents=True, exist_ok=True)
        
        pizarra_dir = Path(settings.MEDIA_ROOT) / 'pizarra'
        pizarra_dir.mkdir(parents=True, exist_ok=True)

        success_count = 0
        error_count = 0

        for comercial in comerciales:
            try:
                if not comercial.archivo_original:
                    self.stdout.write(self.style.WARNING(f'  ⚠️  {comercial.id}: Sin archivo original'))
                    continue

                input_path = comercial.archivo_original.path
                
                # Archivos de salida
                thumbnail_filename = f"{comercial.id}_thumb.jpg"
                thumbnail_path = thumbnail_dir / thumbnail_filename
                
                pizarra_filename = f"{comercial.id}_pizarra.jpg"
                pizarra_path = pizarra_dir / pizarra_filename

                # 1. Generar THUMBNAIL PRINCIPAL (02:03) para frontend
                thumbnail_command = [
                    'ffmpeg',
                    '-i', str(input_path),
                    '-ss', '00:02:03',  # Frame a 2 minutos 3 segundos
                    '-vframes', '1',
                    '-vf', 'scale=-2:360',  # 360p para lista
                    '-q:v', '2',
                    str(thumbnail_path),
                    '-y'
                ]

                subprocess.run(
                    thumbnail_command,
                    check=True,
                    capture_output=True,
                    text=True
                )

                # 2. Generar PIZARRA THUMBNAIL (00:02) para edición
                pizarra_command = [
                    'ffmpeg',
                    '-i', str(input_path),
                    '-ss', '00:00:02',  # Frame a 2 segundos
                    '-vframes', '1',
                    '-vf', 'scale=-2:720',  # 720p para vista de edición
                    '-q:v', '2',
                    str(pizarra_path),
                    '-y'
                ]

                subprocess.run(
                    pizarra_command,
                    check=True,
                    capture_output=True,
                    text=True
                )

                # Guardar ambos thumbnails en el modelo
                with open(thumbnail_path, 'rb') as thumb_file:
                    comercial.thumbnail.save(
                        thumbnail_filename,
                        File(thumb_file),
                        save=False
                    )
                
                with open(pizarra_path, 'rb') as pizarra_file:
                    comercial.pizarra_thumbnail.save(
                        pizarra_filename,
                        File(pizarra_file),
                        save=True
                    )

                success_count += 1
                self.stdout.write(self.style.SUCCESS(f'  ✓ {comercial.id}: Thumbnails generados (02:03 + 00:02)'))

            except subprocess.CalledProcessError as e:
                error_count += 1
                self.stdout.write(self.style.ERROR(f'  ✗ {comercial.id}: Error FFmpeg - {e.stderr[:100]}'))
            except Exception as e:
                error_count += 1
                self.stdout.write(self.style.ERROR(f'  ✗ {comercial.id}: {str(e)[:100]}'))

        self.stdout.write(self.style.SUCCESS(f'\n✅ Completado: {success_count} exitosos, {error_count} errores'))
