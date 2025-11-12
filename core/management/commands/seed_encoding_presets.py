"""
Management command to create initial encoding presets
Usage: python manage.py seed_encoding_presets
"""
from django.core.management.base import BaseCommand
from core.models import EncodingPreset, CustomUser


class Command(BaseCommand):
    help = 'Crea presets de codificación iniciales'

    def handle(self, *args, **options):
        # Get or create a system user for global presets
        admin_user = CustomUser.objects.filter(is_superuser=True).first()
        
        if not admin_user:
            self.stdout.write(self.style.WARNING('No se encontró usuario administrador. Crea uno primero.'))
            return

        presets = [
            # BROADCAST PRESETS
            {
                'nombre': 'HD 1080p Alta Calidad',
                'descripcion': 'Video de alta definición para difusión profesional',
                'categoria': 'broadcast',
                'es_global': True,
                'settings': {
                    'formato': 'mp4',
                    'codec': 'h264',
                    'resolucion': '1920x1080',
                    'bitrate': '8000k',
                    'audio_bitrate': '192k',
                    'fps': '30'
                }
            },
            {
                'nombre': 'HD 720p Calidad Media',
                'descripcion': 'Video HD para streaming de calidad media',
                'categoria': 'broadcast',
                'es_global': True,
                'settings': {
                    'formato': 'mp4',
                    'codec': 'h264',
                    'resolucion': '1280x720',
                    'bitrate': '4000k',
                    'audio_bitrate': '128k',
                    'fps': '30'
                }
            },
            {
                'nombre': '4K Ultra HD',
                'descripcion': 'Video 4K para máxima calidad',
                'categoria': 'broadcast',
                'es_global': True,
                'settings': {
                    'formato': 'mp4',
                    'codec': 'h264',
                    'resolucion': '3840x2160',
                    'bitrate': '20000k',
                    'audio_bitrate': '320k',
                    'fps': '30'
                }
            },
            
            # WEB PRESETS
            {
                'nombre': 'Web HD',
                'descripcion': 'Optimizado para reproducción web en alta definición',
                'categoria': 'web',
                'es_global': True,
                'settings': {
                    'formato': 'mp4',
                    'codec': 'h264',
                    'resolucion': '1280x720',
                    'bitrate': '2500k',
                    'audio_bitrate': '128k',
                    'fps': '30'
                }
            },
            {
                'nombre': 'Web SD',
                'descripcion': 'Tamaño reducido para conexiones lentas',
                'categoria': 'web',
                'es_global': True,
                'settings': {
                    'formato': 'mp4',
                    'codec': 'h264',
                    'resolucion': '854x480',
                    'bitrate': '1000k',
                    'audio_bitrate': '96k',
                    'fps': '25'
                }
            },
            
            # MOBILE PRESETS
            {
                'nombre': 'Mobile Alta',
                'descripcion': 'Para dispositivos móviles de alta gama',
                'categoria': 'mobile',
                'es_global': True,
                'settings': {
                    'formato': 'mp4',
                    'codec': 'h264',
                    'resolucion': '1280x720',
                    'bitrate': '1500k',
                    'audio_bitrate': '96k',
                    'fps': '30'
                }
            },
            {
                'nombre': 'Mobile Baja',
                'descripcion': 'Tamaño mínimo para cualquier dispositivo',
                'categoria': 'mobile',
                'es_global': True,
                'settings': {
                    'formato': 'mp4',
                    'codec': 'h264',
                    'resolucion': '640x360',
                    'bitrate': '500k',
                    'audio_bitrate': '64k',
                    'fps': '25'
                }
            },
            
            # SOCIAL MEDIA PRESETS
            {
                'nombre': 'Instagram Feed',
                'descripcion': 'Vertical 9:16 para Instagram Stories/Reels',
                'categoria': 'social',
                'es_global': True,
                'settings': {
                    'formato': 'mp4',
                    'codec': 'h264',
                    'resolucion': '1080x1920',
                    'bitrate': '3500k',
                    'audio_bitrate': '128k',
                    'fps': '30'
                }
            },
            {
                'nombre': 'Facebook HD',
                'descripcion': 'Optimizado para Facebook',
                'categoria': 'social',
                'es_global': True,
                'settings': {
                    'formato': 'mp4',
                    'codec': 'h264',
                    'resolucion': '1280x720',
                    'bitrate': '2000k',
                    'audio_bitrate': '128k',
                    'fps': '30'
                }
            },
            {
                'nombre': 'YouTube HD',
                'descripcion': 'Optimizado para YouTube 1080p',
                'categoria': 'social',
                'es_global': True,
                'settings': {
                    'formato': 'mp4',
                    'codec': 'h264',
                    'resolucion': '1920x1080',
                    'bitrate': '5000k',
                    'audio_bitrate': '192k',
                    'fps': '30'
                }
            },
            {
                'nombre': 'TikTok Vertical',
                'descripcion': 'Formato vertical para TikTok',
                'categoria': 'social',
                'es_global': True,
                'settings': {
                    'formato': 'mp4',
                    'codec': 'h264',
                    'resolucion': '1080x1920',
                    'bitrate': '2500k',
                    'audio_bitrate': '128k',
                    'fps': '30'
                }
            }
        ]

        created_count = 0
        for preset_data in presets:
            # Check if preset already exists
            exists = EncodingPreset.objects.filter(
                nombre=preset_data['nombre']
            ).exists()
            
            if not exists:
                EncodingPreset.objects.create(
                    creado_por=admin_user,
                    **preset_data
                )
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f"✅ Creado: {preset_data['nombre']}")
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f"⏭️  Ya existe: {preset_data['nombre']}")
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'\n🎉 Proceso completado: {created_count} presets creados'
            )
        )
