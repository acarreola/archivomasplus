# 🚀 ArchivoPlus - Guía de Despliegue en Producción

Este paquete contiene todo lo necesario para desplegar ArchivoPlus en un servidor de producción usando Docker Compose.

## 📋 Requisitos del Servidor

### Hardware Mínimo Recomendado
- **CPU**: 4 cores (8 threads recomendado para procesamiento de video)
- **RAM**: 8GB (16GB recomendado)
- **Almacenamiento**: 500GB SSD (para archivos multimedia)
- **Red**: Conexión estable con ancho de banda suficiente para streaming

### Software Requerido
- **Ubuntu 20.04 LTS** o superior (recomendado)
- **Docker** 24.0+ 
- **Docker Compose** 2.0+
- **FFmpeg** (se instala automáticamente en containers)

## 🛠️ Instalación Paso a Paso

### 1. Preparar el Servidor

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Agregar usuario al grupo docker
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Reiniciar sesión para aplicar cambios de grupo
logout
```

### 2. Subir Archivos al Servidor

```bash
# Crear directorio de aplicación
mkdir -p /opt/archivoplus
cd /opt/archivoplus

# Subir archivos (usar scp, rsync, o git)
# Ejemplo con rsync:
rsync -avz --exclude=node_modules --exclude=.git /ruta/local/archivoplus/ usuario@servidor:/opt/archivoplus/
```

### 3. Configurar Variables de Entorno

```bash
# Copiar template de configuración
cp .env.production.template .env

# Editar configuración (IMPORTANTE: cambiar passwords)
nano .env
```

**⚠️ IMPORTANTE**: Cambiar estas variables obligatoriamente:
- `POSTGRES_PASSWORD`: Password seguro para PostgreSQL
- `REDIS_PASSWORD`: Password seguro para Redis  
- `DJANGO_SECRET_KEY`: Clave secreta Django (50+ caracteres aleatorios)
- `ALLOWED_HOSTS`: Tu dominio/IP del servidor
- `CORS_ALLOWED_ORIGINS`: URL de tu dominio con protocolo
- `VITE_API_URL`: URL completa de tu API

### 4. Crear Directorios Necesarios

```bash
# Crear directorios para logs y backups
mkdir -p logs logs/nginx backups ssl

# Ajustar permisos
sudo chown -R $USER:$USER /opt/archivoplus
chmod -R 755 /opt/archivoplus
```

### 5. Lanzar la Aplicación

```bash
# Construir y lanzar todos los servicios
docker-compose -f docker-compose.prod.yml up --build -d

# Verificar que todos los containers están corriendo
docker-compose -f docker-compose.prod.yml ps
```

### 6. Configuración Inicial de Django

```bash
# Ejecutar migraciones
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate

# Crear superusuario
docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser

# Recolectar archivos estáticos
docker-compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput
```

## 🔒 Configuración SSL (HTTPS)

### Opción 1: Let's Encrypt (Recomendado)

```bash
# Instalar Certbot
sudo apt install certbot

# Detener nginx temporalmente
docker-compose -f docker-compose.prod.yml stop nginx

# Obtener certificado SSL
sudo certbot certonly --standalone -d tu-dominio.com -d www.tu-dominio.com

# Copiar certificados al directorio ssl
sudo cp /etc/letsencrypt/live/tu-dominio.com/fullchain.pem ssl/
sudo cp /etc/letsencrypt/live/tu-dominio.com/privkey.pem ssl/
sudo chown $USER:$USER ssl/*

# Editar nginx/conf.d/default.conf y descomentar la sección HTTPS
nano nginx/conf.d/default.conf

# Reiniciar nginx
docker-compose -f docker-compose.prod.yml up -d nginx
```

### Opción 2: Certificado Propio

```bash
# Generar certificado autofirmado (solo para testing)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout ssl/privkey.pem \
    -out ssl/fullchain.pem \
    -subj "/C=MX/ST=State/L=City/O=Organization/CN=tu-dominio.com"
```

## 📊 Monitoreo y Mantenimiento

### Comandos Útiles

```bash
# Ver estado de servicios
docker-compose -f docker-compose.prod.yml ps

# Ver logs
docker-compose -f docker-compose.prod.yml logs -f [servicio]

# Reiniciar servicio específico
docker-compose -f docker-compose.prod.yml restart [servicio]

# Actualizar aplicación (rebuild)
docker-compose -f docker-compose.prod.yml up --build -d

# Backup de base de datos
docker-compose -f docker-compose.prod.yml exec db pg_dump -U archivoplus_user archivoplus_prod > backups/backup_$(date +%Y%m%d_%H%M%S).sql
```

### Logs Importantes

```bash
# Logs de aplicación
tail -f logs/django.log

# Logs de Nginx
tail -f logs/nginx/access.log
tail -f logs/nginx/error.log

# Logs de Celery (procesamiento de video)
docker-compose -f docker-compose.prod.yml logs -f celery
```

### Limpieza de Archivos

```bash
# Limpiar containers no utilizados
docker system prune -f

# Limpiar imágenes antiguas
docker image prune -f

# Limpiar logs rotados automáticamente (configurado en docker-compose)
```

## 🔧 Optimización de Performance

### 1. Configuración de Sistema Operativo

```bash
# Optimizar límites del sistema para archivos grandes
echo "fs.file-max = 2097152" | sudo tee -a /etc/sysctl.conf
echo "vm.swappiness = 10" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Optimizar límites de usuario
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf
```

### 2. Configuración de FFmpeg

En `.env` puedes ajustar:
- `FFMPEG_THREADS=4` (número de CPU cores disponibles)
- `FFMPEG_PRESET=medium` (fast/medium/slow - balance velocidad/calidad)

## 🆘 Resolución de Problemas

### Problema: Containers no inician
```bash
# Verificar logs
docker-compose -f docker-compose.prod.yml logs

# Verificar configuración de red
docker network ls
docker network inspect archivoplus_archivoplus_network
```

### Problema: Error de permisos en archivos
```bash
# Ajustar permisos de media files
sudo chown -R 1000:1000 /opt/archivoplus
docker-compose -f docker-compose.prod.yml restart backend celery
```

### Problema: Error de base de datos
```bash
# Verificar conexión a PostgreSQL
docker-compose -f docker-compose.prod.yml exec db psql -U archivoplus_user -d archivoplus_prod -c "SELECT 1;"

# Restaurar backup si es necesario
docker-compose -f docker-compose.prod.yml exec -T db psql -U archivoplus_user -d archivoplus_prod < backups/backup_file.sql
```

### Problema: Videos no se procesan
```bash
# Verificar Celery worker
docker-compose -f docker-compose.prod.yml exec celery celery -A archivoplus_backend inspect active

# Verificar Redis
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping

# Ver cola de tareas
docker-compose -f docker-compose.prod.yml exec backend python manage.py shell
>>> from celery import current_app
>>> i = current_app.control.inspect()
>>> i.active()
```

## 🔄 Actualizaciones

### Actualización de Código

```bash
# Hacer backup antes de actualizar
docker-compose -f docker-compose.prod.yml exec db pg_dump -U archivoplus_user archivoplus_prod > backups/pre_update_$(date +%Y%m%d_%H%M%S).sql

# Subir nuevo código al servidor
rsync -avz --exclude=node_modules nuevo_codigo/ /opt/archivoplus/

# Rebuild y reiniciar
docker-compose -f docker-compose.prod.yml up --build -d

# Ejecutar migraciones si hay cambios de BD
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate

# Recolectar archivos estáticos nuevos
docker-compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput
```

## 📞 Soporte

Si tienes problemas durante el despliegue:

1. Revisa los logs detalladamente
2. Verifica que todas las variables de entorno estén correctas
3. Asegúrate que los puertos no estén en uso por otras aplicaciones
4. Verifica que el servidor tenga suficientes recursos (CPU/RAM/Disk)

---

**✅ Una vez completada la instalación, ArchivoPlus estará disponible en:**
- Frontend: `http://tu-dominio.com` (o `https://` con SSL)
- API: `http://tu-dominio.com/api/`
- Admin Django: `http://tu-dominio.com/admin/`