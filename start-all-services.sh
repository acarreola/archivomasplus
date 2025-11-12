#!/bin/bash

# ArchivoPlus - Script de inicio de todos los servicios
# Uso: ./start-all-services.sh

set -e

PROJECT_DIR="/Users/acarreola/Sites/archivoplus"
VENV_PATH="$PROJECT_DIR/.venv"
FRONTEND_DIR="$PROJECT_DIR/frontend"

echo "🚀 Iniciando ArchivoPlus Services..."
echo "===================================="

# Función para verificar si un puerto está en uso
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        return 0  # Puerto en uso
    else
        return 1  # Puerto libre
    fi
}

# 1. Redis
echo ""
echo "1️⃣  Verificando Redis..."
if check_port 6379; then
    echo "   ✅ Redis ya está corriendo en puerto 6379"
else
    echo "   ⚡ Iniciando Redis..."
    brew services start redis
    sleep 2
    if redis-cli ping > /dev/null 2>&1; then
        echo "   ✅ Redis iniciado correctamente"
    else
        echo "   ❌ Error al iniciar Redis"
        exit 1
    fi
fi

# 2. Django
echo ""
echo "2️⃣  Verificando Django..."
if check_port 8000; then
    echo "   ⚠️  Puerto 8000 en uso. Deteniendo proceso anterior..."
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
    sleep 1
fi

echo "   ⚡ Iniciando Django..."
cd "$PROJECT_DIR"
source "$VENV_PATH/bin/activate"
nohup python manage.py runserver > /tmp/archivoplus-django.log 2>&1 &
DJANGO_PID=$!
echo "   📝 Django PID: $DJANGO_PID (logs: /tmp/archivoplus-django.log)"
sleep 3

if check_port 8000; then
    echo "   ✅ Django iniciado correctamente en puerto 8000"
else
    echo "   ❌ Error al iniciar Django"
    cat /tmp/archivoplus-django.log
    exit 1
fi

# 3. Celery
echo ""
echo "3️⃣  Verificando Celery..."
CELERY_RUNNING=$(ps aux | grep "celery.*worker" | grep -v grep | wc -l)
if [ "$CELERY_RUNNING" -gt 0 ]; then
    echo "   ⚠️  Celery ya está corriendo. Deteniendo procesos anteriores..."
    pkill -f "celery.*worker" 2>/dev/null || true
    sleep 2
fi

echo "   ⚡ Iniciando Celery (10 workers)..."
cd "$PROJECT_DIR"
source "$VENV_PATH/bin/activate"
nohup celery -A archivoplus_backend worker --loglevel=INFO > /tmp/archivoplus-celery.log 2>&1 &
CELERY_PID=$!
echo "   📝 Celery PID: $CELERY_PID (logs: /tmp/archivoplus-celery.log)"
sleep 3

CELERY_CHECK=$(ps aux | grep "celery.*worker" | grep -v grep | wc -l)
if [ "$CELERY_CHECK" -gt 0 ]; then
    echo "   ✅ Celery iniciado correctamente"
else
    echo "   ❌ Error al iniciar Celery"
    cat /tmp/archivoplus-celery.log
    exit 1
fi

# 4. Frontend (Vite)
echo ""
echo "4️⃣  Verificando Frontend (Vite)..."
if check_port 5173; then
    echo "   ⚠️  Puerto 5173 en uso. Deteniendo proceso anterior..."
    lsof -ti:5173 | xargs kill -9 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    sleep 2
fi

echo "   ⚡ Iniciando Vite..."
cd "$FRONTEND_DIR"
nohup npm run dev > /tmp/archivoplus-vite.log 2>&1 &
VITE_PID=$!
echo "   📝 Vite PID: $VITE_PID (logs: /tmp/archivoplus-vite.log)"
sleep 5

if check_port 5173; then
    echo "   ✅ Vite iniciado correctamente en puerto 5173"
else
    echo "   ❌ Error al iniciar Vite"
    cat /tmp/archivoplus-vite.log
    exit 1
fi

# Resumen
echo ""
echo "===================================="
echo "✅ Todos los servicios iniciados"
echo "===================================="
echo ""
echo "📊 Estado de servicios:"
echo "   • Redis:    http://localhost:6379  ✅"
echo "   • Django:   http://localhost:8000  ✅"
echo "   • Celery:   10 workers activos     ✅"
echo "   • Frontend: http://localhost:5173  ✅"
echo ""
echo "📝 Logs disponibles en:"
echo "   • Django:   /tmp/archivoplus-django.log"
echo "   • Celery:   /tmp/archivoplus-celery.log"
echo "   • Vite:     /tmp/archivoplus-vite.log"
echo ""
echo "🛑 Para detener todos los servicios:"
echo "   ./stop-all-services.sh"
echo ""
