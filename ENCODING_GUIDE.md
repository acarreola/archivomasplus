# 🎬 Guía del Codificador Profesional

## Descripción General

El codificador profesional está basado en **FFmpeg** y ofrece múltiples presets optimizados para diferentes plataformas y casos de uso, similar a FFWorks.

## ✨ Características

- **4 Categorías de Presets:**
  - 📺 **Broadcast**: ProRes 422 HQ/Standard, DNxHD 185
  - 🌐 **Web**: H.264 High/Medium, H.265, VP9
  - 📱 **Mobile**: iPhone, Android, Mobile HD
  - 💬 **Social Media**: Instagram Feed/Story, YouTube 4K, Facebook HD

- **Modo Personalizado:**
  - Control total sobre todos los parámetros de encoding
  - Soporte para múltiples codecs: H.264, H.265, VP9, ProRes, DNxHD
  - Configuración de resolución, FPS, calidad (CRF), presets de velocidad
  - Opciones avanzadas: profile, pixel format, bitrates

## 🚀 Cómo Usar

### 1. Acceder al Codificador

1. Selecciona un **repositorio** y **módulo**
2. Localiza el video que deseas codificar
3. Haz clic en el botón **"Encode"** (amarillo)

### 2. Seleccionar un Preset

El modal mostrará 4 pestañas con presets optimizados:

#### 📺 Broadcast
- **ProRes 422 HQ**: Máxima calidad para edición profesional
- **ProRes 422**: Calidad estándar para broadcast
- **DNxHD 185**: Avid DNxHD 1920x1080 185Mbps

#### 🌐 Web
- **H.264 High Quality**: CRF 18, 1080p para web y redes sociales
- **H.264 Medium**: CRF 23, balance calidad/tamaño
- **H.265 High Efficiency**: HEVC para streaming moderno
- **VP9 Web**: Google VP9 para YouTube/streaming

#### 📱 Mobile
- **iPhone Optimized**: H.264 baseline para máxima compatibilidad
- **Android Optimized**: Optimizado para dispositivos Android
- **Mobile HD**: 720p optimizado para móviles

#### 💬 Social Media
- **Instagram Feed**: 1080x1080 cuadrado 1:1
- **Instagram Story**: 1080x1920 vertical 9:16
- **YouTube 4K**: Ultra HD 3840x2160
- **Facebook HD**: 1920x1080 optimizado

### 3. Modo Personalizado ⚙️

Activa el modo personalizado para control total:

#### Configuración Básica:
- **Formato de Contenedor**: MP4, MOV, MKV, WebM, AVI
- **Codec de Video**: H.264, H.265, VP9, ProRes, DNxHD
- **Resolución**: 4K UHD, QHD, Full HD, HD, SD, Instagram, o personalizada
- **Frame Rate**: 23.976, 24, 25, 29.97, 30, 50, 60 fps o mantener original

#### Control de Calidad:
- **CRF (Constant Rate Factor)**: 
  - 0-17: Casi sin pérdida (archivos grandes)
  - 18-23: Alta calidad (recomendado)
  - 23-28: Calidad web (balance)
  - 28+: Compresión alta (archivos pequeños)

- **Preset de Velocidad**:
  - ultrafast → veryslow
  - Más lento = mejor compresión

#### Audio:
- **Codec**: AAC, MP3, Opus, PCM, AC3
- **Bitrate**: 64k - 320k

#### Opciones Avanzadas:
- **Profile H.264**: baseline (móviles), main (general), high (máxima compresión)
- **Pixel Format**: YUV 4:2:0, 4:2:2, 4:4:4

### 4. Iniciar Codificación

1. Selecciona un preset o configura modo personalizado
2. Haz clic en **"🚀 INICIAR CODIFICACIÓN"**
3. La tarea se ejecutará en segundo plano con Celery
4. Recibirás una notificación cuando termine

## 📁 Archivos Generados

Los videos codificados se guardan en:
```
media/encoded/{comercial_id}_{preset_id}.{formato}
```

Ejemplo:
```
media/encoded/a1b2c3d4_h264-high.mp4
media/encoded/a1b2c3d4_instagram-feed.mp4
media/encoded/a1b2c3d4_custom.mov
```

## 🔧 Detalles Técnicos

### Backend
- **Endpoint**: `POST /api/comerciales/encode/`
- **Request Body**:
```json
{
  "comercial_id": "uuid-del-comercial",
  "settings": {
    "formato": "mp4",
    "codec": "libx264",
    "resolution": "1920x1080",
    "fps": "30",
    "crf": "23",
    "preset": "medium",
    "audio_codec": "aac",
    "audio_bitrate": "128k",
    "profile": "main",
    "pixel_format": "yuv420p"
  },
  "preset_id": "h264-high"
}
```

### Tarea Celery
- **Función**: `encode_custom_video(comercial_id, encoding_settings, preset_id)`
- **Ubicación**: `core/tasks.py`
- **Worker**: Ejecuta FFmpeg con los parámetros especificados

### Comandos FFmpeg Generados

Ejemplo H.264 High Quality:
```bash
ffmpeg -i input.mp4 \
  -c:v libx264 \
  -preset slow \
  -crf 18 \
  -vf scale=1920:1080 \
  -r 30 \
  -profile:v high \
  -pix_fmt yuv420p \
  -c:a aac \
  -b:a 192k \
  -movflags +faststart \
  output.mp4 -y
```

Ejemplo ProRes 422 HQ:
```bash
ffmpeg -i input.mp4 \
  -c:v prores_ks \
  -profile:v 3 \
  -c:a pcm_s16le \
  -b:a 1411k \
  output.mov -y
```

## 🎯 Casos de Uso Recomendados

### Para Edición (Broadcast)
- **ProRes 422 HQ**: Edición profesional en Premiere/Final Cut
- **DNxHD 185**: Edición en Avid Media Composer

### Para Web/Streaming
- **H.264 High**: Websites, Vimeo, landing pages
- **H.265**: Streaming moderno, ahorro de ancho de banda
- **VP9**: YouTube, plataformas Google

### Para Mobile
- **iPhone/Android Optimized**: Apps móviles
- **Mobile HD**: Balance entre calidad y tamaño

### Para Redes Sociales
- **Instagram Feed**: Posts cuadrados
- **Instagram Story**: Historias verticales
- **YouTube 4K**: Videos de alta resolución
- **Facebook HD**: Posts y anuncios

## ⚠️ Consideraciones

1. **Tiempo de Codificación**: 
   - Presets más lentos = mejor calidad pero más tiempo
   - ProRes/DNxHD son más rápidos pero archivos más grandes

2. **Espacio en Disco**:
   - H.264/H.265: Archivos pequeños
   - ProRes/DNxHD: Archivos muy grandes (10-100x más)

3. **Compatibilidad**:
   - H.264 baseline: Máxima compatibilidad
   - H.265/VP9: Requiere hardware/software moderno
   - ProRes: Principalmente macOS/Final Cut

4. **Tareas Asíncronas**:
   - Las codificaciones se ejecutan en background
   - No cerrar el navegador no afecta el proceso
   - Celery worker maneja la cola de trabajos

## 🐛 Troubleshooting

### Error: "FFmpeg falló"
- Verificar que FFmpeg esté instalado en el contenedor worker
- Revisar logs: `docker-compose logs worker`

### Error: "Comercial no encontrado"
- Verificar que el ID del comercial sea correcto
- Verificar que existe archivo_original

### Codificación muy lenta
- Cambiar preset de "slow/veryslow" a "medium/fast"
- Reducir resolución
- Aumentar CRF (menor calidad, más rápido)

### Archivo muy grande
- Aumentar CRF (23 → 28)
- Usar H.265 en lugar de H.264
- Reducir resolución
- Reducir bitrate de audio

## 📊 Comparación de Tamaños (aproximado)

Para un video 1080p de 30 segundos:

| Preset | Codec | Tamaño Aprox. |
|--------|-------|---------------|
| ProRes 422 HQ | ProRes | ~1.5 GB |
| DNxHD 185 | DNxHD | ~700 MB |
| H.264 High (CRF 18) | H.264 | ~50 MB |
| H.264 Medium (CRF 23) | H.264 | ~25 MB |
| H.265 High (CRF 24) | H.265 | ~15 MB |
| VP9 Web | VP9 | ~12 MB |

## 🎨 Interfaz

El modal está dividido en:

### Panel Izquierdo
- Vista previa del video
- Información del archivo
- Producto, duración, estado

### Panel Derecho
- Pestañas de categorías
- Grid de presets
- Formulario personalizado
- Botón de iniciar codificación

### Footer
- Preset seleccionado
- Botones Cancelar / Iniciar

---

**Powered by FFmpeg** 🎬
