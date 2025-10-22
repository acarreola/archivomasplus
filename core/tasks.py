# core/tasks.py
import subprocess
import os
import platform
from pathlib import Path
from celery import shared_task
from django.conf import settings
from django.utils import timezone
from .models import Broadcast

def detect_hardware_encoder():
    """
    Detecta y configura el mejor encoder de hardware disponible para H.264
    
    Orden de prioridad:
    1. VideoToolbox (macOS) - Aceleración hardware nativa de Apple
    2. NVENC (NVIDIA GPU) - Encoders de hardware de NVIDIA
    3. VAAPI (Intel/AMD Linux) - API de video de código abierto
    4. QSV (Intel QuickSync) - Tecnología de Intel
    5. libx264 (software) - Fallback por CPU (siempre disponible)
    
    Retorna: dict con 'type', 'h264_encoder', 'hwaccel'
    """
    system = platform.system().lower()
    print(f"🖥️  Sistema detectado: {system}")
    
    try:
        # Verificar encoders disponibles en FFmpeg
        result = subprocess.run(
            ['ffmpeg', '-hide_banner', '-encoders'],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        encoders_output = result.stdout
        
        # PRIORIDAD 1: VideoToolbox (macOS - Apple Silicon M1/M2/M3 o Intel con GPU)
        if system == 'darwin' and 'h264_videotoolbox' in encoders_output:
            print("🔍 Probando VideoToolbox (macOS GPU)...")
            test_vt = subprocess.run(
                ['ffmpeg', '-hide_banner', '-f', 'lavfi', '-i', 'nullsrc=s=256x256:d=0.1', '-c:v', 'h264_videotoolbox', '-b:v', '1M', '-f', 'null', '-'],
                capture_output=True,
                text=True,
                timeout=5
            )
            if test_vt.returncode == 0:
                print("✅ VideoToolbox disponible - Usando GPU de Apple")
                return {
                    'type': 'videotoolbox',
                    'h264_encoder': 'h264_videotoolbox',
                    'h265_encoder': 'hevc_videotoolbox',
                    'hwaccel': 'videotoolbox',
                }
        
        # PRIORIDAD 2: NVENC (NVIDIA GPUs en Linux/Windows)
        if 'h264_nvenc' in encoders_output:
            print("🔍 Probando NVENC (NVIDIA GPU)...")
            test_cuda = subprocess.run(
                ['ffmpeg', '-hide_banner', '-hwaccel', 'cuda', '-f', 'lavfi', '-i', 'nullsrc=s=256x256:d=0.1', '-f', 'null', '-'],
                capture_output=True,
                text=True,
                timeout=5
            )
            if test_cuda.returncode == 0:
                print("✅ NVENC disponible - Usando GPU NVIDIA")
                return {
                    'type': 'nvenc',
                    'h264_encoder': 'h264_nvenc',
                    'h265_encoder': 'hevc_nvenc',
                    'hwaccel': 'cuda',
                }
        
        # PRIORIDAD 3: VAAPI (Intel/AMD en Linux con GPU integrada)
        if system == 'linux' and 'h264_vaapi' in encoders_output and os.path.exists('/dev/dri/renderD128'):
            print("✅ VAAPI disponible - Usando GPU integrada Intel/AMD")
            return {
                'type': 'vaapi',
                'h264_encoder': 'h264_vaapi',
                'h265_encoder': 'hevc_vaapi',
                'hwaccel': 'vaapi',
                'vaapi_device': '/dev/dri/renderD128'
            }
        
        # PRIORIDAD 4: QSV (Intel Quick Sync Video)
        if 'h264_qsv' in encoders_output:
            print("✅ QSV disponible - Usando Intel Quick Sync")
            return {
                'type': 'qsv',
                'h264_encoder': 'h264_qsv',
                'h265_encoder': 'hevc_qsv',
                'hwaccel': 'qsv'
            }
            
    except Exception as e:
        print(f"⚠️  Error detectando hardware encoder: {e}")
    
    # Fallback a software OPTIMIZADO para multi-core
    print("⚙️  Usando software encoding optimizado (multi-core)")
    return {
        'type': 'software',
        'h264_encoder': 'libx264',
        'h265_encoder': 'libx265',
        'hwaccel': None
    }

# Detectar encoder al iniciar el módulo
HW_ENCODER_CONFIG = detect_hardware_encoder()
print(f"🎬 FFmpeg usando: {HW_ENCODER_CONFIG['type'].upper()} - H.264: {HW_ENCODER_CONFIG['h264_encoder']}")

@shared_task
def transcode_video(broadcast_id):
    """
    Tarea Celery para transcodificar videos a H.264 con deinterlace y aceleración por GPU si está disponible.
    
    Args:
        broadcast_id: UUID del broadcast a transcodificar
    """
    try:
        broadcast = Broadcast.objects.get(id=broadcast_id)
        
        # Verificar que existe el archivo original
        if not broadcast.archivo_original:
            broadcast.estado_transcodificacion = 'ERROR'
            broadcast.save()
            return {'error': 'No hay archivo original'}

        input_path = broadcast.archivo_original.path
        
        # Usar solo los primeros 8 caracteres del UUID
        short_id = str(broadcast.id)[:8]
        
        # Crear directorios de salida si no existen
        support_dir = Path(settings.MEDIA_ROOT) / 'support'
        support_dir.mkdir(parents=True, exist_ok=True)
        
        thumbnail_dir = Path(settings.MEDIA_ROOT) / 'thumbnails'
        thumbnail_dir.mkdir(parents=True, exist_ok=True)
        
        # Generar nombres de archivo con UUID corto (8 caracteres)
        output_h264_filename = f"{short_id}_h264.mp4"
        output_h264_path = support_dir / output_h264_filename
        
        # Generar nombre del thumbnail
        thumbnail_filename = f"{short_id}_thumb.jpg"
        thumbnail_path = thumbnail_dir / thumbnail_filename
        
        # Crear directorio para pizarra thumbnails
        pizarra_dir = Path(settings.MEDIA_ROOT) / 'pizarra'
        pizarra_dir.mkdir(parents=True, exist_ok=True)
        
        # Generar nombre del pizarra thumbnail con UUID corto
        pizarra_filename = f"{short_id}_pizarra.jpg"
        pizarra_path = pizarra_dir / pizarra_filename

        # ====================================================================
        # PASO 1: DETECTAR DURACIÓN DEL VIDEO
        # ====================================================================
        print(f"⏱️  Detectando duración del video...")
        duration_command = [
            'ffprobe',
            '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            str(input_path)
        ]
        
        duration_result = subprocess.run(
            duration_command,
            check=True,
            capture_output=True,
            text=True
        )
        
        try:
            duration = float(duration_result.stdout.strip())
            print(f"✓ Duración detectada: {duration:.2f} segundos")
        except ValueError:
            duration = 30.0  # Fallback a 30 segundos si falla
            print(f"⚠️  No se pudo detectar duración, usando fallback: {duration} segundos")
        
        # Calcular timestamps inteligentes según duración
        if duration < 5:
            # Videos muy cortos: thumbnail a 50% del video
            thumbnail_time = duration / 2
            pizarra_time = 0.5
        elif duration < 10:
            # Videos cortos: thumbnail a 60% del video
            thumbnail_time = duration * 0.6
            pizarra_time = 1.0
        else:
            # Videos normales: thumbnail a los 7 segundos (7.1 segundos = 7s + 3 frames a 30fps)
            thumbnail_time = 7.1
            pizarra_time = 2.0
        
        # Asegurar que no excedemos la duración
        thumbnail_time = min(thumbnail_time, duration - 0.5)
        pizarra_time = min(pizarra_time, duration - 0.5)
        
        print(f"📸 Timestamps calculados - Thumbnail: {thumbnail_time:.2f}s, Pizarra: {pizarra_time:.2f}s")

        # ====================================================================
        # PASO 2: GENERAR THUMBNAILS (son rápidos, ~1 segundo cada uno)
        # ====================================================================
        
        print(f"📸 Generando thumbnail principal...")
        thumbnail_command = [
            'ffmpeg',
            '-ss', str(thumbnail_time),  # Usar timestamp calculado
            '-i', str(input_path),
            '-vframes', '1',
            '-vf', 'scale=-2:360',
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
        print(f"✓ Thumbnail generado: {thumbnail_path}")

        print(f"📸 Generando pizarra thumbnail...")
        pizarra_command = [
            'ffmpeg',
            '-ss', str(pizarra_time),  # Usar timestamp calculado
            '-i', str(input_path),
            '-vframes', '1',
            '-vf', 'scale=-2:720',
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
        print(f"✓ Pizarra generada: {pizarra_path}")

        # Guardar thumbnails de inmediato para que el frontend los vea aunque falle luego
        broadcast.thumbnail = f'thumbnails/{thumbnail_filename}'
        broadcast.pizarra_thumbnail = f'pizarra/{pizarra_filename}'
        broadcast.save(update_fields=['thumbnail', 'pizarra_thumbnail'])

        # ====================================================================
        # PASO 3: TRANSCODIFICAR A H.264 (para compatibilidad y descarga)
        # ====================================================================
        command_h264 = ['ffmpeg']
        
        # Agregar aceleración de hardware si está disponible
        if HW_ENCODER_CONFIG['hwaccel']:
            if HW_ENCODER_CONFIG['type'] == 'videotoolbox':
                # VideoToolbox no necesita hwaccel explícito, usa el encoder directamente
                pass
            elif HW_ENCODER_CONFIG['type'] == 'nvenc':
                command_h264.extend(['-hwaccel', 'cuda', '-hwaccel_output_format', 'cuda'])
            elif HW_ENCODER_CONFIG['type'] == 'vaapi':
                command_h264.extend(['-hwaccel', 'vaapi', '-vaapi_device', HW_ENCODER_CONFIG['vaapi_device']])
        
        command_h264.extend([
            '-i', str(input_path),
            '-c:v', HW_ENCODER_CONFIG['h264_encoder'],  # Usar encoder detectado
        ])
        
        # Configuración según el tipo de encoder
        if HW_ENCODER_CONFIG['type'] == 'videotoolbox':
            command_h264.extend([
                '-b:v', '8M',        # Bitrate 8 Mbps
                '-maxrate', '10M',   # Max bitrate
                '-bufsize', '16M',   # Buffer
                '-allow_sw', '1',    # Permitir fallback a software si es necesario
            ])
        elif HW_ENCODER_CONFIG['type'] == 'nvenc':
            command_h264.extend([
                '-preset', 'p4',     # NVENC preset: p1-p7 (p1=rápido, p7=lento+calidad)
                '-rc:v', 'vbr',      # Variable bitrate
                '-cq:v', '20',       # Calidad constante
                '-b:v', '8M',
                '-maxrate', '12M',
                '-bufsize', '16M',
            ])
        elif HW_ENCODER_CONFIG['type'] == 'vaapi':
            command_h264.extend([
                '-qp', '20',  # Quality parameter para VAAPI
            ])
        else:  # software - OPTIMIZADO PARA MÁXIMA VELOCIDAD
            command_h264.extend([
                '-preset', 'veryfast',  # veryfast = mucho más rápido que faster
                '-tune', 'fastdecode',   # Optimizar para decodificación rápida
                '-crf', '23',            # CRF 23 (balance velocidad/calidad)
                '-threads', '0',         # Usar todos los cores
                '-x264-params', 'aq-mode=0:me=dia:subme=2:ref=1',  # Parámetros ultra rápidos
            ])
        
        command_h264.extend([
            '-vf', 'yadif=0:-1:0,scale=-2:1080',  # Deinterlace + 1080p
            '-c:a', 'aac',
            '-b:a', '192k',
            '-movflags', '+faststart',
            str(output_h264_path),
            '-y'
        ])

        print(f"🎬 Transcodificando H.264 con {HW_ENCODER_CONFIG['type'].upper()}: {' '.join(command_h264)}")
        
        # Ejecutar FFmpeg para H.264
        subprocess.run(
            command_h264, 
            check=True,
            capture_output=True,
            text=True
        )
        print(f"✓ H.264 completado: {output_h264_path}")

        # ====================================================================
        # PASO 4: GUARDAR RUTAS EN EL MODELO Y MARCAR COMO COMPLETADO
        # ====================================================================
        print(f"💾 Guardando rutas en base de datos...")
        broadcast.ruta_h264 = f'support/{output_h264_filename}'
        broadcast.ruta_proxy = f'support/{output_h264_filename}'  # Usar H.264 también como proxy
        broadcast.estado_transcodificacion = 'COMPLETADO'
        broadcast.last_error = None
        broadcast.save(update_fields=['ruta_h264', 'ruta_proxy', 'estado_transcodificacion', 'last_error'])
        print(f"✅ Transcodificación completada exitosamente para broadcast {broadcast.id}")

        return {
            'status': 'success',
            'broadcast_id': str(broadcast.id),
            'output_h264_path': str(output_h264_path),
            'thumbnail_path': str(thumbnail_path),
            'pizarra_path': str(pizarra_path)
        }

    except Broadcast.DoesNotExist:
        return {'error': f'Broadcast {broadcast_id} no encontrado'}
    
    except subprocess.CalledProcessError as e:
        # Error de FFmpeg
        if 'broadcast' in locals():
            # Conservar cualquier progreso parcial (thumbnails/ruta_h264) y marcar ERROR
            broadcast.estado_transcodificacion = 'ERROR'
            # Guardar stderr truncado para diagnóstico
            err = (e.stderr or '').strip()
            if err and len(err) > 8000:
                err = err[-8000:]  # guardar los últimos 8k
            broadcast.last_error = err or f"FFmpeg error (code {e.returncode})"
            broadcast.save(update_fields=['estado_transcodificacion', 'last_error'])
        # Log básico para depuración rápida en worker
        try:
            print('✗ FFmpeg error:', e.stderr[:2000])
        except Exception:
            pass
        return {
            'error': 'FFmpeg falló',
            'stderr': e.stderr,
            'returncode': e.returncode
        }
    
    except Exception as e:
        # Cualquier otro error
        if 'broadcast' in locals():
            broadcast.estado_transcodificacion = 'ERROR'
            # Guardar mensaje de error
            msg = str(e)
            if msg and len(msg) > 8000:
                msg = msg[:8000]
            broadcast.last_error = msg
            broadcast.save(update_fields=['estado_transcodificacion', 'last_error'])
        return {'error': str(e)}


@shared_task
def encode_custom_video(broadcast_id, encoding_settings, preset_id='custom'):
    """
    Tarea Celery para codificar videos con configuración personalizada.
    
    Args:
        broadcast_id: UUID del broadcast a codificar
        encoding_settings: Diccionario con la configuración de encoding
        preset_id: ID del preset utilizado
    """
    try:
        broadcast = Broadcast.objects.get(id=broadcast_id)
        
        # Verificar que existe el archivo original
        if not broadcast.archivo_original:
            return {'error': 'No hay archivo original'}

        input_path = broadcast.archivo_original.path
        
        # Usar solo los primeros 8 caracteres del UUID
        short_id = str(broadcast.id)[:8]
        
        # Crear directorio de salida si no existe
        output_dir = Path(settings.MEDIA_ROOT) / 'encoded'
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Extraer configuración
        formato = encoding_settings.get('formato', 'mp4')
        codec = encoding_settings.get('codec', 'libx264')
        resolution = encoding_settings.get('resolution', '1920x1080')
        fps = encoding_settings.get('fps', '30')
        crf = encoding_settings.get('crf', '23')
        preset = encoding_settings.get('preset', 'medium')
        audio_codec = encoding_settings.get('audio_codec', 'aac')
        audio_bitrate = encoding_settings.get('audio_bitrate', '128k')
        profile = encoding_settings.get('profile', 'main')
        pixel_format = encoding_settings.get('pixel_format', 'yuv420p')
        bitrate_video = encoding_settings.get('bitrate_video', '')
        
        # Generar nombre de archivo de salida
        output_filename = f"{short_id}_{preset_id}.{formato}"
        output_path = output_dir / output_filename
        
        # Construir comando FFmpeg base
        command = ['ffmpeg', '-i', str(input_path)]
        
        # Video codec
        command.extend(['-c:v', codec])
        
        # Preset (para x264/x265)
        if codec in ['libx264', 'libx265'] and preset:
            command.extend(['-preset', preset])
        
        # CRF o bitrate
        if crf and codec in ['libx264', 'libx265', 'libvpx-vp9']:
            command.extend(['-crf', str(crf)])
        elif bitrate_video:
            command.extend(['-b:v', bitrate_video])
        
        # Resolución
        if resolution and resolution != 'original':
            if 'x' in resolution:
                # Formato widthxheight
                width, height = resolution.split('x')
                command.extend(['-vf', f'scale={width}:{height}'])
            else:
                # Mantener aspect ratio
                command.extend(['-vf', f'scale=-2:{resolution}'])
        
        # FPS
        if fps and fps != 'original':
            command.extend(['-r', str(fps)])
        
        # Profile (x264)
        if codec == 'libx264' and profile:
            command.extend(['-profile:v', profile])
        
        # Pixel format
        if pixel_format:
            command.extend(['-pix_fmt', pixel_format])
        
        # Audio codec y bitrate
        command.extend(['-c:a', audio_codec])
        if audio_bitrate:
            command.extend(['-b:a', audio_bitrate])
        
        # Opciones adicionales según el codec
        if codec == 'libx264':
            command.extend(['-movflags', '+faststart'])
        elif codec == 'prores_ks':
            # ProRes profile (0=Proxy, 1=LT, 2=Standard, 3=HQ)
            prores_profile = encoding_settings.get('profile', '2')
            command.extend(['-profile:v', prores_profile])
        elif codec == 'dnxhd':
            # DNxHD requiere configuración específica
            command.extend(['-vf', f'scale={resolution},fps={fps}'])
        elif codec == 'libvpx-vp9':
            # VP9 configuración
            command.extend(['-b:v', '0'])  # VBR mode
            command.extend(['-row-mt', '1'])  # Multi-threading
        
        # Agregar output path y overwrite
        command.extend([str(output_path), '-y'])
        
        # Log del comando
        print(f"🎬 Ejecutando FFmpeg: {' '.join(command)}")
        
        # Ejecutar FFmpeg
        result = subprocess.run(
            command,
            check=True,
            capture_output=True,
            text=True
        )
        
        print(f"✅ Codificación completada: {output_filename}")
        print(f"📊 Tamaño del archivo: {output_path.stat().st_size / (1024*1024):.2f} MB")
        
        # Guardar información del archivo codificado en el modelo
        file_info = {
            'filename': output_filename,
            'path': f'encoded/{output_filename}',
            'preset_id': preset_id,
            'formato': formato,
            'codec': codec,
            'resolution': resolution,
            'file_size_mb': round(output_path.stat().st_size / (1024*1024), 2),
            'fecha_creacion': timezone.now().isoformat(),
            'settings': encoding_settings
        }
        
        # Agregar a la lista de archivos codificados
        if not broadcast.encoded_files:
            broadcast.encoded_files = []
        
        broadcast.encoded_files.append(file_info)
        broadcast.save()
        
        print(f"💾 Archivo codificado guardado en base de datos")
        
        return {
            'status': 'success',
            'broadcast_id': str(broadcast.id),
            'output_path': str(output_path),
            'output_filename': output_filename,
            'preset_id': preset_id,
            'file_size_mb': output_path.stat().st_size / (1024*1024)
        }

    except Broadcast.DoesNotExist:
        return {'error': f'Broadcast {broadcast_id} no encontrado'}
    
    except subprocess.CalledProcessError as e:
        # Error de FFmpeg
        error_msg = e.stderr if e.stderr else str(e)
        print(f"❌ Error de FFmpeg: {error_msg}")
        return {
            'error': 'FFmpeg falló',
            'stderr': error_msg,
            'returncode': e.returncode
        }
    
    except Exception as e:
        # Cualquier otro error
        print(f"❌ Error en codificación: {str(e)}")
        return {'error': str(e)}


@shared_task
def process_audio(audio_id):
    """
    Tarea Celery para procesar archivos de audio.
    Convierte cualquier formato de audio a MP3 para reproducción web.
    Genera iconos de audio para thumbnail y pizarra.
    
    Args:
        audio_id: UUID del audio a procesar
    """
    try:
        from .models import Audio
        
        audio = Audio.objects.get(id=audio_id)
        
        # Verificar que existe el archivo original
        if not audio.archivo_original:
            audio.estado_procesamiento = 'ERROR'
            audio.save()
            return {'error': 'No hay archivo original'}

        input_path = audio.archivo_original.path
        
        # Usar solo los primeros 8 caracteres del UUID
        short_id = str(audio.id)[:8]
        
        # Crear directorios de salida si no existen
        support_dir = Path(settings.MEDIA_ROOT) / 'support'
        support_dir.mkdir(parents=True, exist_ok=True)
        
        thumbnail_dir = Path(settings.MEDIA_ROOT) / 'thumbnails'
        thumbnail_dir.mkdir(parents=True, exist_ok=True)
        
        pizarra_dir = Path(settings.MEDIA_ROOT) / 'pizarra'
        pizarra_dir.mkdir(parents=True, exist_ok=True)
        
        # Marcar como procesando
        audio.estado_procesamiento = 'PROCESANDO'
        audio.save()

        # ====================================================================
        # PASO 1: CONVERTIR A MP3 (para reproducción web)
        # ====================================================================
        print(f"🎵 Convirtiendo audio a MP3...")
        
        output_mp3_filename = f"{short_id}.mp3"
        output_mp3_path = support_dir / output_mp3_filename
        
        mp3_command = [
            'ffmpeg',
            '-i', str(input_path),
            '-codec:a', 'libmp3lame',  # Codec MP3
            '-qscale:a', '2',           # Calidad alta (0-9, donde 0 es mejor)
            '-ar', '44100',             # Sample rate 44.1kHz
            '-ac', '2',                 # Stereo
            str(output_mp3_path),
            '-y'
        ]
        
        subprocess.run(
            mp3_command,
            check=True,
            capture_output=True,
            text=True
        )
        
        print(f"✓ MP3 generado: {output_mp3_path}")
        
        # Guardar ruta del MP3
        audio.ruta_mp3 = f'support/{output_mp3_filename}'
        audio.save(update_fields=['ruta_mp3'])

        # ====================================================================
        # PASO 2: GENERAR ICONOS DE AUDIO (thumbnail y pizarra)
        # ====================================================================
        
        # Usar un icono estático de audio (puedes cambiarlo por un ícono personalizado)
        # Por ahora, generamos un placeholder simple con FFmpeg
        
        print(f"🎨 Generando thumbnail de audio...")
        thumbnail_filename = f"{short_id}_thumb.jpg"
        thumbnail_path = thumbnail_dir / thumbnail_filename
        
        # Crear imagen con color de fondo y texto "AUDIO"
        thumbnail_command = [
            'ffmpeg',
            '-f', 'lavfi',
            '-i', 'color=c=#1e40af:s=640x360:d=1',  # Fondo azul
            '-vf', 'drawtext=text=\'♪\':fontsize=120:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2',
            '-frames:v', '1',
            str(thumbnail_path),
            '-y'
        ]
        
        try:
            subprocess.run(
                thumbnail_command,
                check=True,
                capture_output=True,
                text=True
            )
            print(f"✓ Thumbnail generado: {thumbnail_path}")
            audio.thumbnail = f'thumbnails/{thumbnail_filename}'
        except subprocess.CalledProcessError as e:
            print(f"⚠️ Error generando thumbnail, usando fallback: {e}")
            # Si falla, simplemente no asignamos thumbnail

        print(f"🎨 Generando pizarra de audio...")
        pizarra_filename = f"{short_id}_pizarra.jpg"
        pizarra_path = pizarra_dir / pizarra_filename
        
        # Crear imagen similar para pizarra
        pizarra_command = [
            'ffmpeg',
            '-f', 'lavfi',
            '-i', 'color=c=#1e40af:s=1280x720:d=1',
            '-vf', 'drawtext=text=\'♪\':fontsize=240:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2',
            '-frames:v', '1',
            str(pizarra_path),
            '-y'
        ]
        
        try:
            subprocess.run(
                pizarra_command,
                check=True,
                capture_output=True,
                text=True
            )
            print(f"✓ Pizarra generada: {pizarra_path}")
            audio.pizarra_thumbnail = f'pizarra/{pizarra_filename}'
        except subprocess.CalledProcessError as e:
            print(f"⚠️ Error generando pizarra, usando fallback: {e}")

        # ====================================================================
        # PASO 3: EXTRAER METADATA DEL AUDIO
        # ====================================================================
        print(f"📋 Extrayendo metadata del audio...")
        
        metadata_command = [
            'ffprobe',
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_format',
            str(input_path)
        ]
        
        try:
            metadata_result = subprocess.run(
                metadata_command,
                check=True,
                capture_output=True,
                text=True
            )
            
            import json
            metadata_json = json.loads(metadata_result.stdout)
            
            # Extraer tags si existen
            tags = metadata_json.get('format', {}).get('tags', {})
            duration = float(metadata_json.get('format', {}).get('duration', 0))
            
            # Guardar metadata relevante
            audio.metadata = {
                'titulo': tags.get('title', audio.nombre_original),
                'artista': tags.get('artist', ''),
                'album': tags.get('album', ''),
                'duracion': round(duration, 2),
                'bitrate': metadata_json.get('format', {}).get('bit_rate', ''),
            }
            
            print(f"✓ Metadata extraída: {audio.metadata}")
            
        except Exception as e:
            print(f"⚠️ Error extrayendo metadata: {e}")
            audio.metadata = {'titulo': audio.nombre_original}

        # ====================================================================
        # FINALIZAR PROCESAMIENTO
        # ====================================================================
        
        audio.estado_procesamiento = 'COMPLETADO'
        audio.save()
        
        print(f"✅ Procesamiento de audio completado exitosamente")
        print(f"📊 MP3: {output_mp3_path.stat().st_size / (1024*1024):.2f} MB")
        
        return {
            'status': 'success',
            'audio_id': str(audio.id),
            'mp3_path': str(output_mp3_path),
            'metadata': audio.metadata
        }

    except Exception as e:
        print(f"❌ Error procesando audio: {str(e)}")
        
        try:
            audio.estado_procesamiento = 'ERROR'
            audio.save()
        except:
            pass
        
        return {'error': str(e)}


@shared_task
def encode_custom_audio(audio_id, encoding_settings, preset_id='custom'):
    """
    Tarea Celery para codificar audios con configuración personalizada.
    Genera un archivo en MEDIA_ROOT/encoded_audio y no modifica el modelo.

    Args:
        audio_id: UUID del audio a codificar
        encoding_settings: Diccionario con la configuración de encoding de audio
        preset_id: ID del preset utilizado
    """
    try:
        from .models import Audio
        audio = Audio.objects.get(id=audio_id)
        if not audio.archivo_original:
            return {'error': 'No hay archivo original'}

        input_path = audio.archivo_original.path
        short_id = str(audio.id)[:8]

        # Crear directorio de salida
        output_dir = Path(settings.MEDIA_ROOT) / 'encoded_audio'
        output_dir.mkdir(parents=True, exist_ok=True)

        # Extraer configuración con defaults razonables
        codec = encoding_settings.get('audio_codec', 'aac')
        bitrate = encoding_settings.get('audio_bitrate', '192k')
        sample_rate = str(encoding_settings.get('sample_rate', '44100'))
        channels = str(encoding_settings.get('channels', '2'))
        container = encoding_settings.get('container')

        # Normalizar alias de codecs a nombres soportados por FFmpeg
        codec_alias = {
            'mp3': 'libmp3lame',
            'opus': 'libopus',
        }
        normalized_codec = codec_alias.get(codec, codec)
        codec = normalized_codec

        # Mapeo de contenedor recomendado por codec
        default_container_by_codec = {
            'aac': 'm4a',
            'libmp3lame': 'mp3',
            'ac3': 'ac3',
            'eac3': 'eac3',
            'flac': 'flac',
            'alac': 'm4a',
            'libopus': 'opus',
            'pcm_s16le': 'wav',
        }

        # Determinar contenedor por codec si no se especifica
        if not container:
            container = default_container_by_codec.get(codec, 'm4a')
        else:
            # Corregir combinaciones incompatibles comunes (p.ej. AAC en contenedor MP3)
            recommended = default_container_by_codec.get(codec)
            if recommended and container != recommended:
                # Reglas de seguridad para evitar fallos por mismatch evidente
                if (container == 'mp3' and codec != 'libmp3lame') or \
                   (container == 'm4a' and codec not in ['aac', 'alac']) or \
                   (container == 'wav' and not codec.startswith('pcm')):
                    container = recommended

        output_filename = f"{short_id}_{preset_id}.{container}"
        output_path = output_dir / output_filename

        # Construir comando FFmpeg para audio
        command = ['ffmpeg', '-i', str(input_path), '-vn']

        # Codec
        command.extend(['-c:a', codec])

        # Bitrate (si aplica)
        if codec not in ['flac', 'pcm_s16le', 'alac'] and bitrate:
            command.extend(['-b:a', str(bitrate)])

        # Parámetros comunes
        if sample_rate:
            command.extend(['-ar', sample_rate])
        if channels:
            command.extend(['-ac', channels])

        # ALAC necesita container m4a y no usa -b:a
        if codec == 'alac':
            if container != 'm4a':
                container = 'm4a'
                output_filename = f"{short_id}_{preset_id}.{container}"
                output_path = output_dir / output_filename

        # Agregar output y overwrite
        command.extend([str(output_path), '-y'])

        print(f"🎵 Ejecutando FFmpeg (audio): {' '.join(command)}")
        subprocess.run(command, check=True, capture_output=True, text=True)

        size_mb = round(output_path.stat().st_size / (1024*1024), 2)
        print(f"✅ Audio codificado: {output_filename} ({size_mb} MB)")

        return {
            'status': 'success',
            'audio_id': str(audio.id),
            'output_path': str(output_path),
            'output_filename': output_filename,
            'preset_id': preset_id,
            'file_size_mb': size_mb,
        }

    except Exception as e:
        print(f"❌ Error en codificación de audio: {str(e)}")
        return {'error': str(e)}
