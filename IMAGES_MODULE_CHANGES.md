# Cambios al Módulo de Imágenes - Sistema de Doble Almacenamiento

## 📋 Resumen
Se implementó un sistema profesional de almacenamiento de imágenes con **dos formatos**:
- **`sources/`**: Archivo original en formato nativo (PNG, TIFF, PSD, etc.)
- **`support/`**: Versión optimizada JPG para visualización web

## 🔧 Cambios Realizados

### 1. Backend - Modelo de Datos (`core/models.py`)
**Modelo:** `ImageAsset` (líneas 233-270)

**Campos añadidos:**
- `imagen_web`: ImageField que almacena la versión JPG optimizada en `support/`
- `archivo_original`: FileField modificado para usar `upload_to_originals` (almacena en `sources/`)
- `metadata`: JSONField para almacenar dimensiones, formato, modo de color
- `estado`: PENDIENTE → PROCESANDO → COMPLETADO/ERROR

### 2. Backend - Procesamiento Asíncrono (`core/tasks.py`)
**Nueva tarea Celery:** `process_image` (líneas ~908-990)

**Funcionalidad:**
1. Abre la imagen original con PIL/Pillow
2. Convierte a RGB si es necesario (RGBA → RGB con fondo blanco)
3. Redimensiona si excede 2048px en el lado más largo (mantiene aspecto)
4. Guarda versión JPG en `support/` con calidad 85%
5. Crea thumbnail de 300x300px en `thumbnails/`
6. Almacena metadata (ancho, alto, formato, modo)
7. Actualiza estado a COMPLETADO o ERROR

**Conversión de formatos:**
- **RGBA/LA/P** → RGB con fondo blanco (#FFFFFF)
- **Tamaño máximo:** 2048px en lado más largo
- **Calidad JPG:** 85%
- **Thumbnail:** 300x300px

### 3. Backend - API Views (`core/views.py`)
**ViewSet:** `ImageAssetViewSet` (líneas 1665-1676)

**Cambios:**
- `perform_create`: Llama a `process_image.delay(instance.id)` después de guardar
- Procesamiento asíncrono automático al subir imagen

### 4. Backend - Serializers (`core/serializers.py`)
**Serializer:** `ImageAssetSerializer` (líneas 628-677)

**Nuevos campos:**
- `imagen_web_url`: URL absoluta de la versión JPG optimizada
- `thumbnail_url`: URL absoluta del thumbnail
- `file_size`: Tamaño del archivo original en bytes

**Métodos:**
- `get_imagen_web_url()`: Construye URL absoluta para la imagen web
- `get_thumbnail_url()`: Construye URL absoluta para el thumbnail
- `get_file_size()`: Retorna tamaño del archivo en bytes

### 5. Backend - Migración
**Archivo:** `core/migrations/0029_imageasset_imagen_web_and_more.py`

**Cambios:**
- Añade campo `imagen_web` al modelo `ImageAsset`
- Altera campo `archivo_original` para usar función `upload_to_originals`

**Estado:** ✅ Aplicada exitosamente

### 6. Frontend - Upload (`frontend/src/components/MultiFileUploader.jsx`)
**Cambios en líneas 227-236:**

**Antes:**
```javascript
const isAudioModule = moduloInfo?.tipo === 'audio';
const uploadEndpoint = isAudioModule 
  ? 'http://localhost:8000/api/audios/' 
  : 'http://localhost:8000/api/broadcasts/';
```

**Después:**
```javascript
const isAudioModule = moduloInfo?.tipo === 'audio';
const isImagesModule = moduloInfo?.tipo === 'images';

let uploadEndpoint = 'http://localhost:8000/api/broadcasts/'; // default: videos
if (isAudioModule) {
  uploadEndpoint = 'http://localhost:8000/api/audios/';
} else if (isImagesModule) {
  uploadEndpoint = 'http://localhost:8000/api/images/';
}
```

**Resultado:** El frontend ahora usa `/api/images/` para módulos de tipo `images`

### 7. Frontend - Visualización (`frontend/src/components/ComercialesManager.jsx`)
**Vista de imágenes (líneas 1505-1595):**

**Características:**
- Tabla con columnas: Thumbnail, File Name, File Type, Dimensions, Size, Date, Actions
- Usa `thumbnail_url` del API para mostrar previews
- Muestra dimensiones desde `metadata.width` y `metadata.height`
- Botones de descarga y eliminación

## 📁 Estructura de Archivos

```
media/
├── sources/              # ← Archivos originales (PNG, TIFF, PSD, etc.)
│   └── [repositorio]/
│       └── [archivo_original]
├── support/              # ← Versión JPG optimizada para web
│   └── [imagen_web].jpg
└── thumbnails/           # ← Previews 300x300px
    └── [thumbnail].jpg
```

## 🔄 Flujo de Trabajo

1. **Usuario sube imagen** → `MultiFileUploader` → POST `/api/images/`
2. **Backend guarda original** → `sources/[repo]/[archivo]`
3. **Celery ejecuta `process_image`**:
   - Abre imagen original
   - Convierte a RGB si necesario
   - Redimensiona si > 2048px
   - Guarda JPG en `support/`
   - Crea thumbnail en `thumbnails/`
   - Guarda metadata
4. **Frontend muestra**:
   - Thumbnail en tabla
   - Link de descarga del original
   - Información de dimensiones y tamaño

## 🧪 Pruebas Necesarias

### Test 1: Subir imagen PNG
1. Ir a módulo Images
2. Subir archivo PNG > 2048px
3. Verificar:
   - Original en `sources/`
   - JPG optimizado en `support/`
   - Thumbnail en `thumbnails/`
   - Estado = COMPLETADO

### Test 2: Subir imagen RGBA
1. Subir PNG con transparencia
2. Verificar que JPG tiene fondo blanco (no negro)

### Test 3: Subir imagen TIFF
1. Subir archivo TIFF
2. Verificar conversión a JPG
3. Verificar metadata correcta

## ⚠️ Notas Importantes

1. **Celery debe estar corriendo** para procesamiento automático:
   ```bash
   celery -A archivoplus_backend worker --loglevel=info
   ```

2. **PIL/Pillow requerido**:
   ```bash
   pip install Pillow
   ```

3. **Formatos soportados** (según PIL):
   - JPG/JPEG
   - PNG (con y sin transparencia)
   - TIFF
   - BMP
   - GIF
   - WebP
   - PSD (limitado)

4. **Límites de tamaño**:
   - Original: Sin límite (depende de configuración Django)
   - Web: Máximo 2048px en lado más largo
   - Thumbnail: 300x300px (crop desde centro)

## 🐛 Debugging

### Ver logs de Celery:
```bash
# Terminal con celery worker debe mostrar:
[2024-XX-XX XX:XX:XX,XXX: INFO/MainProcess] Task core.tasks.process_image[...] received
[2024-XX-XX XX:XX:XX,XXX: INFO/ForkPoolWorker-X] ✅ Imagen procesada exitosamente
```

### Verificar archivos generados:
```bash
# Archivo original
ls -lh media/sources/[repositorio]/

# JPG web
ls -lh media/support/

# Thumbnail
ls -lh media/thumbnails/
```

### Consultar estado en base de datos:
```python
from core.models import ImageAsset
img = ImageAsset.objects.first()
print(f"Estado: {img.estado}")
print(f"Metadata: {img.metadata}")
print(f"Original: {img.archivo_original.path}")
print(f"Web: {img.imagen_web.path if img.imagen_web else 'N/A'}")
print(f"Thumbnail: {img.thumbnail.path if img.thumbnail else 'N/A'}")
```

## ✅ Estado Actual

- ✅ Backend completamente implementado
- ✅ Migración de base de datos aplicada
- ✅ Frontend actualizado para usar endpoint correcto
- ✅ Serializador expone URLs absolutas
- ⏳ Pendiente: Cargar imágenes de prueba
- ⏳ Pendiente: Verificar que Celery procesa correctamente

## 🚀 Próximos Pasos

1. Iniciar Celery worker
2. Subir imagen de prueba
3. Verificar procesamiento exitoso
4. Verificar visualización en frontend
5. Probar descarga de original
