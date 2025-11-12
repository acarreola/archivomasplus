#!/bin/bash

# ArchivoPlus - Script para detener todos los servicios
# Uso: ./stop-all-services.sh

echo "🛑 Deteniendo ArchivoPlus Services..."
echo "===================================="

# 1. Vite
echo ""
echo "1️⃣  Deteniendo Vite..."
if pkill -f "vite" 2>/dev/null; then
    echo "   ✅ Vite detenido"
else
    echo "   ℹ️  Vite no estaba corriendo"
fi

# 2. Celery
echo ""
echo "2️⃣  Deteniendo Celery..."
if pkill -f "celery.*worker" 2>/dev/null; then
    echo "   ✅ Celery detenido"
else
    echo "   ℹ️  Celery no estaba corriendo"
fi

# 3. Django
echo ""
echo "3️⃣  Deteniendo Django..."
if lsof -ti:8000 | xargs kill -9 2>/dev/null; then
    echo "   ✅ Django detenido"
else
    echo "   ℹ️  Django no estaba corriendo"
fi

# 4. Redis (opcional - comentado porque puede ser usado por otros proyectos)
echo ""
echo "4️⃣  Redis..."
echo "   ℹ️  Redis se mantiene corriendo (compartido con otros proyectos)"
echo "   💡 Para detener Redis: brew services stop redis"

echo ""
echo "===================================="
echo "✅ Servicios detenidos"
echo "===================================="
