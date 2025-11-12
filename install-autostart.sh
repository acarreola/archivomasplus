#!/bin/bash

# ArchivoPlus - Instalador de inicio automático
# Uso: ./install-autostart.sh [install|uninstall|status]

PLIST_NAME="com.archivoplus.services.plist"
PLIST_SOURCE="/Users/acarreola/Sites/archivoplus/$PLIST_NAME"
PLIST_DEST="$HOME/Library/LaunchAgents/$PLIST_NAME"

install_autostart() {
    echo "📦 Instalando inicio automático..."
    
    # Crear directorio si no existe
    mkdir -p "$HOME/Library/LaunchAgents"
    
    # Copiar plist
    cp "$PLIST_SOURCE" "$PLIST_DEST"
    echo "   ✅ Archivo plist copiado a LaunchAgents"
    
    # Cargar el servicio
    launchctl unload "$PLIST_DEST" 2>/dev/null || true
    launchctl load "$PLIST_DEST"
    echo "   ✅ Servicio cargado en launchctl"
    
    echo ""
    echo "✅ Inicio automático instalado"
    echo "   Los servicios se iniciarán automáticamente al arrancar macOS"
    echo ""
    echo "💡 Comandos útiles:"
    echo "   Ver estado:    launchctl list | grep archivoplus"
    echo "   Iniciar ahora: launchctl start com.archivoplus.services"
    echo "   Detener:       launchctl stop com.archivoplus.services"
}

uninstall_autostart() {
    echo "🗑️  Desinstalando inicio automático..."
    
    if [ -f "$PLIST_DEST" ]; then
        launchctl unload "$PLIST_DEST" 2>/dev/null || true
        rm "$PLIST_DEST"
        echo "   ✅ Inicio automático desinstalado"
    else
        echo "   ℹ️  Inicio automático no estaba instalado"
    fi
}

show_status() {
    echo "📊 Estado del inicio automático"
    echo "===================================="
    
    if [ -f "$PLIST_DEST" ]; then
        echo "✅ Instalado en: $PLIST_DEST"
        echo ""
        echo "Estado en launchctl:"
        launchctl list | grep archivoplus || echo "   ℹ️  No aparece en launchctl"
    else
        echo "❌ No instalado"
        echo ""
        echo "Para instalar: ./install-autostart.sh install"
    fi
}

case "$1" in
    install)
        install_autostart
        ;;
    uninstall)
        uninstall_autostart
        ;;
    status)
        show_status
        ;;
    *)
        echo "Uso: $0 {install|uninstall|status}"
        echo ""
        echo "Comandos:"
        echo "  install    - Instalar inicio automático al arrancar macOS"
        echo "  uninstall  - Desinstalar inicio automático"
        echo "  status     - Ver estado de la instalación"
        exit 1
        ;;
esac
