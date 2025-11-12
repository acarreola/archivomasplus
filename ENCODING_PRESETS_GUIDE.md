# Guía de Presets de Codificación Personalizados

## 📋 Descripción General

Se ha implementado un sistema completo de gestión de presets de codificación FFmpeg, permitiendo a los administradores crear, editar y gestionar configuraciones personalizadas de codificación que pueden ser reutilizadas por todos los usuarios.

## 🎯 Características Implementadas

### Backend

#### 1. Modelo de Base de Datos (`EncodingPreset`)
- **Campos principales:**
  - `nombre`: Nombre descriptivo del preset
  - `descripcion`: Descripción detallada del uso
  - `categoria`: broadcast, web, mobile, social, custom
  - `settings`: Configuración FFmpeg en formato JSON
  - `creado_por`: Usuario que creó el preset
  - `es_global`: Si el preset está disponible para todos
  - `activo`: Estado del preset
  - `veces_usado`: Contador de uso para estadísticas

#### 2. API REST Endpoints

**Base URL:** `/api/encoding-presets/`

| Método | Endpoint | Permisos | Descripción |
|--------|----------|----------|-------------|
| GET | `/api/encoding-presets/` | Authenticated | Listar presets accesibles |
| POST | `/api/encoding-presets/` | Admin | Crear nuevo preset |
| GET | `/api/encoding-presets/{id}/` | Authenticated | Obtener detalles |
| PUT/PATCH | `/api/encoding-presets/{id}/` | Admin | Actualizar preset |
| DELETE | `/api/encoding-presets/{id}/` | Admin | Desactivar preset |
| POST | `/api/encoding-presets/{id}/increment_usage/` | Authenticated | Incrementar contador |
| GET | `/api/encoding-presets/by_category/` | Authenticated | Agrupar por categoría |

#### 3. Control de Acceso
- **Usuarios regulares ven:**
  - Presets globales activos (`es_global=True`, `activo=True`)
  - Sus propios presets (activos o inactivos)

- **Administradores ven:**
  - Todos los presets sin restricción

#### 4. Interfaz de Administración
- Panel completo en Django Admin (`/admin/core/encodingpreset/`)
- Campos organizados en secciones:
  - Información Básica
  - Configuración FFmpeg
  - Control de Acceso
  - Estadísticas de uso
- Filtros por categoría, es_global, activo, fecha
- Búsqueda por nombre y descripción

## 📦 Estructura de Settings JSON

Ejemplo de configuración FFmpeg en el campo `settings`:

```json
{
  "formato": "mp4",
  "codec": "h264",
  "resolucion": "1920x1080",
  "bitrate": "5000k",
  "audio_bitrate": "192k",
  "fps": "30"
}
```

### Campos Requeridos
- `formato`: Formato de salida (mp4, mov, webm, etc.)
- `codec`: Codec de video (h264, h265, vp9, etc.)

### Campos Opcionales
- `resolucion`: Dimensiones (ej: "1920x1080", "1280x720")
- `bitrate`: Tasa de bits de video (ej: "5000k", "2M")
- `audio_bitrate`: Tasa de bits de audio (ej: "192k", "128k")
- `fps`: Cuadros por segundo (ej: "30", "25", "60")

## 🎬 Presets Iniciales Creados

Se han creado 11 presets predefinidos organizados por categoría:

### Broadcast (3 presets)
1. **HD 1080p Alta Calidad** - 1920x1080, 8000k
2. **HD 720p Calidad Media** - 1280x720, 4000k
3. **4K Ultra HD** - 3840x2160, 20000k

### Web (2 presets)
4. **Web HD** - 1280x720, 2500k
5. **Web SD** - 854x480, 1000k

### Mobile (2 presets)
6. **Mobile Alta** - 1280x720, 1500k
7. **Mobile Baja** - 640x360, 500k

### Social (4 presets)
8. **Instagram Feed** - 1080x1920 (vertical), 3500k
9. **Facebook HD** - 1280x720, 2000k
10. **YouTube HD** - 1920x1080, 5000k
11. **TikTok Vertical** - 1080x1920, 2500k

## 🔧 Uso del Sistema

### Crear un Preset desde Django Admin

1. Ir a `/admin/core/encodingpreset/`
2. Clic en "Agregar Encoding Preset"
3. Completar campos:
   - **Nombre**: Nombre descriptivo del preset
   - **Descripción**: Explicación del uso recomendado
   - **Categoría**: Seleccionar de la lista
   - **Settings**: JSON con configuración FFmpeg
   - **Es global**: Marcar si todos pueden usarlo
   - **Activo**: Marcar para habilitar
4. Guardar

### Crear un Preset desde la API

```bash
curl -X POST http://localhost:8000/api/encoding-presets/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Mi Preset Custom",
    "descripcion": "Preset personalizado para...",
    "categoria": "custom",
    "es_global": false,
    "activo": true,
    "settings": {
      "formato": "mp4",
      "codec": "h264",
      "resolucion": "1920x1080",
      "bitrate": "5000k",
      "audio_bitrate": "192k",
      "fps": "30"
    }
  }'
```

### Listar Presets Disponibles

```bash
curl -X GET http://localhost:8000/api/encoding-presets/ \
  -H "Authorization: Token YOUR_TOKEN"
```

### Listar por Categoría

```bash
curl -X GET http://localhost:8000/api/encoding-presets/by_category/ \
  -H "Authorization: Token YOUR_TOKEN"
```

## 📊 Estadísticas de Uso

El sistema rastrea automáticamente el uso de cada preset:

```bash
# Incrementar contador de uso
curl -X POST http://localhost:8000/api/encoding-presets/{id}/increment_usage/ \
  -H "Authorization: Token YOUR_TOKEN"
```

## 🛠️ Comando de Management

Para crear/recrear los presets iniciales:

```bash
python manage.py seed_encoding_presets
```

Este comando:
- Crea todos los presets predefinidos
- No duplica presets existentes
- Requiere al menos un usuario administrador

## 🔐 Seguridad y Permisos

- **Crear/Editar/Eliminar**: Solo administradores (`IsAdminUser`)
- **Ver/Listar**: Todos los usuarios autenticados (`IsAuthenticated`)
- **Filtrado automático**: Los usuarios solo ven presets globales o propios
- **Soft Delete**: DELETE desactiva en lugar de eliminar físicamente

## 📝 Validación de Settings

El serializer valida que los settings incluyan:
- `formato` (requerido)
- `codec` (requerido)

Campos adicionales son opcionales y personalizables.

## 🚀 Próximos Pasos

Para completar la integración:

1. **Frontend - EncodingModal:**
   - Cargar presets desde API
   - Agregar tab "Mis Presets" / "Presets Personalizados"
   - Mostrar presets en grid junto a presets hardcoded
   - Implementar selector de preset

2. **Download Naming:**
   - Modificar respuesta de encode para incluir `preset_name`
   - Actualizar download handler: `{original_name} ({preset_name}).{ext}`

3. **Preset Management UI:**
   - Modal para crear/editar presets desde frontend
   - Formulario con validación de JSON
   - Preview de configuración

## 📂 Archivos Modificados

### Backend
- `core/models.py` - Modelo EncodingPreset
- `core/serializers.py` - EncodingPresetSerializer
- `core/views.py` - EncodingPresetViewSet
- `core/urls.py` - Router registration
- `core/admin.py` - Admin interface
- `core/migrations/0033_encodingpreset.py` - Migration
- `core/management/commands/seed_encoding_presets.py` - Seeding command

### Pendiente Frontend
- `frontend/src/components/EncodingModal_v2.jsx` - Integración de presets
- Nuevo componente: `PresetManager.jsx` (opcional)

## ✅ Testing

Verificar que el sistema funciona:

```bash
# 1. Verificar que la migración se aplicó
python manage.py showmigrations core

# 2. Verificar presets en la base de datos
python manage.py shell
>>> from core.models import EncodingPreset
>>> EncodingPreset.objects.count()
11

# 3. Probar API
curl http://localhost:8000/api/encoding-presets/ \
  -H "Authorization: Token YOUR_TOKEN"
```

## 🐛 Troubleshooting

**Error: "Campo 'formato' es requerido en settings"**
- Asegúrate de incluir `formato` y `codec` en el JSON de settings

**No veo mis presets personalizados**
- Verifica que `activo=True`
- Si no es global, solo el creador puede verlo
- Administradores ven todos

**No puedo crear presets**
- Solo administradores pueden crear presets
- Verifica permisos de usuario (`is_staff=True` o `is_superuser=True`)
