#!/bin/bash

# =============================================================================
# ArchivoPlus - Script de Deploy Nativo para Mac M4
# =============================================================================
# Este script automatiza la instalación y configuración de ArchivoPlus
# en un Mac M4 con instalación NATIVA (sin Docker)
#
# Uso:
#   chmod +x deploy_native.sh
#   ./deploy_native.sh
#
# =============================================================================

set -e  # Exit on error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
USER_HOME="$HOME"
APP_DIR="$SCRIPT_DIR"
VENV_DIR="$APP_DIR/venv_archivoplus"
FRONTEND_DIR="$APP_DIR/frontend"
LOGS_DIR="$APP_DIR/logs"

# =============================================================================
# Funciones de utilidad
# =============================================================================

print_header() {
    echo -e "${BLUE}"
    echo "============================================================================="
    echo "$1"
    echo "============================================================================="
    echo -e "${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

check_command() {
    if command -v $1 &> /dev/null; then
        print_success "$1 está instalado"
        return 0
    else
        print_error "$1 NO está instalado"
        return 1
    fi
}

# =============================================================================
# Verificar Dependencias
# =============================================================================

check_dependencies() {
    print_header "Verificando Dependencias del Sistema"
    
    local all_ok=true
    
    # Homebrew
    if ! check_command brew; then
        print_error "Homebrew no está instalado. Por favor instalar desde: https://brew.sh"
        all_ok=false
    fi
    
    # Python
    if ! check_command python3.11; then
        print_warning "Python 3.11 no encontrado. Intentando instalar..."
        brew install python@3.11 || all_ok=false
    fi
    
    # Node.js
    if ! check_command node; then
        print_warning "Node.js no encontrado. Intentando instalar..."
        brew install node@20 || all_ok=false
    fi
    
    # PostgreSQL
    if ! check_command psql; then
        print_warning "PostgreSQL no encontrado. Intentando instalar..."
        brew install postgresql@15 || all_ok=false
    fi
    
    # Redis
    if ! check_command redis-cli; then
        print_warning "Redis no encontrado. Intentando instalar..."
        brew install redis || all_ok=false
    fi
    
    # Nginx
    if ! check_command nginx; then
        print_warning "Nginx no encontrado. Intentando instalar..."
        brew install nginx || all_ok=false
    fi
    
    # PM2
    if ! check_command pm2; then
        print_warning "PM2 no encontrado. Intentando instalar..."
        npm install -g pm2 || all_ok=false
    fi
    
    if [ "$all_ok" = false ]; then
        print_error "Faltan dependencias. Por favor instalar manualmente."
        exit 1
    fi
    
    print_success "Todas las dependencias están instaladas"
}

# =============================================================================
# Configurar PostgreSQL
# =============================================================================

setup_postgresql() {
    print_header "Configurando PostgreSQL"
    
    # Iniciar PostgreSQL si no está corriendo
    if ! brew services list | grep postgresql@15 | grep started &> /dev/null; then
        print_info "Iniciando PostgreSQL..."
        brew services start postgresql@15
        sleep 3
    fi
    
    # Verificar si la base de datos ya existe
    if psql -lqt | cut -d \| -f 1 | grep -qw archivoplus_prod; then
        print_warning "La base de datos 'archivoplus_prod' ya existe"
    else
        print_info "Creando base de datos 'archivoplus_prod'..."
        createdb archivoplus_prod || true
        print_success "Base de datos creada"
    fi
    
    # Verificar si el usuario ya existe
    if psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='archivoplus_user'" | grep -q 1; then
        print_warning "El usuario 'archivoplus_user' ya existe"
    else
        print_info "Creando usuario 'archivoplus_user'..."
        createuser -s archivoplus_user || true
        psql -c "ALTER USER archivoplus_user PASSWORD 'archivoplus_pass';" || true
        print_success "Usuario creado"
    fi
}

# =============================================================================
# Configurar Redis
# =============================================================================

setup_redis() {
    print_header "Configurando Redis"
    
    # Iniciar Redis si no está corriendo
    if ! brew services list | grep redis | grep started &> /dev/null; then
        print_info "Iniciando Redis..."
        brew services start redis
        sleep 2
    fi
    
    # Verificar conectividad
    if redis-cli ping &> /dev/null; then
        print_success "Redis está corriendo"
    else
        print_error "Redis no responde"
        exit 1
    fi
}

# =============================================================================
# Configurar Entorno Python
# =============================================================================

setup_python_env() {
    print_header "Configurando Entorno Python"
    
    # Crear entorno virtual si no existe
    if [ ! -d "$VENV_DIR" ]; then
        print_info "Creando entorno virtual..."
        python3.11 -m venv "$VENV_DIR"
        print_success "Entorno virtual creado"
    else
        print_warning "Entorno virtual ya existe"
    fi
    
    # Activar entorno virtual
    source "$VENV_DIR/bin/activate"
    
    # Actualizar pip
    print_info "Actualizando pip..."
    pip install --upgrade pip
    
    # Instalar dependencias
    print_info "Instalando dependencias Python..."
    pip install -r "$APP_DIR/requirements.txt"
    
    print_success "Dependencias Python instaladas"
}

# =============================================================================
# Configurar Variables de Entorno
# =============================================================================

setup_env_file() {
    print_header "Configurando Variables de Entorno"
    
    ENV_FILE="$APP_DIR/.env.local"
    
    if [ -f "$ENV_FILE" ]; then
        print_warning "El archivo .env.local ya existe. Omitiendo..."
        return
    fi
    
    if [ ! -f "$APP_DIR/.env.native.template" ]; then
        print_error "No se encontró .env.native.template"
        exit 1
    fi
    
    print_info "Creando .env.local desde template..."
    cp "$APP_DIR/.env.native.template" "$ENV_FILE"
    
    # Reemplazar TU_USUARIO con el usuario actual
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/tu-usuario/$(whoami)/g" "$ENV_FILE"
    else
        sed -i "s/tu-usuario/$(whoami)/g" "$ENV_FILE"
    fi
    
    print_success "Archivo .env.local creado"
    print_warning "IMPORTANTE: Edita $ENV_FILE y configura las contraseñas y valores correctos"
}

# =============================================================================
# Configurar Django
# =============================================================================

setup_django() {
    print_header "Configurando Django"
    
    # Activar entorno virtual
    source "$VENV_DIR/bin/activate"
    
    # Cargar variables de entorno
    export $(grep -v '^#' "$APP_DIR/.env.local" | xargs)
    
    # Crear directorio de logs
    mkdir -p "$LOGS_DIR"
    
    # Crear directorios de media
    mkdir -p "$APP_DIR/media/originals"
    mkdir -p "$APP_DIR/media/transcoded"
    mkdir -p "$APP_DIR/static"
    
    # Ejecutar migraciones
    print_info "Ejecutando migraciones..."
    python "$APP_DIR/manage.py" migrate
    
    # Recolectar archivos estáticos
    print_info "Recolectando archivos estáticos..."
    python "$APP_DIR/manage.py" collectstatic --noinput
    
    # Crear superusuario si no existe
    print_info "Verificando superusuario..."
    python "$APP_DIR/manage.py" shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@admin.com', 'admin123')
    print('Superusuario creado: admin / admin123')
else:
    print('Superusuario ya existe')
" || true
    
    print_success "Django configurado"
}

# =============================================================================
# Configurar Frontend
# =============================================================================

setup_frontend() {
    print_header "Configurando Frontend"
    
    cd "$FRONTEND_DIR"
    
    # Instalar dependencias
    print_info "Instalando dependencias Node.js..."
    npm install
    
    # Configurar .env.local del frontend
    print_info "Configurando variables de entorno del frontend..."
    echo "VITE_API_URL=http://localhost:8000" > "$FRONTEND_DIR/.env.local"
    
    # Build para producción
    print_info "Construyendo frontend para producción..."
    npm run build
    
    cd "$APP_DIR"
    
    print_success "Frontend configurado"
}

# =============================================================================
# Configurar Nginx
# =============================================================================

setup_nginx() {
    print_header "Configurando Nginx"
    
    NGINX_CONF="/opt/homebrew/etc/nginx/nginx.conf"
    NGINX_BACKUP="/opt/homebrew/etc/nginx/nginx.conf.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Backup de configuración actual
    if [ -f "$NGINX_CONF" ]; then
        print_info "Creando backup de nginx.conf..."
        cp "$NGINX_CONF" "$NGINX_BACKUP"
    fi
    
    # Copiar nueva configuración
    print_info "Instalando nueva configuración de Nginx..."
    cp "$APP_DIR/nginx.conf.native" "$NGINX_CONF"
    
    # Reemplazar TU_USUARIO en nginx.conf
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/TU_USUARIO/$(whoami)/g" "$NGINX_CONF"
    else
        sed -i "s/TU_USUARIO/$(whoami)/g" "$NGINX_CONF"
    fi
    
    # Verificar configuración
    if nginx -t; then
        print_success "Configuración de Nginx válida"
        
        # Reiniciar Nginx
        print_info "Reiniciando Nginx..."
        brew services restart nginx
    else
        print_error "Configuración de Nginx inválida. Restaurando backup..."
        cp "$NGINX_BACKUP" "$NGINX_CONF"
        exit 1
    fi
}

# =============================================================================
# Iniciar Servicios con PM2
# =============================================================================

start_services() {
    print_header "Iniciando Servicios"
    
    # Detener servicios existentes
    print_info "Deteniendo servicios PM2 existentes..."
    pm2 delete all &> /dev/null || true
    
    # Iniciar nuevos servicios
    print_info "Iniciando servicios con PM2..."
    pm2 start "$APP_DIR/ecosystem.config.js"
    
    # Guardar configuración de PM2
    pm2 save
    
    # Configurar auto-inicio
    print_info "Configurando auto-inicio de PM2..."
    pm2 startup
    
    print_success "Servicios iniciados"
}

# =============================================================================
# Verificar Instalación
# =============================================================================

verify_installation() {
    print_header "Verificando Instalación"
    
    sleep 5  # Esperar a que los servicios inicien
    
    # Verificar servicios de sistema
    print_info "Servicios de sistema:"
    brew services list | grep -E "(postgresql|redis|nginx)"
    
    # Verificar procesos PM2
    print_info "Procesos PM2:"
    pm2 status
    
    # Verificar conectividad
    print_info "Probando conectividad..."
    
    if curl -s http://localhost/ &> /dev/null; then
        print_success "Frontend accesible en http://localhost/"
    else
        print_warning "Frontend no responde en http://localhost/"
    fi
    
    if curl -s http://localhost/api/ &> /dev/null; then
        print_success "API accesible en http://localhost/api/"
    else
        print_warning "API no responde en http://localhost/api/"
    fi
}

# =============================================================================
# Mostrar Resumen
# =============================================================================

show_summary() {
    print_header "¡Instalación Completada!"
    
    echo ""
    echo -e "${GREEN}🎉 ArchivoPlus está listo para usar${NC}"
    echo ""
    echo -e "${BLUE}📌 URLs de Acceso:${NC}"
    echo "   Frontend:  http://localhost/"
    echo "   API:       http://localhost/api/"
    echo "   Admin:     http://localhost/admin/"
    echo "   Flower:    http://localhost:5555/ (monitor Celery)"
    echo ""
    echo -e "${BLUE}🔑 Credenciales de Admin:${NC}"
    echo "   Usuario:   admin"
    echo "   Password:  admin123"
    echo ""
    echo -e "${BLUE}🛠️  Comandos Útiles:${NC}"
    echo "   Ver logs:        pm2 logs"
    echo "   Estado:          pm2 status"
    echo "   Reiniciar:       pm2 restart all"
    echo "   Detener:         pm2 stop all"
    echo "   Monitor:         pm2 monit"
    echo ""
    echo -e "${YELLOW}⚠️  Recuerda:${NC}"
    echo "   1. Edita .env.local con contraseñas seguras para producción"
    echo "   2. Configura firewall si expones el servidor a la red"
    echo "   3. Revisa logs en: $LOGS_DIR"
    echo ""
}

# =============================================================================
# Main Script
# =============================================================================

main() {
    clear
    print_header "🚀 ArchivoPlus - Deploy Nativo para Mac M4"
    
    echo ""
    print_info "Este script instalará y configurará ArchivoPlus de forma nativa"
    print_info "Directorio de instalación: $APP_DIR"
    echo ""
    read -p "¿Continuar con la instalación? (s/n): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        print_warning "Instalación cancelada"
        exit 0
    fi
    
    check_dependencies
    setup_postgresql
    setup_redis
    setup_python_env
    setup_env_file
    setup_django
    setup_frontend
    setup_nginx
    start_services
    verify_installation
    show_summary
}

# Ejecutar script principal
main "$@"
