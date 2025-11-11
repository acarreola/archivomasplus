# core/tasks.py
import subprocess
import os
import platform
from pathlib import Path
from celery import shared_task
from django.conf import settings
from django.utils import timezone
from .models import Broadcast, ProcessingError

# Permitir configurar rutas a binarios FFmpeg/FFprobe vía variables de entorno
FFMPEG_BIN = os.getenv('FFMPEG_BIN', 'ffmpeg')
FFPROBE_BIN = os.getenv('FFPROBE_BIN', 'ffprobe')

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
            [FFMPEG_BIN, '-hide_banner', '-encoders'],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        encoders_output = result.stdout
        
        # PRIORIDAD 1: VideoToolbox (macOS - Apple Silicon M1/M2/M3 o Intel con GPU)
        if system == 'darwin' and 'h264_videotoolbox' in encoders_output:
            print("🔍 Probando VideoToolbox (macOS GPU)...")
            test_vt = subprocess.run(
                [FFMPEG_BIN, '-hide_banner', '-f', 'lavfi', '-i', 'nullsrc=s=256x256:d=0.1', '-c:v', 'h264_videotoolbox', '-b:v', '1M', '-f', 'null', '-'],
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
                [FFMPEG_BIN, '-hide_banner', '-hwaccel', 'cuda', '-f', 'lavfi', '-i', 'nullsrc=s=256x256:d=0.1', '-f', 'null', '-'],
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
    Tarea Celery para transcodificar videos a H.264 (support)
    con deinterlace y aceleración por GPU si está disponible.
    
    Args:
        broadcast_id: UUID del broadcast a transcodificar
    """
    try:
        broadcast = Broadcast.objects.get(id=broadcast_id)
        
        # IMPORTANTE: Actualizar estado a PROCESANDO al comenzar
        # Esto permite que el frontend vea el progreso en tiempo real
        broadcast.estado_transcodificacion = 'PROCESANDO'
        broadcast.save(update_fields=['estado_transcodificacion'])
        print(f"🎬 Iniciando transcodificación de broadcast {broadcast.id}")
        
        # Verificar que existe el archivo original
        if not broadcast.archivo_original:
            broadcast.estado_transcodificacion = 'ERROR'
            broadcast.last_error = 'No hay archivo original'
            broadcast.save(update_fields=['estado_transcodificacion', 'last_error'])
            return {'error': 'No hay archivo original'}

        # Obtener ruta física segura del archivo original
        try:
            input_path = broadcast.archivo_original.path
        except Exception:
            input_path = os.path.join(settings.MEDIA_ROOT, str(broadcast.archivo_original))
        if not os.path.exists(input_path):
            print(f"⚠️ Archivo original no encontrado inicialmente: {input_path}")
        # Si el archivo no existe exactamente como está guardado (ej. sin extensión),
        # intentamos localizar un archivo en /media/sources que empiece con el mismo nombre base.
        try:
            from pathlib import Path as _P
            if not os.path.exists(input_path):
                media_root = _P(settings.MEDIA_ROOT)
                sources_dir = media_root / 'sources'
                # nombre almacenado puede ser 'sources/ESsTY' -> tomamos solo 'ESsTY'
                stored_name = str(broadcast.archivo_original.name)
                base = _P(stored_name).name  # 'ESsTY' o 'ESsTY.mov'
                stem = _P(base).stem         # 'ESsTY'
                candidates = list(sources_dir.glob(f"{stem}*"))
                if candidates:
                    # Usar el primer candidato encontrado
                    input_path = str(candidates[0])
                    print(f"🔎 Archivo original no encontrado exacto, usando candidato: {input_path}")
                else:
                    print(f"⚠️ Archivo original no existe: {input_path}")
        except Exception as _e:
            print(f"⚠️ Fallback búsqueda archivo original falló: {_e}")
        
        # Usar solo los primeros 8 caracteres del UUID
        short_id = str(broadcast.id)[:8]
        
        # Crear directorios de salida si no existen
        support_dir = Path(settings.MEDIA_ROOT) / 'support'
        thumbnail_dir = Path(settings.MEDIA_ROOT) / 'thumbnails'
        pizarra_dir = Path(settings.MEDIA_ROOT) / 'pizarra'
        for d in (support_dir, thumbnail_dir, pizarra_dir):
            d.mkdir(parents=True, exist_ok=True)
        
        # Generar nombres de archivo con UUID corto (8 caracteres)
        output_h264_filename = f"{short_id}_h264.mp4"
        output_h264_path = support_dir / output_h264_filename
        
        # Generar nombre del thumbnail
        thumbnail_filename = f"{short_id}_thumb.jpg"
        thumbnail_path = thumbnail_dir / thumbnail_filename
        
        # Crear directorio para pizarra thumbnails
    # (creado arriba en bucle)
        
        # Generar nombre del pizarra thumbnail con UUID corto
        pizarra_filename = f"{short_id}_pizarra.jpg"
        pizarra_path = pizarra_dir / pizarra_filename

        # ====================================================================
        # PASO 1: DETECTAR DURACIÓN DEL VIDEO
        # ====================================================================
        print(f"⏱️  Detectando duración del video...")
        duration_command = [
            FFPROBE_BIN,
            '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            str(input_path)
        ]
        
        duration_result = subprocess.run(
            duration_command,
            check=True,
            capture_output=True
        )
        
        try:
            # Decode stdout safely in case of non-UTF8 bytes
            stdout_text = duration_result.stdout
            if isinstance(stdout_text, (bytes, bytearray)):
                stdout_text = stdout_text.decode('utf-8', 'replace')
            duration = float(stdout_text.strip())
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
            FFMPEG_BIN,
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
            capture_output=True
        )
        print(f"✓ Thumbnail generado: {thumbnail_path}")

        print(f"📸 Generando pizarra thumbnail...")
        pizarra_command = [
            FFMPEG_BIN,
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
            capture_output=True
        )
        print(f"✓ Pizarra generada: {pizarra_path}")

        # Guardar thumbnails de inmediato para que el frontend los vea aunque falle luego
        broadcast.thumbnail = f'thumbnails/{thumbnail_filename}'
        broadcast.pizarra_thumbnail = f'pizarra/{pizarra_filename}'
        broadcast.save(update_fields=['thumbnail', 'pizarra_thumbnail'])

        # ====================================================================
        # PASO 3: TRANSCODIFICAR A H.264 (archivo de soporte para reproducción)
        # ====================================================================
        output_h264_filename = f"{short_id}_h264.mp4"
        output_h264_path = support_dir / output_h264_filename

        # Construir comando base para transcodificación H.264
        command_h264 = [FFMPEG_BIN]

        # Agregar aceleración de hardware si está disponible
        if HW_ENCODER_CONFIG['hwaccel']:
            if HW_ENCODER_CONFIG['type'] == 'videotoolbox':
                # VideoToolbox no requiere -hwaccel explícito
                pass
            elif HW_ENCODER_CONFIG['type'] == 'nvenc':
                command_h264.extend(['-hwaccel', 'cuda', '-hwaccel_output_format', 'cuda'])
            elif HW_ENCODER_CONFIG['type'] == 'vaapi':
                command_h264.extend(['-hwaccel', 'vaapi', '-vaapi_device', HW_ENCODER_CONFIG['vaapi_device']])

        # Flags globales para mayor robustez de timestamps
        command_h264.extend(['-fflags', '+genpts'])

        command_h264.extend([
            '-i', str(input_path),
            '-c:v', HW_ENCODER_CONFIG['h264_encoder'],  # Usar encoder H.264 detectado
        ])

        # Configuración según el tipo de encoder
        if HW_ENCODER_CONFIG['type'] == 'videotoolbox':
            command_h264.extend([
                '-b:v', '6M',        # Bitrate objetivo 6 Mbps
                '-maxrate', '8M',    # Máximo 8 Mbps
                '-bufsize', '16M',
                '-allow_sw', '1',    # Permitimos fallback a software
            ])
        elif HW_ENCODER_CONFIG['type'] == 'nvenc':
            command_h264.extend([
                '-preset', 'p5',     # p5 = buena calidad/velocidad
                '-tune', 'hq',
                '-rc:v', 'vbr',
                '-cq', '23',
                '-b:v', '6M',
                '-maxrate', '9M',
                '-bufsize', '16M',
                '-spatial_aq', '1',
                '-aq-strength', '8',
                '-profile:v', 'high',
            ])
        elif HW_ENCODER_CONFIG['type'] == 'vaapi':
            command_h264.extend([
                '-qp', '22',
            ])
        else:  # software (x264)
            command_h264.extend([
                '-preset', 'faster',
                '-crf', '23',
                '-threads', '0',
            ])

        command_h264.extend([
            '-vf', 'yadif=0:-1:0,scale=-2:1080,setsar=1',
            '-pix_fmt', 'yuv420p',
            '-c:a', 'aac',
            '-ac', '2',
            '-b:a', '192k',
            '-movflags', '+faststart',
            '-max_muxing_queue_size', '4096',
            str(output_h264_path),
            '-y'
        ])

        print(f"🎬 Transcodificando H.264 con {HW_ENCODER_CONFIG['type'].upper()}: {' '.join(command_h264)}")

        # Ejecutar FFmpeg para H.264
        subprocess.run(
            command_h264,
            check=True,
            capture_output=True
        )
        print(f"✓ H.264 completado: {output_h264_path}")

        # ====================================================================
        # PASO 4: GUARDAR RUTAS EN EL MODELO Y MARCAR COMO COMPLETADO
        # ====================================================================
        print(f"💾 Guardando rutas en base de datos...")
        # Usar H.264 como archivo de soporte
        broadcast.ruta_h264 = f'support/{output_h264_filename}'
        # Proxy/HEVC no se genera en este flujo base
        broadcast.ruta_proxy = None
        broadcast.estado_transcodificacion = 'COMPLETADO'
        broadcast.last_error = None
        broadcast.save(update_fields=['ruta_proxy', 'ruta_h264', 'estado_transcodificacion', 'last_error'])
        print(f"✅ Transcodificación H.264 completada exitosamente para broadcast {broadcast.id}")

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
            errval = e.stderr
            try:
                if isinstance(errval, bytes):
                    err = errval.decode('utf-8', 'replace').strip()
                else:
                    err = (errval or '').strip()
            except Exception as _derr:
                err = f"stderr decode failed: {_derr}"
            if err and len(err) > 8000:
                err = err[-8000:]  # guardar los últimos 8k
            broadcast.last_error = err or f"FFmpeg error (code {e.returncode})"
            broadcast.save(update_fields=['estado_transcodificacion', 'last_error'])
            # Registrar error
            try:
                ProcessingError.objects.create(
                    repositorio=broadcast.repositorio,
                    modulo=broadcast.modulo,
                    directorio=broadcast.directorio,
                    broadcast=broadcast,
                    stage='transcode',
                    file_name=broadcast.nombre_original,
                    error_message=broadcast.last_error or 'FFmpeg error',
                    extra={'returncode': e.returncode}
                )
            except Exception as _pe:
                print(f"⚠️ No se pudo registrar ProcessingError (transcode): {_pe}")
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
            try:
                ProcessingError.objects.create(
                    repositorio=broadcast.repositorio,
                    modulo=broadcast.modulo,
                    directorio=broadcast.directorio,
                    broadcast=broadcast,
                    stage='transcode',
                    file_name=broadcast.nombre_original,
                    error_message=msg,
                    extra={}
                )
            except Exception as _pe:
                print(f"⚠️ No se pudo registrar ProcessingError (transcode generic): {_pe}")
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
        try:
            if 'broadcast' in locals():
                ProcessingError.objects.create(
                    repositorio=broadcast.repositorio,
                    modulo=broadcast.modulo,
                    directorio=broadcast.directorio,
                    broadcast=broadcast,
                    stage='encode_custom',
                    file_name=broadcast.nombre_original,
                    error_message=str(error_msg)[:8000],
                    extra={'returncode': e.returncode}
                )
        except Exception as _pe:
            print(f"⚠️ No se pudo registrar ProcessingError (encode_custom FFmpeg): {_pe}")
        return {
            'error': 'FFmpeg falló',
            'stderr': error_msg,
            'returncode': e.returncode
        }
    
    except Exception as e:
        # Cualquier otro error
        print(f"❌ Error en codificación: {str(e)}")
        try:
            if 'broadcast' in locals():
                ProcessingError.objects.create(
                    repositorio=broadcast.repositorio,
                    modulo=broadcast.modulo,
                    directorio=broadcast.directorio,
                    broadcast=broadcast,
                    stage='encode_custom',
                    file_name=broadcast.nombre_original,
                    error_message=str(e)[:8000],
                    extra={}
                )
        except Exception as _pe:
            print(f"⚠️ No se pudo registrar ProcessingError (encode_custom generic): {_pe}")
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
        print(f"❌ Error processing audio: {str(e)}")
        
        try:
            audio.estado_procesamiento = 'ERROR'
            audio.save()
        except Exception:
            pass
        
        # Registrar error de procesamiento de audio
        try:
            if 'audio' in locals():
                ProcessingError.objects.create(
                    repositorio=audio.repositorio,
                    modulo=audio.modulo,
                    directorio=audio.directorio,
                    audio=audio,
                    stage='audio_process',
                    file_name=audio.nombre_original,
                    error_message=str(e)[:8000],
                    extra={}
                )
        except Exception as _pe:
            print(f"⚠️ No se pudo registrar ProcessingError (audio_process): {_pe}")
        
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
        # Registrar error
        try:
            from .models import Audio
            audio = Audio.objects.get(id=audio_id)
            ProcessingError.objects.create(
                repositorio=audio.repositorio,
                modulo=audio.modulo,
                directorio=audio.directorio,
                audio=audio,
                stage='audio_encode',
                file_name=audio.nombre_original,
                error_message=str(e)[:8000],
                extra={}
            )
        except Exception as _pe:
            print(f"⚠️ No se pudo registrar ProcessingError (audio_encode): {_pe}")
        return {'error': str(e)}


@shared_task
def process_image(image_id):
    """
    Procesa una imagen con soporte para múltiples formatos:
    - Formatos estándar: JPG, PNG, GIF, BMP, TIFF
    - Formatos especiales: HEIC/HEIF (iOS), RAW (cámaras profesionales)
    - Formatos vectoriales: SVG (convertido a raster)
    
    1. Guarda el original en sources/
    2. Crea versión JPG optimizada en support/
    3. Crea thumbnail
    """
    from .models import ImageAsset
    from PIL import Image
    from django.core.files.base import ContentFile
    import io
    import os
    
    try:
        image_asset = ImageAsset.objects.get(id=image_id)
        image_asset.estado = 'PROCESANDO'
        image_asset.save()
        
        print(f"📸 Processing image: {image_asset.nombre_original}")
        
        original_path = image_asset.archivo_original.path
        file_ext = os.path.splitext(image_asset.nombre_original)[1].lower()
        img = None
        
        # ============================================
        # Special format handling
        # ============================================
        
        # HEIC/HEIF (fotos de iPhone/iPad)
        if file_ext in ['.heic', '.heif']:
            try:
                from pillow_heif import register_heif_opener
                register_heif_opener()
                img = Image.open(original_path)
                print(f"✓ HEIC/HEIF detected and converted")
            except Exception as e:
                print(f"⚠️ Error processing HEIC/HEIF: {e}")
                raise
        
        # RAW (Canon CR2, Nikon NEF, Sony ARW, etc.)
        elif file_ext in ['.raw', '.cr2', '.nef', '.arw', '.dng', '.orf', '.rw2', '.pef', '.srw']:
            try:
                import rawpy
                import numpy as np
                with rawpy.imread(original_path) as raw:
                    # Process RAW to RGB
                    rgb = raw.postprocess(
                        use_camera_wb=True,  # Use camera white balance
                        half_size=False,     # Maximum quality
                        no_auto_bright=False,
                        output_bps=8         # 8 bits per channel
                    )
                    # Convert numpy array to PIL Image
                    img = Image.fromarray(rgb)
                print(f"✓ RAW detected and converted")
            except Exception as e:
                print(f"⚠️ Error processing RAW: {e}")
                raise
        
        # SVG (vector - requires special conversion)
        elif file_ext == '.svg':
            try:
                # SVG cannot be processed directly by PIL
                # We treat it as a special file that stays as is
                # but create a placeholder thumbnail
                img = Image.new('RGB', (800, 600), color=(240, 240, 240))
                from PIL import ImageDraw, ImageFont
                draw = ImageDraw.Draw(img)
                draw.text((400, 300), "SVG", fill=(100, 100, 100), anchor="mm")
                print(f"✓ SVG detected - using placeholder")
            except Exception as e:
                print(f"⚠️ Error processing SVG: {e}")
                raise
        
        # Animated GIF (take first frame)
        elif file_ext == '.gif':
            img = Image.open(original_path)
            # For animated GIFs, take the first frame
            if hasattr(img, 'n_frames') and img.n_frames > 1:
                img.seek(0)  # First frame
                print(f"✓ Animated GIF detected - using first frame")
        
        # Formatos estándar (JPG, PNG, BMP, TIFF, etc.)
        else:
            img = Image.open(original_path)
        
        # ============================================
        # Conversión a RGB
        # ============================================
        if img.mode in ('RGBA', 'LA', 'P'):
            # Crear fondo blanco para imágenes con transparencia
            rgb_img = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            rgb_img.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
            img = rgb_img
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        # ============================================
        # Guardar metadata
        # ============================================
        image_asset.metadata = {
            'width': img.size[0],
            'height': img.size[1],
            'format': getattr(img, 'format', file_ext.replace('.', '').upper()),
            'mode': img.mode,
            'original_format': file_ext.replace('.', '').upper()
        }
        
        # ============================================
        # Crear versión JPG para web (support/)
        # ============================================
        web_io = io.BytesIO()
        # Optimizar tamaño si es muy grande (max 2048px en el lado más largo)
        max_size = 2048
        web_img = img.copy()
        if max(web_img.size) > max_size:
            web_img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
        
        # Optimizar: reducir calidad si la imagen es muy grande
        quality = 85 if web_img.size[0] * web_img.size[1] < 4000000 else 75
        web_img.save(web_io, format='JPEG', quality=quality, optimize=False)  # optimize=False es más rápido
        web_io.seek(0)
        
        web_filename = f"{Path(image_asset.nombre_original).stem}.jpg"
        image_asset.imagen_web.save(web_filename, ContentFile(web_io.read()), save=False)
        
        # ============================================
        # Crear thumbnail pequeño (más rápido)
        # ============================================
        thumb_img = img.copy()
        thumb_img.thumbnail((300, 300), Image.Resampling.BILINEAR)  # BILINEAR es más rápido que LANCZOS
        thumb_io = io.BytesIO()
        thumb_img.save(thumb_io, format='JPEG', quality=75, optimize=False)  # Menor calidad para thumbnails
        thumb_io.seek(0)
        
        thumb_filename = f"thumb_{Path(image_asset.nombre_original).stem}.jpg"
        image_asset.thumbnail.save(thumb_filename, ContentFile(thumb_io.read()), save=False)
        
        image_asset.estado = 'COMPLETADO'
        image_asset.save()
        
        print(f"✅ Image processed: {image_asset.nombre_original}")
        return {'status': 'success', 'image_id': str(image_id)}
        
    except Exception as e:
        print(f"❌ Error processing image {image_id}: {str(e)}")
        try:
            image_asset = ImageAsset.objects.get(id=image_id)
            image_asset.estado = 'ERROR'
            image_asset.last_error = str(e)
            image_asset.save()
            try:
                ProcessingError.objects.create(
                    repositorio=image_asset.repositorio,
                    modulo=image_asset.modulo,
                    directorio=image_asset.directorio,
                    imagen=image_asset,
                    stage='image_process',
                    file_name=image_asset.nombre_original,
                    error_message=str(e)[:8000],
                    extra={}
                )
            except Exception as _pe:
                print(f"⚠️ No se pudo registrar ProcessingError (image_process): {_pe}")
        except:
            pass
        return {'status': 'error', 'error': str(e)}


