# 📦 Checklist de Despliegue - ArchivoPlus Producción

## ✅ Archivos Incluidos en el Paquete

### Configuración de Producción
- [x] `docker-compose.prod.yml` - Configuración Docker para producción
- [x] `.env.production.template` - Template de variables de entorno
- [x] `deploy.sh` - Script de despliegue automático
- [x] `DEPLOYMENT_GUIDE.md` - Guía completa de instalación

### Configuración Nginx
- [x] `nginx/nginx.conf` - Configuración principal de Nginx
- [x] `nginx/conf.d/default.conf` - Virtual host y proxy settings
- [x] `frontend/Dockerfile.prod` - Dockerfile optimizado para frontend
- [x] `frontend/nginx.prod.conf` - Configuración Nginx para SPA

### Código Fuente
- [x] Backend Django completo
- [x] Frontend React completo  
- [x] Modelos, vistas y tareas Celery
- [x] Configuración de Docker existente

## 🚀 Instrucciones Rápidas de Despliegue

### 1. Preparar Servidor
```bash
# En el servidor de producción
mkdir -p /opt/archivoplus
cd /opt/archivoplus

# Subir y extraer el archivo
scp archivoplus-production-*.tar.gz usuario@servidor:/opt/archivoplus/
tar -xzf archivoplus-production-*.tar.gz
```

### 2. Configurar Variables
```bash
# Copiar y editar configuración
cp .env.production.template .env
nano .env

# IMPORTANTE: Cambiar estas variables:
# - POSTGRES_PASSWORD
# - REDIS_PASSWORD
# - DJANGO_SECRET_KEY
# - ALLOWED_HOSTS
# - CORS_ALLOWED_ORIGINS
```

### 3. Desplegar Automáticamente
```bash
# Ejecutar script de despliegue
chmod +x deploy.sh
./deploy.sh
```

### 4. Configuración Post-Despliegue
```bash
# Crear superusuario
docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser

# Opcional: Configurar SSL/HTTPS
# (Ver guía completa en DEPLOYMENT_GUIDE.md)
```

## 🔍 Verificación del Despliegue

### Servicios Activos
```bash
docker-compose -f docker-compose.prod.yml ps
```
Deben estar corriendo:
- [x] db (PostgreSQL)
- [x] redis (Redis)
- [x] backend (Django)
- [x] celery (Worker de procesamiento)
- [x] celery-beat (Tareas programadas)
- [x] frontend (React/Nginx)
- [x] nginx (Proxy reverso)

### URLs de Acceso
- Frontend: `http://tu-servidor/`
- API: `http://tu-servidor/api/`
- Admin Django: `http://tu-servidor/admin/`
- Health Check: `http://tu-servidor/health`

### Logs de Monitoreo
```bash
# Ver todos los logs
docker-compose -f docker-compose.prod.yml logs -f

# Logs específicos
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f celery
docker-compose -f docker-compose.prod.yml logs -f nginx
```

## 🛠️ Comandos Útiles de Mantenimiento

### Backup de Base de Datos
```bash
docker-compose -f docker-compose.prod.yml exec db pg_dump -U archivoplus_user archivoplus_prod > backup_$(date +%Y%m%d).sql
```

### Actualización de Código
```bash
# Hacer backup antes
# Subir nuevo código
# Rebuild containers
docker-compose -f docker-compose.prod.yml up --build -d
```

### Reiniciar Servicios
```bash
# Todos los servicios
docker-compose -f docker-compose.prod.yml restart

# Servicio específico
docker-compose -f docker-compose.prod.yml restart backend
```

## ⚠️ Notas Importantes

1. **Seguridad**: Cambiar TODAS las passwords por defecto
2. **SSL**: Configurar HTTPS para producción (ver guía completa)
3. **Firewall**: Abrir solo puertos 80 y 443
4. **Backups**: Configurar backups automáticos de BD y media files
5. **Monitoreo**: Verificar logs regularmente
6. **Recursos**: Asegurar suficiente CPU/RAM para procesamiento de video

## 📞 Soporte

En caso de problemas:
1. Verificar logs: `docker-compose logs`
2. Verificar configuración `.env`
3. Consultar `DEPLOYMENT_GUIDE.md` para troubleshooting detallado
4. Verificar recursos del servidor (RAM/CPU/Disk)

---
**📁 Tamaño del paquete**: ~47MB  
**📅 Fecha de creación**: $(date)  
**🏷️ Versión**: Producción optimizada con Docker Compose