#!/bin/bash

# ArchivoPlus - Script para verificar estado de servicios
# Uso: ./check-services.sh

echo "📊 Estado de ArchivoPlus Services"
echo "===================================="

# Función para verificar puerto
check_service() {
    local name=$1
    local port=$2
    local process=$3
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        local pid=$(lsof -ti:$port)
        echo "✅ $name (Puerto $port) - PID: $pid"
        return 0
    else
        echo "❌ $name (Puerto $port) - NO CORRIENDO"
        return 1
    fi
}

# Redis
echo ""
if redis-cli ping > /dev/null 2>&1; then
    PID=$(lsof -ti:6379)
    echo "✅ Redis (Puerto 6379) - PID: $PID"
else
    echo "❌ Redis (Puerto 6379) - NO CORRIENDO"
fi

# Django
echo ""
check_service "Django" 8000 "python.*runserver"

# Celery
echo ""
CELERY_COUNT=$(ps aux | grep "celery.*worker" | grep -v grep | wc -l | xargs)
if [ "$CELERY_COUNT" -gt 0 ]; then
    echo "✅ Celery - $CELERY_COUNT workers activos"
else
    echo "❌ Celery - NO CORRIENDO"
fi

# Vite
echo ""
check_service "Vite/Frontend" 5173 "vite"

# Resumen
echo ""
echo "===================================="
echo "📝 Logs:"
echo "   Django:  /tmp/archivoplus-django.log"
echo "   Celery:  /tmp/archivoplus-celery.log"
echo "   Vite:    /tmp/archivoplus-vite.log"
echo ""
echo "🔗 URLs:"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:8000"
echo "   Admin:    http://localhost:8000/admin"
echo "===================================="
