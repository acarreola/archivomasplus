# 🎬 ArchivoPlus - Sistema de Gestión de Archivos Multimedia

**ArchivoPlus** es una plataforma completa para la gestión, procesamiento y distribución de archivos multimedia (video y audio) con capacidades de transcodificación automática, encoding personalizado y streaming optimizado.

## 📋 Características Principales

### 🎥 **Gestión de Video**
- Upload masivo de archivos multimedia
- Transcodificación automática a H.265/HEVC para optimización
- Encoding personalizado con múltiples presets (H.264, ProRes, DNxHD, VP9)
- Generación automática de thumbnails y previews
- Streaming progresivo optimizado
- Safety areas para broadcast (Action Safe 5%, Title Safe 10%)

### 🎵 **Gestión de Audio** 
- Procesamiento de archivos de audio
- Visualización de waveforms interactivas
- Encoding a múltiples formatos
- Player integrado con controles avanzados

### 🏢 **Gestión Empresarial**
- Repositorios organizados por cliente/agencia
- Sistema de permisos granular por usuario
- Módulos configurables (video/audio)
- Directorios jerárquicos para organización
- Pizarras publicitarias con metadata

### � **Procesamiento Asíncrono**
- Cola de procesamiento con Celery
- Monitoreo en tiempo real de tareas
- Reintento automático de fallos
- Notificaciones de estado

### 🚀 **Tecnologías**
- **Backend**: Django REST Framework + PostgreSQL
- **Frontend**: React + Vite + Tailwind CSS  
- **Procesamiento**: FFmpeg + Celery + Redis
- **Contenedores**: Docker + Docker Compose
- **Proxy**: Nginx con optimizaciones para streaming

---

## 💻 Configuración Nativa para Mac M4 como Servidor

### 🔧 **Requerimientos de Hardware**
- **Mac M4** (cualquier configuración - Mini, iMac, MacBook Pro)
- **RAM**: Mínimo 16GB (32GB recomendado para procesamiento intensivo)
- **Almacenamiento**: Mínimo 500GB SSD (1TB+ recomendado)
- **Red**: Conexión Ethernet Gigabit (recomendado para streaming)

### 🛠️ **Software Requerido**

#### **1. Herramientas Base del Sistema**

```bash
# Instalar Xcode Command Line Tools (requerido para compilar)
xcode-select --install

# Instalar Homebrew (gestor de paquetes para macOS)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Agregar Homebrew al PATH (Mac M4 usa /opt/homebrew)
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

#### **2. Python y Entorno de Desarrollo**

```bash
# Python 3.11 (versión recomendada para Django 5.2.7)
brew install python@3.11

# Crear alias para python3.11
echo 'alias python=/opt/homebrew/bin/python3.11' >> ~/.zshrc
echo 'alias pip=/opt/homebrew/bin/pip3.11' >> ~/.zshrc
source ~/.zshrc

# Pip y herramientas de Python
python -m pip install --upgrade pip
python -m pip install virtualenv pipenv
```

#### **3. Node.js y Frontend**

```bash
# Node.js 20 LTS (para React + Vite)
brew install node@20

# npm y yarn
npm install -g yarn pnpm

# PM2 para gestionar procesos Node.js
npm install -g pm2
```

#### **4. Base de Datos Nativa**

```bash
# PostgreSQL 15 (nativo, sin containers)
brew install postgresql@15

# Configurar PostgreSQL para auto-inicio
brew services start postgresql@15
echo 'export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Crear base de datos de producción
createdb archivoplus_prod
```

#### **5. Redis (Cache y Celery)**

```bash
# Redis nativo
brew install redis

# Configurar Redis para auto-inicio
brew services start redis

# Configurar Redis con password
echo 'requirepass tu_password_redis_seguro' >> /opt/homebrew/etc/redis.conf
brew services restart redis
```

#### **6. FFmpeg Optimizado para Apple Silicon**

```bash
# FFmpeg con soporte completo (libx264, libx265, VideoToolbox, etc)
brew install ffmpeg

# Verificar instalación y codecs disponibles para Mac M4
which ffmpeg
ffmpeg -version
ffmpeg -codecs | grep -E "(h264|hevc|videotoolbox)"

# Verificar ffprobe (requerido para metadata)
which ffprobe
ffprobe -version
```

**Configuración de Variables de Entorno (Opcional)**

Si instalas FFmpeg en una ubicación personalizada o quieres especificar rutas exactas:

```bash
# Homebrew Apple Silicon (recomendado)
echo 'export FFMPEG_BIN=/opt/homebrew/bin/ffmpeg' >> ~/.zshrc
echo 'export FFPROBE_BIN=/opt/homebrew/bin/ffprobe' >> ~/.zshrc

# Homebrew Intel
# export FFMPEG_BIN=/usr/local/bin/ffmpeg
# export FFPROBE_BIN=/usr/local/bin/ffprobe

# Aplicar cambios
source ~/.zshrc
```

**Nota**: El sistema detectará automáticamente `ffmpeg` y `ffprobe` si están en PATH. Solo necesitas las variables de entorno si usas binarios en ubicaciones personalizadas.

#### **7. Nginx (Servidor Web y Proxy)**

```bash
# Nginx nativo
brew install nginx

# Configurar Nginx para auto-inicio
brew services start nginx

# Ubicación de configuración: /opt/homebrew/etc/nginx/nginx.conf
```

#### **8. Herramientas de Sistema**

```bash
# Git (control de versiones)
brew install git

# Herramientas de monitoreo y utilidades
brew install htop curl wget jq tree watch

# Supervisor para gestionar procesos Python
pip install supervisor
```

### 🌐 **Configuración de Red (Servidor)**

#### **1. Configurar IP Estática (Recomendado)**

```bash
# Obtener información de red actual
ifconfig en0  # Ethernet
ifconfig en1  # Wi-Fi

# Configurar IP estática desde Preferencias del Sistema:
# Sistema > Red > Ethernet/Wi-Fi > Detalles > TCP/IP
# Configurar IPv4: Manualmente
# IP: 192.168.1.100 (ejemplo)
# Máscara: 255.255.255.0
# Router: 192.168.1.1 (tu gateway)
# DNS: 8.8.8.8, 1.1.1.1
```

#### **2. Configurar Firewall**

```bash
# Habilitar firewall de macOS
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on

# Permitir conexiones entrantes para Docker
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /Applications/Docker.app
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp /Applications/Docker.app
```

---

## 🚀 Instalación y Configuración Nativa

### **Paso 1: Preparar el Servidor**

```bash
# Crear directorio de trabajo
mkdir -p ~/Servers/ArchivoPlus
cd ~/Servers/ArchivoPlus

# Clonar repositorio (o extraer el paquete de producción)
git clone https://github.com/tu-usuario/archivoplus.git .
# O extraer: tar -xzf archivoplus-production-*.tar.gz
```

### **Paso 2: Configurar Base de Datos**

```bash
# Crear usuario y base de datos PostgreSQL
createuser -s archivoplus_user
createdb -O archivoplus_user archivoplus_prod

# Configurar password para el usuario
psql -c "ALTER USER archivoplus_user PASSWORD 'tu_password_seguro';"
```

### **Paso 3: Configurar Backend (Django)**

```bash
# Crear entorno virtual Python
python -m venv venv_archivoplus
source venv_archivoplus/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
```

**Variables críticas en `.env`:**
```bash
# Django
DEBUG=True
SECRET_KEY=your-secret-key-here-change-in-production
ALLOWED_HOSTS=localhost,127.0.0.1,192.168.1.100

# Base de datos (PostgreSQL nativo)
DATABASE_URL=postgresql://archivoplus_user:tu_password_seguro@localhost:5432/archivoplus_prod

# Redis (nativo - opcional para Celery)
# CELERY_BROKER_URL=redis://localhost:6379/0
# CELERY_RESULT_BACKEND=redis://localhost:6379/0

# FFmpeg (detecta automáticamente si está en PATH)
# Solo configurar si usas binarios personalizados:
# FFMPEG_BIN=/opt/homebrew/bin/ffmpeg
# FFPROBE_BIN=/opt/homebrew/bin/ffprobe

# Media storage
# MEDIA_ROOT=/path/to/your/media
# Si no se especifica, usa BASE_DIR/media

# CORS (ajustar según tu frontend)
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

**Verificar configuración de FFmpeg:**
```bash
# El sistema detectará automáticamente ffmpeg si está instalado vía Homebrew
# Puedes verificar con el health endpoint después de iniciar el servidor:
# GET /api/health/ffmpeg/ (requiere autenticación admin)
```

### **Paso 4: Configurar Frontend (React)**

```bash
# Navegar al directorio frontend
cd frontend

# Instalar dependencias
npm install

# Configurar variables de entorno del frontend
cp .env.example .env.local
echo "VITE_API_URL=http://192.168.1.100:8000" > .env.local

# Construir para producción
npm run build

# El build estará en: frontend/dist/
```

### **Paso 5: Configurar Nginx**

```bash
# Crear configuración de Nginx
sudo nano /opt/homebrew/etc/nginx/nginx.conf
```

**Configuración Nginx optimizada:**
```nginx
worker_processes auto;
worker_rlimit_nofile 65535;

events {
    worker_connections 4096;
    use kqueue;  # Optimizado para macOS
}

http {
    include       mime.types;
    default_type  application/octet-stream;
    
    # Optimizaciones para Mac M4
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    
    # Compresión
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    
    # Servidor frontend (React)
    server {
        listen 80;
        server_name localhost 192.168.1.100 tu-mac-m4.local;
        
        # Servir React build
        location / {
            root /Users/tu-usuario/Servers/ArchivoPlus/frontend/dist;
            try_files $uri $uri/ /index.html;
        }
        
        # Proxy para API Django
        location /api/ {
            proxy_pass http://127.0.0.1:8000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
        
        # Servir archivos multimedia
        location /media/ {
            alias /Users/tu-usuario/Servers/ArchivoPlus/media/;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        # Servir archivos estáticos
        location /static/ {
            alias /Users/tu-usuario/Servers/ArchivoPlus/static/;
            expires 1y;
            add_header Cache-Control "public";
        }
    }
}
```

### **Paso 6: Inicializar la Aplicación**

```bash
# Regresar al directorio raíz
cd ~/Servers/ArchivoPlus

# Activar entorno virtual
source venv_archivoplus/bin/activate

# Ejecutar migraciones
python manage.py migrate

# Crear superusuario
python manage.py createsuperuser
# Usuario: admin
# Email: admin@admin.com  
# Password: admin123

# Recolectar archivos estáticos
python manage.py collectstatic --noinput

# Crear directorios para media
mkdir -p media/originals media/transcoded
```

### **Paso 7: Lanzar Servicios con PM2**

```bash
# Crear archivo de configuración PM2
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'archivoplus-backend',
      script: 'venv_archivoplus/bin/python',
      args: 'manage.py runserver 127.0.0.1:8000',
      cwd: '/Users/tu-usuario/Servers/ArchivoPlus',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'archivoplus-celery',
      script: 'venv_archivoplus/bin/python',
      args: '-m celery -A archivoplus_backend worker -l info --concurrency=8',
      cwd: '/Users/tu-usuario/Servers/ArchivoPlus',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '4G'
    },
    {
      name: 'archivoplus-celery-beat',
      script: 'venv_archivoplus/bin/python',
      args: '-m celery -A archivoplus_backend beat -l info',
      cwd: '/Users/tu-usuario/Servers/ArchivoPlus',
      instances: 1,
      autorestart: true,
      watch: false
    }
  ]
};
EOF

# Lanzar aplicaciones con PM2
pm2 start ecosystem.config.js

# Verificar que estén corriendo
pm2 status

# Configurar PM2 para auto-inicio
pm2 startup
pm2 save
```

### **Paso 8: Verificación**

```bash
# Verificar servicios
brew services list | grep -E "(postgresql|redis|nginx)"

# Verificar procesos PM2
pm2 status

# Test de conectividad local
curl http://localhost/api/health/
curl http://localhost/

# Test desde otra máquina en la red
curl http://192.168.1.100/api/health/
```

---

## 🔧 Optimizaciones Específicas para Mac M4 Nativo

### **1. Aprovechamiento Máximo del Procesador M4**

```bash
# Verificar cores disponibles en tu Mac M4
sysctl -n hw.ncpu          # Total de cores
sysctl -n hw.perflevel0.physicalcpu  # Cores de performance
sysctl -n hw.perflevel1.physicalcpu  # Cores de eficiencia

# Configurar Python para usar todos los cores
export PYTHONUNBUFFERED=1
export OMP_NUM_THREADS=10  # Ajustar según tu modelo M4
```

### **2. Optimización de FFmpeg Nativo**

```bash
# Verificar aceleración de hardware disponible
ffmpeg -hide_banner -hwaccels

# Variables de entorno para máximo rendimiento
export FFMPEG_THREADS=10
export FFMPEG_HWACCEL=videotoolbox
export FFMPEG_PRESET=fast
```

**Configuración avanzada en settings.py:**
```python
# Optimizaciones específicas para Mac M4
import os
import multiprocessing

# Usar todos los cores disponibles
FFMPEG_THREADS = min(multiprocessing.cpu_count(), 12)

# Configuración de Celery optimizada para M4
CELERY_WORKER_CONCURRENCY = 8  # Procesos paralelos
CELERY_WORKER_MAX_TASKS_PER_CHILD = 10  # Evitar memory leaks
CELERY_TASK_ROUTES = {
    'core.tasks.transcode_video': {'queue': 'video_processing'},
    'core.tasks.encode_custom_video': {'queue': 'video_processing'},
}

# Optimizaciones de memoria para procesamiento de video
CELERY_WORKER_PREFETCH_MULTIPLIER = 1
CELERY_TASK_ACKS_LATE = True
```

### **3. Configuración de PostgreSQL para M4**

```bash
# Editar configuración PostgreSQL
nano /opt/homebrew/var/postgresql@15/postgresql.conf
```

**Optimizaciones PostgreSQL:**
```ini
# Aprovechar la memoria del Mac M4
shared_buffers = 4GB                    # 25% de tu RAM
effective_cache_size = 12GB             # 75% de tu RAM
work_mem = 256MB                        # Para queries complejas
maintenance_work_mem = 1GB              # Para VACUUM, CREATE INDEX

# Optimizaciones para Apple Silicon
max_connections = 200
checkpoint_segments = 64                # Para writes intensivos
wal_buffers = 16MB
random_page_cost = 1.1                  # SSD optimization
effective_io_concurrency = 200          # SSD concurrent I/O

# Logging optimizado
log_min_duration_statement = 1000       # Log queries > 1s
log_checkpoints = on
log_lock_waits = on
```

### **4. Optimización de Redis**

```bash
# Editar configuración Redis
nano /opt/homebrew/etc/redis.conf
```

**Configuración Redis optimizada:**
```ini
# Memoria optimizada para M4
maxmemory 2gb
maxmemory-policy allkeys-lru

# Persistencia optimizada para SSD
save 900 1      # Al menos 1 key cambia en 15 min
save 300 10     # Al menos 10 keys cambian en 5 min
save 60 10000   # Al menos 10000 keys cambian en 1 min

# Red optimization
tcp-keepalive 300
timeout 0

# Apple Silicon optimizations
lazyfree-lazy-eviction yes
lazyfree-lazy-expire yes
lazyfree-lazy-server-del yes
```

### **5. Configuraciones del Sistema macOS**

```bash
# Aumentar límites del sistema para alta concurrencia
sudo launchctl limit maxfiles 65536 200000
ulimit -n 65536

# Optimizar kernel parameters para network performance
sudo sysctl -w net.inet.tcp.win_scale_factor=8
sudo sysctl -w net.inet.tcp.sendspace=131072
sudo sysctl -w net.inet.tcp.recvspace=131072

# Disable spotlight indexing en directorio de media (opcional)
sudo mdutil -i off /Users/$(whoami)/Servers/ArchivoPlus/media
```

### **6. Monitoreo de Rendimiento**

```bash
# Script de monitoreo específico para M4
cat > monitor_m4.sh << 'EOF'
#!/bin/bash
echo "=== Mac M4 ArchivoPlus Performance Monitor ==="
echo "CPU Info:"
sysctl -n machdep.cpu.brand_string
echo "Cores: $(sysctl -n hw.ncpu)"
echo "Performance Cores: $(sysctl -n hw.perflevel0.physicalcpu)"
echo "Efficiency Cores: $(sysctl -n hw.perflevel1.physicalcpu)"
echo ""

echo "Memory Usage:"
vm_stat | perl -ne '/page size of (\d+)/ and $size=$1; /Pages\s+([^:]+):\s+(\d+)/ and printf("%-16s % 16.2f MB\n", "$1:", $2*$size/1048576)'

echo ""
echo "Active Processes:"
pm2 status

echo ""
echo "Database Connections:"
psql -d archivoplus_prod -c "SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = 'active';"

echo ""
echo "Redis Info:"
redis-cli info memory | grep used_memory_human
EOF

chmod +x monitor_m4.sh
```

---

## 📊 Monitoreo y Mantenimiento

### **Comandos Útiles**

```bash
# Ver estado general del sistema
htop

# Monitorear containers Docker
docker stats

# Ver logs en tiempo real
docker compose -f docker-compose.prod.yml logs -f [servicio]

# Backup de base de datos
docker compose -f docker-compose.prod.yml exec db pg_dump -U archivoplus_user archivoplus_prod > backup_$(date +%Y%m%d).sql

# Limpiar espacio en disco
docker system prune -f
docker volume prune -f
```

### **Automatización con Launchd (macOS)**

#### **1. Servicio para PostgreSQL**
```bash
# PostgreSQL ya se gestiona con brew services
brew services start postgresql@15
```

#### **2. Servicio para Redis**
```bash  
# Redis ya se gestiona con brew services
brew services start redis
```

#### **3. Servicio para Nginx**
```bash
# Nginx ya se gestiona con brew services  
brew services start nginx
```

#### **4. Servicio Principal ArchivoPlus**
```bash
# Crear archivo de servicio principal
sudo nano /Library/LaunchDaemons/com.archivoplus.server.plist
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.archivoplus.server</string>
    <key>ProgramArguments</key>
    <array>
        <string>/opt/homebrew/bin/pm2</string>
        <string>resurrect</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/Users/tu-usuario/Servers/ArchivoPlus</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <false/>
    <key>StandardOutPath</key>
    <string>/Users/tu-usuario/Servers/ArchivoPlus/logs/launchd.out</string>
    <key>StandardErrorPath</key>
    <string>/Users/tu-usuario/Servers/ArchivoPlus/logs/launchd.err</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
    </dict>
</dict>
</plist>
```

```bash
# Crear directorio de logs
mkdir -p ~/Servers/ArchivoPlus/logs

# Activar servicio
sudo launchctl load /Library/LaunchDaemons/com.archivoplus.server.plist
sudo launchctl start com.archivoplus.server

# Verificar servicios de sistema
brew services list | grep -E "(postgresql|redis|nginx)"
```

#### **5. Script de inicio completo**
```bash
# Crear script de inicio manual
cat > start_archivoplus.sh << 'EOF'
#!/bin/bash
echo "🚀 Iniciando ArchivoPlus en Mac M4..."

# Verificar y iniciar servicios base
echo "📊 Verificando servicios base..."
brew services start postgresql@15
brew services start redis  
brew services start nginx

# Esperar a que las bases de datos estén listas
echo "⏳ Esperando a que PostgreSQL esté listo..."
until pg_isready; do sleep 1; done

echo "⏳ Esperando a que Redis esté listo..."  
until redis-cli ping; do sleep 1; done

# Activar entorno virtual
echo "🐍 Activando entorno Python..."
source venv_archivoplus/bin/activate

# Verificar migraciones
echo "📦 Verificando migraciones..."
python manage.py migrate --check || python manage.py migrate

# Iniciar aplicaciones con PM2
echo "🚀 Iniciando aplicaciones..."
pm2 start ecosystem.config.js

echo "✅ ArchivoPlus iniciado correctamente!"
echo "🌐 Frontend: http://192.168.1.100/"
echo "🔧 API: http://192.168.1.100/api/"
echo "👨‍💼 Admin: http://192.168.1.100/admin/"

pm2 status
EOF

chmod +x start_archivoplus.sh
```

---

## 🌐 Acceso al Sistema

Una vez configurado, el sistema estará disponible en:

- **Frontend**: `http://192.168.1.100/` (Puerto 80 - Nginx)
- **API**: `http://192.168.1.100/api/` (Proxy a Django en puerto 8000)
- **Admin Django**: `http://192.168.1.100/admin/`
- **Media Files**: `http://192.168.1.100/media/`

### **Puertos Utilizados (Nativos)**

- **Puerto 80**: Nginx (Frontend React + Proxy API)
- **Puerto 8000**: Django Backend (Solo localhost)
- **Puerto 5432**: PostgreSQL (Solo localhost) 
- **Puerto 6379**: Redis (Solo localhost)
- **Puerto 5555**: Flower (Monitor Celery - Opcional)

### **Acceso desde Otras Máquinas en la Red**

```bash
# Desde cualquier dispositivo en la misma red
http://192.168.1.100/           # Frontend principal
http://tu-mac-m4.local/         # Si mDNS está habilitado

# Verificar conectividad desde otra máquina
ping 192.168.1.100
curl http://192.168.1.100/api/health/
```

### **Configurar mDNS/Bonjour (Opcional)**

```bash
# Habilitar compartir archivos para mDNS
sudo systemsetup -setremotelogin on

# Verificar nombre mDNS
scutil --get LocalHostName

# El sistema será accesible como:
# http://nombre-mac.local/
```

---

## 🆘 Troubleshooting

### **Problemas Comunes**

1. **PostgreSQL no inicia**: 
   ```bash
   brew services restart postgresql@15
   tail -f /opt/homebrew/var/log/postgresql@15.log
   ```

2. **Redis no conecta**:
   ```bash
   brew services restart redis
   redis-cli ping
   ```

3. **Puerto 80 ocupado**:
   ```bash
   sudo lsof -i :80
   # Cambiar puerto en nginx.conf si es necesario
   ```

4. **PM2 no inicia aplicaciones**:
   ```bash
   pm2 delete all
   pm2 start ecosystem.config.js
   pm2 logs
   ```

5. **FFmpeg falla**:
   ```bash
   # Verificar FFmpeg con VideoToolbox
   ffmpeg -hwaccels | grep videotoolbox
   
   # Reinstalar si es necesario
   brew uninstall ffmpeg
   brew install ffmpeg
   ```

6. **Permisos de archivo**:
   ```bash
   sudo chown -R $(whoami) ~/Servers/ArchivoPlus
   chmod 755 ~/Servers/ArchivoPlus/media
   ```

### **Logs Importantes**

```bash
# Sistema macOS
tail -f /var/log/system.log

# PostgreSQL
tail -f /opt/homebrew/var/log/postgresql@15.log

# Redis  
tail -f /opt/homebrew/var/log/redis.log

# Nginx
tail -f /opt/homebrew/var/log/nginx/error.log
tail -f /opt/homebrew/var/log/nginx/access.log

# PM2 Applications
pm2 logs archivoplus-backend
pm2 logs archivoplus-celery
pm2 monit  # Monitor en tiempo real

# Django específico
tail -f ~/Servers/ArchivoPlus/logs/django.log

# Celery específico  
tail -f ~/Servers/ArchivoPlus/logs/celery.log
```

### **Comandos de Diagnóstico**

```bash
# Verificar todos los servicios
./monitor_m4.sh

# Test completo del sistema
curl -I http://localhost/
curl -I http://localhost/api/health/
pg_isready -d archivoplus_prod
redis-cli ping

# Verificar procesos activos
ps aux | grep -E "(nginx|postgres|redis|python|pm2)"

# Verificar puertos en uso
netstat -an | grep -E "(80|8000|5432|6379)"

# Performance del sistema
htop
iostat 1 5
```

---

## 📚 Archivos de Configuración Incluidos

- `docker-compose.prod.yml` - Stack completo para producción
- `.env.production.template` - Variables de entorno
- `deploy.sh` - Script de despliegue automático
- `DEPLOYMENT_GUIDE.md` - Guía completa de instalación
- `nginx/` - Configuración de proxy y optimización

---

## 🤝 Desarrollo Local

Para desarrollar en tu Mac M4 de forma nativa:

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/archivoplus.git
cd archivoplus

# Configurar entorno de desarrollo
python -m venv venv_dev
source venv_dev/bin/activate
pip install -r requirements.txt

# Frontend en modo desarrollo
cd frontend
npm install
npm run dev  # Se ejecuta en puerto 5173

# Backend en modo desarrollo (otra terminal)
python manage.py runserver 127.0.0.1:8000

# Celery worker para desarrollo (tercera terminal)
source venv_dev/bin/activate
celery -A archivoplus_backend worker -l info
```

### **Configuración de Desarrollo vs Producción**

| Aspecto | Desarrollo | Producción |
|---------|------------|------------|
| **Frontend** | Vite dev server (5173) | Build servido por Nginx (80) |
| **Backend** | runserver (8000) | PM2 + Gunicorn (8000) |
| **Base Datos** | SQLite (db.sqlite3) | PostgreSQL nativo |
| **Cache** | Django cache | Redis nativo |
| **Archivos** | Servidos por Django | Servidos por Nginx |
| **Hot Reload** | ✅ Automático | ❌ Requiere rebuild |

---

## 📈 Ventajas de la Instalación Nativa en Mac M4

### **🚀 Performance**
- **Sin virtualización**: Acceso directo a todos los cores del M4
- **VideoToolbox nativo**: Aceleración de hardware Apple para video
- **Memoria unificada**: Aprovecha la arquitectura de memoria del M4
- **SSD optimizado**: I/O directo sin capas de abstracción

### **🔧 Gestión Simplificada**
- **Homebrew**: Gestión nativa de dependencias macOS
- **PM2**: Control granular de procesos Python/Node.js
- **Launchd**: Integración nativa con el sistema de servicios macOS
- **Sin overhead**: No hay containers consumiendo recursos extra

### **📊 Monitoreo Native**
- **Activity Monitor**: Monitoreo nativo del sistema
- **Console.app**: Logs centralizados del sistema
- **Instrumentos**: Profiling detallado si es necesario
- **htop/iostat**: Métricas en tiempo real

---

**🎯 ¡Tu Mac M4 aprovechará al 100% sus recursos nativos para ArchivoPlus!**

**Recursos adicionales:**
- `MAC_M4_SETUP_CHECKLIST.md` - Lista de verificación paso a paso
- `DEPLOYMENT_GUIDE.md` - Guía detallada (si necesitas Docker)
- Soporte nativo para Apple Silicon sin virtualización
"
```

4. Acceder a la aplicación:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- Login: admin / admin123

## Estructura del Proyecto

```
archivoplus/
├── archivoplus_backend/    # Configuración Django
├── core/                    # App principal
│   ├── models.py           # Modelos (Broadcast, Repositorio, etc)
│   ├── views.py            # ViewSets y APIs
│   ├── serializers.py      # Serializadores DRF
│   ├── tasks.py            # Tareas Celery
│   └── migrations/         # Migraciones de DB
├── frontend/               # Aplicación React
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   ├── context/       # Context providers
│   │   └── utils/         # Utilidades
│   └── package.json
├── media/                  # Archivos subidos
│   ├── originals/         # Videos originales
│   └── transcoded/        # Videos transcodificados
├── docker-compose.yml
└── Dockerfile
```

## Modelos Principales

### Broadcast
Representa un archivo de video con:
- Archivo original
- Versiones transcodificadas (H.264, H.265, Proxy)
- Thumbnails
- Metadata (pizarra con cliente, agencia, producto, etc)
- Estado de transcodificación

### Repositorio
Contenedor de archivos con:
- Módulos (tipos de archivos permitidos)
- Permisos por usuario
- Sistema de directorios

### CustomUser
Usuarios con:
- Perfil (permisos granulares)
- Repositorios asignados
- Información de contacto

## API Endpoints

### Autenticación
- `POST /api/auth/login/` - Login
- `POST /api/auth/logout/` - Logout
- `GET /api/auth/me/` - Usuario actual

### Broadcasts
- `GET /api/broadcasts/` - Listar broadcasts
- `POST /api/broadcasts/` - Subir nuevo broadcast
- `GET /api/broadcasts/{id}/` - Detalle
- `DELETE /api/broadcasts/{id}/` - Eliminar
- `POST /api/broadcasts/cancel_all_processing/` - Cancelar procesos atascados

### Repositorios
- `GET /api/repositorios/` - Listar repositorios
- `POST /api/repositorios/` - Crear repositorio

### Directorios
- `GET /api/directorios/` - Listar directorios
- `POST /api/directorios/` - Crear directorio

## Transcodificación

El sistema usa FFmpeg con:
- **H.264**: libx264 (software) o h264_videotoolbox (macOS)
- **H.265**: libx265 (software) o hevc_videotoolbox (macOS)
- **Proxy**: 480p para preview rápido

Los archivos transcodificados se generan automáticamente al subir un video.

## Desarrollo

### Backend
```bash
docker-compose exec backend python manage.py shell
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Notas Importantes

- El sistema detecta automáticamente si hay encoders de hardware disponibles
- Los videos se procesan de forma asíncrona con Celery
- Los archivos originales se mantienen siempre
- El sistema usa sesiones de Django para autenticación

## Licencia

Propietario - Todos los derechos reservados

## Autor

Desarrollado para archivo+
Fecha: Octubre 2025
