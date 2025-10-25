# 📦 Lista de Instalación para Mac M4 - ArchivoPlus Server

## 🖥️ Preparación del Hardware
- [ ] **Mac M4** configurado y funcionando
- [ ] **Conexión Ethernet** (recomendado) o Wi-Fi estable
- [ ] **Mínimo 16GB RAM** (32GB recomendado)
- [ ] **Mínimo 500GB almacenamiento libre** (1TB+ recomendado)

## 🔧 Instalación Base del Sistema

### 1. Herramientas de Desarrollo
```bash
# Xcode Command Line Tools (OBLIGATORIO)
xcode-select --install
```
- [ ] Xcode Command Line Tools instalado

### 2. Homebrew (Gestor de Paquetes)
```bash
# Instalar Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Configurar PATH para Mac M4
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```
- [ ] Homebrew instalado y configurado

### 3. Docker (CRÍTICO)
**Opción A - Docker Desktop (Recomendado):**
```bash
# Descargar desde: https://www.docker.com/products/docker-desktop/
# IMPORTANTE: Seleccionar "Apple Silicon" para Mac M4
```
- [ ] Docker Desktop descargado e instalado
- [ ] Docker Desktop configurado con recursos suficientes:
  - [ ] CPUs: 8+ cores
  - [ ] Memory: 16GB+ 
  - [ ] Disk: 500GB+

**Opción B - Docker CLI:**
```bash
brew install docker docker-compose colima
colima start --arch aarch64 --vm-type=vz --vz-rosetta --memory 16 --cpu 8
```
- [ ] Docker CLI y Colima instalados y configurados

### 4. Herramientas Básicas
```bash
# Git para control de versiones
brew install git

# Herramientas de monitoreo y utilidades
brew install htop curl wget jq tree

# Node.js (opcional - se puede usar en container)
brew install node@20

# Python (opcional - se puede usar en container) 
brew install python@3.11

# FFmpeg (opcional - se incluye en containers)
brew install ffmpeg
```
- [ ] Git instalado
- [ ] Herramientas de monitoreo instaladas
- [ ] Node.js instalado (opcional)
- [ ] Python 3.11 instalado (opcional)
- [ ] FFmpeg instalado (opcional)

## 🌐 Configuración de Red

### 1. IP Estática (Recomendado)
```bash
# Obtener información actual
ifconfig en0  # Ethernet
ifconfig en1  # Wi-Fi
```
- [ ] IP estática configurada desde Preferencias del Sistema
- [ ] Configuración manual IPv4:
  - [ ] IP: `192.168.1.100` (ejemplo - ajustar según tu red)
  - [ ] Máscara: `255.255.255.0`
  - [ ] Router/Gateway: `192.168.1.1` (ajustar según tu red)
  - [ ] DNS: `8.8.8.8, 1.1.1.1`

### 2. Firewall de macOS
```bash
# Habilitar firewall
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on

# Permitir Docker
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /Applications/Docker.app
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp /Applications/Docker.app
```
- [ ] Firewall habilitado
- [ ] Docker permitido en firewall

### 3. Hostname (Opcional)
```bash
sudo scutil --set HostName archivoplus-server
sudo scutil --set LocalHostName archivoplus-server  
sudo scutil --set ComputerName "ArchivoPlus Server"
```
- [ ] Hostname configurado

## 📁 Preparación del Proyecto

### 1. Directorio de Trabajo
```bash
mkdir -p ~/Servers/ArchivoPlus
cd ~/Servers/ArchivoPlus
```
- [ ] Directorio creado

### 2. Obtener Código Fuente
**Opción A - Paquete de Producción:**
```bash
# Subir y extraer el archivo comprimido
scp archivoplus-production-*.tar.gz usuario@mac-m4:/Users/usuario/Servers/ArchivoPlus/
tar -xzf archivoplus-production-*.tar.gz
```

**Opción B - Repositorio Git:**
```bash
git clone https://github.com/usuario/archivoplus.git .
```
- [ ] Código fuente obtenido y extraído

### 3. Configuración de Variables
```bash
# Copiar template
cp .env.production.template .env

# Editar configuración (CRÍTICO)
nano .env
```

**Variables OBLIGATORIAS a cambiar:**
- [ ] `POSTGRES_PASSWORD=tu_password_seguro_postgres`
- [ ] `REDIS_PASSWORD=tu_password_seguro_redis`
- [ ] `DJANGO_SECRET_KEY=clave_secreta_50_caracteres_minimo`
- [ ] `ALLOWED_HOSTS=localhost,127.0.0.1,TU_IP_REAL,tu-mac.local`
- [ ] `CORS_ALLOWED_ORIGINS=http://TU_IP_REAL`
- [ ] `VITE_API_URL=http://TU_IP_REAL`

**Variables OPCIONALES a ajustar:**
- [ ] `FFMPEG_THREADS=8` (número de cores de tu Mac M4)
- [ ] `FFMPEG_PRESET=fast` (fast/medium/slow)
- [ ] `HTTP_PORT=80` (cambiar si está ocupado)

## 🚀 Despliegue

### 1. Verificar Docker
```bash
# Verificar Docker funciona
docker --version
docker-compose --version
docker system info | grep Architecture  # Debe mostrar "aarch64"
```
- [ ] Docker funcional y usando arquitectura ARM64

### 2. Lanzar Aplicación
**Opción A - Script Automático:**
```bash
chmod +x deploy.sh
./deploy.sh
```

**Opción B - Manual:**
```bash
docker compose -f docker-compose.prod.yml up --build -d
```
- [ ] Aplicación desplegada

### 3. Configuración Inicial
```bash
# Verificar servicios
docker compose -f docker-compose.prod.yml ps

# Ejecutar migraciones
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate

# Crear superusuario
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser

# Recolectar archivos estáticos
docker compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput
```
- [ ] Todos los servicios corriendo (7 servicios)
- [ ] Migraciones ejecutadas sin errores
- [ ] Superusuario creado
- [ ] Archivos estáticos recolectados

## ✅ Verificación Final

### 1. Servicios Activos
```bash
docker compose -f docker-compose.prod.yml ps
```
Verificar que estén `Up`:
- [ ] `db` (PostgreSQL)
- [ ] `redis` (Redis)  
- [ ] `backend` (Django)
- [ ] `celery` (Worker)
- [ ] `celery-beat` (Scheduler)
- [ ] `frontend` (React/Nginx)
- [ ] `nginx` (Proxy)

### 2. Conectividad Local
```bash
curl http://localhost/health
curl http://127.0.0.1/health
```
- [ ] Health check responde "healthy"

### 3. Conectividad Red Local
```bash
# Desde otra máquina en la red
curl http://TU_IP_MAC_M4/health
```
- [ ] Accesible desde otras máquinas en la red

### 4. Interfaces Web
- [ ] **Frontend**: `http://TU_IP_MAC_M4/` carga correctamente
- [ ] **API**: `http://TU_IP_MAC_M4/api/` responde JSON
- [ ] **Admin Django**: `http://TU_IP_MAC_M4/admin/` permite login

### 5. Funcionalidad Básica
- [ ] Login con superusuario funciona
- [ ] Creación de repositorio funciona
- [ ] Upload de archivo de prueba funciona
- [ ] Procesamiento de video funciona (verificar logs Celery)

## 🔧 Optimización Post-Instalación

### 1. Configurar Auto-Inicio (Opcional)
```bash
# Crear servicio launchd
sudo nano /Library/LaunchDaemons/com.archivoplus.server.plist
# (Ver contenido en README.md)

sudo launchctl load /Library/LaunchDaemons/com.archivoplus.server.plist
```
- [ ] Servicio de auto-inicio configurado

### 2. Configurar Backups
```bash
# Crear script de backup
mkdir -p ~/Scripts
nano ~/Scripts/backup_archivoplus.sh
# (Script para backup automático de BD y media)

# Agregar a crontab
crontab -e
# 0 2 * * * ~/Scripts/backup_archivoplus.sh
```
- [ ] Script de backup creado
- [ ] Backup automático programado

### 3. SSL/HTTPS (Recomendado para producción)
```bash
# Instalar certbot si usas dominio real
brew install certbot

# Obtener certificado Let's Encrypt
sudo certbot certonly --standalone -d tu-dominio.com

# Configurar nginx para HTTPS (ver DEPLOYMENT_GUIDE.md)
```
- [ ] SSL configurado (si aplica)

## 📊 Monitoreo Continuo

### Comandos de Monitoreo
- [ ] `htop` - Monitor de sistema
- [ ] `docker stats` - Monitor de containers
- [ ] `docker compose -f docker-compose.prod.yml logs -f` - Logs en tiempo real

### Archivos de Log Importantes
- [ ] `~/Servers/ArchivoPlus/logs/` - Logs de aplicación
- [ ] `/var/log/system.log` - Logs del sistema macOS

## 🆘 Resolución de Problemas

### Problemas Comunes y Soluciones
- [ ] **Puerto ocupado**: Cambiar `HTTP_PORT` en `.env`
- [ ] **Falta memoria**: Aumentar límites en Docker Desktop
- [ ] **Permisos**: `sudo chown -R $(whoami) ~/Servers/ArchivoPlus`
- [ ] **Docker no inicia**: Verificar Docker Desktop esté corriendo

### Comandos de Diagnóstico
```bash
# Estado de servicios
docker compose -f docker-compose.prod.yml ps

# Logs detallados
docker compose -f docker-compose.prod.yml logs [servicio]

# Recursos del sistema
htop

# Espacio en disco
df -h

# Conectividad de red
ping 8.8.8.8
```

---

## 📞 Contacto y Soporte

Si encuentras problemas durante la instalación:

1. **Verificar logs**: `docker compose logs`
2. **Consultar documentación**: `DEPLOYMENT_GUIDE.md`
3. **Verificar recursos**: CPU/RAM/Disk suficientes
4. **Verificar red**: Conectividad y puertos abiertos

---

**🎯 ¡Una vez completada esta checklist, tu Mac M4 será un servidor ArchivoPlus completamente funcional!**