#!/usr/bin/env python
"""Script para verificar aceleración de hardware en FFmpeg"""
import subprocess
import sys

def check_hardware_acceleration():
    """Verifica qué métodos de aceleración de hardware están disponibles"""
    
    print("=" * 60)
    print("VERIFICACIÓN DE ACELERACIÓN DE HARDWARE FFmpeg")
    print("=" * 60)
    
    # 1. Verificar hwaccels disponibles
    print("\n1. Hardware Acceleration Methods:")
    print("-" * 60)
    try:
        result = subprocess.run(
            ['ffmpeg', '-hide_banner', '-hwaccels'],
            capture_output=True,
            text=True
        )
        print(result.stdout)
    except Exception as e:
        print(f"Error: {e}")
    
    # 2. Verificar encoders de hardware
    print("\n2. Hardware Encoders Disponibles:")
    print("-" * 60)
    
    hw_encoders = [
        'h264_nvenc',    # NVIDIA
        'hevc_nvenc',    # NVIDIA
        'h264_vaapi',    # VAAPI (Intel/AMD)
        'hevc_vaapi',    # VAAPI
        'h264_qsv',      # Intel Quick Sync
        'hevc_qsv',      # Intel Quick Sync
        'h264_videotoolbox',  # Apple
        'hevc_videotoolbox',  # Apple
    ]
    
    available_encoders = []
    
    try:
        result = subprocess.run(
            ['ffmpeg', '-hide_banner', '-encoders'],
            capture_output=True,
            text=True
        )
        
        for encoder in hw_encoders:
            if encoder in result.stdout:
                available_encoders.append(encoder)
                print(f"✅ {encoder}")
            else:
                print(f"❌ {encoder}")
                
    except Exception as e:
        print(f"Error: {e}")
    
    # 3. Recomendar configuración
    print("\n3. Configuración Recomendada:")
    print("-" * 60)
    
    if 'h264_nvenc' in available_encoders:
        print("🎮 NVIDIA GPU detectada")
        print("   Usar: h264_nvenc / hevc_nvenc")
        print("   Comando ejemplo:")
        print("   ffmpeg -hwaccel cuda -i input.mov -c:v h264_nvenc -preset fast output.mp4")
        return 'nvenc'
        
    elif 'h264_vaapi' in available_encoders:
        print("💻 VAAPI (Intel/AMD) detectado")
        print("   Usar: h264_vaapi / hevc_vaapi")
        print("   Comando ejemplo:")
        print("   ffmpeg -hwaccel vaapi -vaapi_device /dev/dri/renderD128 -i input.mov -c:v h264_vaapi output.mp4")
        return 'vaapi'
        
    elif 'h264_qsv' in available_encoders:
        print("⚡ Intel Quick Sync detectado")
        print("   Usar: h264_qsv / hevc_qsv")
        return 'qsv'
        
    elif 'h264_videotoolbox' in available_encoders:
        print("🍎 Apple VideoToolbox detectado")
        print("   Usar: h264_videotoolbox / hevc_videotoolbox")
        return 'videotoolbox'
        
    else:
        print("⚠️  No se detectó aceleración de hardware")
        print("   Usar: libx264 / libx265 (software)")
        return 'software'
    
    # 4. Test de velocidad (opcional)
    print("\n4. Estado del Sistema:")
    print("-" * 60)
    
    # Verificar uso de CPU
    try:
        import psutil
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_count = psutil.cpu_count()
        print(f"CPU: {cpu_count} cores, {cpu_percent}% uso")
        
        memory = psutil.virtual_memory()
        print(f"RAM: {memory.percent}% usado ({memory.used / (1024**3):.1f}GB / {memory.total / (1024**3):.1f}GB)")
    except ImportError:
        print("psutil no disponible para monitoreo de sistema")
    
    print("\n" + "=" * 60)

if __name__ == '__main__':
    hw_type = check_hardware_acceleration()
    sys.exit(0 if hw_type != 'software' else 1)
