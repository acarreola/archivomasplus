#!/usr/bin/env python3
"""
Test script para verificar FFmpeg health endpoint
Requiere Django server corriendo en localhost:8000
"""
import requests
import sys
import json

# Configuración
BASE_URL = "http://localhost:8000"
ADMIN_USERNAME = "admin"  # Ajustar según tu superusuario
ADMIN_PASSWORD = "admin"   # Ajustar según tu password

def test_health():
    """Test ffmpeg health endpoint"""
    session = requests.Session()
    
    # 1. Login
    login_url = f"{BASE_URL}/api/auth/login/"
    login_data = {
        "username": ADMIN_USERNAME,
        "password": ADMIN_PASSWORD
    }
    
    print("🔐 Intentando login...")
    try:
        response = session.post(login_url, json=login_data)
        if response.status_code == 200:
            print("✅ Login exitoso")
        else:
            print(f"❌ Login falló: {response.status_code}")
            print(response.text)
            return False
    except Exception as e:
        print(f"❌ Error en login: {e}")
        return False
    
    # 2. Health check
    health_url = f"{BASE_URL}/api/health/ffmpeg/"
    print(f"\n🔍 Verificando FFmpeg health: {health_url}")
    
    try:
        response = session.get(health_url)
        if response.status_code == 200:
            data = response.json()
            print("✅ Health endpoint OK\n")
            print("📊 Resultados:")
            print(f"  - FFmpeg:  {data.get('ffmpeg', 'N/A')}")
            print(f"  - FFprobe: {data.get('ffprobe', 'N/A')}")
            print(f"  - Media root: {data.get('media_root', 'N/A')}")
            print(f"  - Exists: {data.get('media_root_exists', False)}")
            print(f"  - Writable: {data.get('media_root_writable', False)}")
            print("\n  Subdirectorios:")
            for subdir in data.get('subdirs', []):
                name = subdir.get('dir', '?')
                exists = subdir.get('exists', False)
                writable = subdir.get('writable', False)
                error = subdir.get('error')
                if error:
                    print(f"    - {name}: ❌ {error}")
                else:
                    status = "✅" if (exists and writable) else "⚠️"
                    print(f"    - {name}: {status} exists={exists}, writable={writable}")
            
            # Validar que ffmpeg está disponible
            if data.get('ffmpeg') == 'NOT_FOUND':
                print("\n⚠️  FFmpeg NO encontrado - instalar con: brew install ffmpeg")
                return False
            if data.get('ffprobe') == 'NOT_FOUND':
                print("\n⚠️  FFprobe NO encontrado - instalar con: brew install ffmpeg")
                return False
            if not data.get('media_root_writable'):
                print("\n⚠️  MEDIA_ROOT no es escribible - verificar permisos")
                return False
            
            print("\n🎉 Configuración FFmpeg OK - listo para procesar archivos")
            return True
            
        else:
            print(f"❌ Health check falló: {response.status_code}")
            print(response.text)
            return False
            
    except Exception as e:
        print(f"❌ Error en health check: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("FFmpeg Health Check - ArchivoPlus")
    print("=" * 60)
    
    success = test_health()
    sys.exit(0 if success else 1)
