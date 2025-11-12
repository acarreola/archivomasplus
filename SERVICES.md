# 🚀 Scripts de Gestión de Servicios - ArchivoPlus

## 📋 Scripts Disponibles

### 1. `start-all-services.sh` - Iniciar todos los servicios
Inicia automáticamente Redis, Django, Celery y Vite en el orden correcto.

```bash
./start-all-services.sh
```

**Servicios que inicia:**
- ✅ Redis (puerto 6379)
- ✅ Django (puerto 8000)
- ✅ Celery (10 workers)
- ✅ Vite/Frontend (puerto 5173)

**Logs generados:**
- `/tmp/archivoplus-django.log`
- `/tmp/archivoplus-celery.log`
- `/tmp/archivoplus-vite.log`

---

### 2. `stop-all-services.sh` - Detener todos los servicios
Detiene de forma segura todos los servicios de ArchivoPlus.

```bash
./stop-all-services.sh
```

**Nota:** Redis NO se detiene automáticamente ya que puede ser usado por otros proyectos.
Para detener Redis manualmente: `brew services stop redis`

---

### 3. `check-services.sh` - Verificar estado de servicios
Muestra el estado actual de todos los servicios.

```bash
./check-services.sh
```

Muestra:
- Estado de cada servicio (✅ corriendo / ❌ detenido)
- PIDs de los procesos
- URLs de acceso
- Ubicación de logs

---

### 4. `install-autostart.sh` - Gestionar inicio automático

#### Instalar inicio automático (al arrancar macOS)
```bash
./install-autostart.sh install
```

Los servicios se iniciarán automáticamente cada vez que arranques tu Mac.

#### Desinstalar inicio automático
```bash
./install-autostart.sh uninstall
```

#### Ver estado de inicio automático
```bash
./install-autostart.sh status
```

---

## 🔗 URLs de Acceso

Una vez iniciados los servicios:

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000/api
- **Admin Django:** http://localhost:8000/admin
- **Redis:** localhost:6379

---

## 📝 Workflow Recomendado

### Uso Diario (SIN inicio automático)
```bash
# Al comenzar el día
./start-all-services.sh

# Verificar que todo esté corriendo
./check-services.sh

# Al terminar el día
./stop-all-services.sh
```

### Con Inicio Automático
```bash
# Instalar una sola vez
./install-autostart.sh install

# Los servicios se inician automáticamente al arrancar macOS
# Solo verificar estado:
./check-services.sh

# Si necesitas reiniciar servicios:
./stop-all-services.sh
./start-all-services.sh
```

---

## 🔧 Comandos Útiles de LaunchAgent

```bash
# Ver estado del servicio
launchctl list | grep archivoplus

# Iniciar manualmente
launchctl start com.archivoplus.services

# Detener
launchctl stop com.archivoplus.services

# Ver logs del launcher
tail -f /tmp/archivoplus-launcher.log
tail -f /tmp/archivoplus-launcher-error.log
```

---

## 🐛 Troubleshooting

### Los servicios no inician
```bash
# Ver logs
tail -50 /tmp/archivoplus-django.log
tail -50 /tmp/archivoplus-celery.log
tail -50 /tmp/archivoplus-vite.log
```

### Puerto ya en uso
El script automáticamente detecta y mata procesos en puertos 8000 y 5173 antes de iniciar.

### Reiniciar servicios
```bash
./stop-all-services.sh && sleep 2 && ./start-all-services.sh
```

### Verificar procesos manualmente
```bash
# Ver todos los procesos de ArchivoPlus
ps aux | grep -E "runserver|celery|vite" | grep -v grep

# Ver qué está usando un puerto
lsof -i :8000  # Django
lsof -i :5173  # Vite
lsof -i :6379  # Redis
```

---

## ⚙️ Configuración de Servicios

### Cambiar número de workers de Celery
Edita `start-all-services.sh` línea 78:
```bash
nohup celery -A archivoplus_backend worker --loglevel=INFO --concurrency=20 > /tmp/archivoplus-celery.log 2>&1 &
```

### Cambiar puerto de Django
Edita `start-all-services.sh` línea 64:
```bash
nohup python manage.py runserver 0.0.0.0:9000 > /tmp/archivoplus-django.log 2>&1 &
```

---

## 📦 Estructura de Archivos

```
/Users/acarreola/Sites/archivoplus/
├── start-all-services.sh          # Inicia todos los servicios
├── stop-all-services.sh           # Detiene todos los servicios
├── check-services.sh              # Verifica estado
├── install-autostart.sh           # Gestiona inicio automático
├── com.archivoplus.services.plist # Configuración LaunchAgent
└── SERVICES.md                    # Esta documentación
```

---

## 🎯 Recomendación

**Para desarrollo activo:** Usa los scripts manualmente (`start-all-services.sh`)

**Para servidor de producción local:** Instala el inicio automático (`install-autostart.sh install`)

---

✅ **Sistema listo para usar sin complicaciones**
