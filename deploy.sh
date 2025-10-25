#!/bin/bash

# =============================================================================
# Script de Despliegue Rápido de ArchivoPlus
# =============================================================================

set -e  # Salir si algún comando falla

echo "🚀 ArchivoPlus - Despliegue en Producción"
echo "=========================================="

# Verificar que estamos ejecutando como usuario no-root
if [[ $EUID -eq 0 ]]; then
   echo "❌ No ejecutes este script como root. Usa un usuario normal con sudo."
   exit 1
fi

# Verificar Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no está instalado. Instalando..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo "✅ Docker instalado. Reinicia tu sesión y ejecuta el script nuevamente."
    exit 1
fi

# Verificar Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose no está instalado. Instalando..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose instalado."
fi

echo "📋 Verificando configuración..."

# Verificar que existe .env
if [[ ! -f .env ]]; then
    echo "❌ Archivo .env no encontrado."
    echo "📝 Copiando template de configuración..."
    cp .env.production.template .env
    echo "⚠️  IMPORTANTE: Edita el archivo .env antes de continuar:"
    echo "   - Cambia POSTGRES_PASSWORD"
    echo "   - Cambia REDIS_PASSWORD" 
    echo "   - Cambia DJANGO_SECRET_KEY"
    echo "   - Configura ALLOWED_HOSTS con tu dominio/IP"
    echo "   - Configura CORS_ALLOWED_ORIGINS"
    echo ""
    read -p "¿Has editado el archivo .env? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Por favor edita .env y ejecuta el script nuevamente."
        exit 1
    fi
fi

# Crear directorios necesarios
echo "📁 Creando directorios..."
mkdir -p logs logs/nginx backups ssl media static

# Verificar permisos
echo "🔑 Configurando permisos..."
sudo chown -R $USER:$USER $(pwd)
chmod -R 755 $(pwd)

# Construir y lanzar aplicación
echo "🏗️  Construyendo y lanzando aplicación..."
docker-compose -f docker-compose.prod.yml up --build -d

# Esperar a que la base de datos esté lista
echo "⏳ Esperando a que la base de datos esté lista..."
sleep 30

# Ejecutar migraciones
echo "🗃️  Ejecutando migraciones de base de datos..."
docker-compose -f docker-compose.prod.yml exec -T backend python manage.py migrate

# Recolectar archivos estáticos
echo "📦 Recolectando archivos estáticos..."
docker-compose -f docker-compose.prod.yml exec -T backend python manage.py collectstatic --noinput

# Verificar estado de servicios
echo "🔍 Verificando estado de servicios..."
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "✅ ¡Despliegue completado!"
echo ""
echo "📍 Tu aplicación está disponible en:"
echo "   Frontend: http://localhost (o tu dominio configurado)"
echo "   API: http://localhost/api/"
echo "   Admin: http://localhost/admin/"
echo ""
echo "🔧 Próximos pasos opcionales:"
echo "   1. Crear superusuario: docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser"
echo "   2. Configurar SSL/HTTPS (ver DEPLOYMENT_GUIDE.md)"
echo "   3. Configurar backups automáticos"
echo ""
echo "📖 Para más información, consulta DEPLOYMENT_GUIDE.md"

# Mostrar logs en tiempo real (opcional)
echo ""
read -p "¿Quieres ver los logs en tiempo real? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📊 Mostrando logs (Ctrl+C para salir)..."
    docker-compose -f docker-compose.prod.yml logs -f
fi