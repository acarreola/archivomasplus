# 📸 Formatos de Imagen Soportados - ArchivoPlus

## ✅ Formatos Principales (100% Compatibles)

### Formatos Estándar
| Formato | Extensión | Descripción | Uso Común |
|---------|-----------|-------------|-----------|
| **JPEG** | `.jpg`, `.jpeg` | Formato comprimido estándar | Fotografías, web |
| **PNG** | `.png` | Soporte para transparencia | Gráficos, logos, web |
| **GIF** | `.gif` | Imágenes animadas o estáticas | Animaciones, web |
| **BMP** | `.bmp` | Bitmap sin compresión | Windows nativo |
| **TIFF** | `.tiff`, `.tif` | Alta calidad profesional | Impresión, archivos |

### Formatos Profesionales
| Formato | Extensión | Descripción | Uso Común |
|---------|-----------|-------------|-----------|
| **PSD** | `.psd` | Adobe Photoshop Document | Diseño gráfico, edición profesional |

### Formatos Móviles
| Formato | Extensión | Descripción | Uso Común |
|---------|-----------|-------------|-----------|
| **HEIC** | `.heic` | Apple High Efficiency Image | iPhone/iPad (iOS 11+) |
| **HEIF** | `.heif` | High Efficiency Image Format | Dispositivos modernos |

### Formatos Profesionales (RAW)
| Formato | Extensión | Cámara/Fabricante |
|---------|-----------|-------------------|
| **Canon RAW** | `.cr2`, `.cr3` | Canon DSLR/Mirrorless |
| **Nikon RAW** | `.nef` | Nikon DSLR/Mirrorless |
| **Sony RAW** | `.arw` | Sony Alpha |
| **Fujifilm RAW** | `.raf` | Fujifilm X-Series |
| **Olympus RAW** | `.orf` | Olympus OM-D |
| **Panasonic RAW** | `.rw2` | Panasonic Lumix |
| **Pentax RAW** | `.pef` | Pentax K-Series |
| **Samsung RAW** | `.srw` | Samsung NX |
| **Adobe DNG** | `.dng` | Universal RAW |
| **Generic RAW** | `.raw` | Diversos fabricantes |

### Formatos Vectoriales
| Formato | Extensión | Descripción | Limitaciones |
|---------|-----------|-------------|--------------|
| **SVG** | `.svg` | Scalable Vector Graphics | Se convierte a raster para preview |

---

## 🔄 Procesamiento Automático

Cuando subes una imagen, el sistema automáticamente:

### 1. **Preserva el Original**
- Se guarda en `media/sources/` con formato nativo
- Mantiene toda la calidad y metadata original
- Nombres únicos con UUID corto (8 caracteres)

### 2. **Crea Versión Web Optimizada**
- Ubicación: `media/support/`
- Formato: **JPEG** (universal)
- Calidad: **85%** (balance calidad/tamaño)
- Dimensiones máximas: **2048px** (lado más largo)
- Optimización: Compresión inteligente

### 3. **Genera Thumbnail**
- Ubicación: `media/thumbnails/`
- Formato: **JPEG**
- Calidad: **80%**
- Dimensiones: **300x300px** (proporción preservada)

### 4. **Conversiones Especiales**

#### Transparencia (PNG, GIF, TIFF con alpha)
- ✅ Fondo blanco automático
- ✅ Mantiene proporciones
- ✅ Conversión limpia a JPEG

#### HEIC/HEIF (iOS)
- ✅ Conversión directa a JPEG
- ✅ Preserva calidad
- ✅ Compatible con todas las versiones de iOS

#### RAW (Cámaras Profesionales)
- ✅ Procesamiento con ajustes de cámara
- ✅ White balance automático
- ✅ Máxima calidad de conversión
- ✅ Soporta 10+ fabricantes

#### GIF Animados
- ✅ Extrae primer frame
- ✅ Mantiene dimensiones originales
- ⚠️ No preserva animación (solo frame estático)

#### SVG (Vectorial)
- ⚠️ Se crea placeholder para preview
- 📝 Archivo original preservado
- ⚠️ Limitación: No se renderiza vectorialmente

---

## 📊 Metadata Capturada

Para cada imagen procesada se almacena:
- **Dimensiones**: Ancho × Alto (píxeles)
- **Formato original**: JPG, PNG, HEIC, RAW, etc.
- **Modo de color**: RGB, RGBA, etc.
- **Tamaño de archivo**: Bytes del original

---

## 🚀 Librerías Utilizadas

### Python (Backend)
```python
Pillow>=10.1.0          # Procesamiento de imágenes base
pillow-heif>=0.13.0     # Soporte HEIC/HEIF
rawpy>=0.18.1           # Procesamiento RAW
imageio>=2.31.0         # Formatos adicionales
numpy>=1.26.0           # Procesamiento numérico para RAW
```

---

## 💡 Ejemplos de Uso

### Subir Foto de iPhone (HEIC)
1. Selecciona imagen `.heic` desde iPhone
2. Sistema detecta formato HEIC
3. Convierte automáticamente a JPEG
4. ✅ Disponible para descarga y visualización

### Subir RAW de Canon (.CR2)
1. Sube archivo `.cr2` desde tarjeta SD
2. Sistema procesa RAW con ajustes de cámara
3. Genera JPEG de alta calidad
4. ✅ Preserva archivo RAW original

### Subir PNG con Transparencia
1. Sube logo `.png` con fondo transparente
2. Sistema detecta canal alpha
3. Aplica fondo blanco automáticamente
4. ✅ Conversión limpia a JPEG

---

## ⚠️ Limitaciones Conocidas

| Formato | Limitación | Workaround |
|---------|------------|------------|
| **SVG** | No se renderiza vectorialmente | Se preserva original, preview es placeholder |
| **GIF animado** | Solo primer frame | Considerar video para animaciones |
| **RAW muy grandes** | Procesamiento lento (>50MB) | Espera de 10-30 segundos |
| **HEIC en Windows** | Requiere librerías especiales | Automático en servidor |

---

## 🎯 Formatos Recomendados por Uso

### Para Web/Digital
- ✅ **JPG** - Balance perfecto
- ✅ **PNG** - Si necesitas transparencia
- ✅ **HEIC** - Desde iPhone (se convierte auto)

### Para Impresión
- ✅ **TIFF** - Máxima calidad
- ✅ **RAW** - Procesamiento profesional
- ⚠️ **JPG** - Calidad 85%+ aceptable

### Para Archivo/Respaldo
- ✅ **RAW** - Datos originales de cámara
- ✅ **TIFF** - Sin pérdida de calidad
- ✅ **PNG** - Gráficos sin degradación

---

## 🔍 Verificación de Formato

El sistema valida automáticamente:
1. ✅ Extensión de archivo
2. ✅ Tipo MIME
3. ✅ Integridad de datos
4. ✅ Procesabilidad

Si un archivo no se puede procesar:
- ❌ Estado: `ERROR`
- 📝 Mensaje de error descriptivo
- 🔄 Opción de reintentar

---

## 📌 Resumen de Extensiones Soportadas

```
.jpg, .jpeg    → JPEG estándar
.png           → PNG con/sin transparencia
.gif           → GIF estático o animado
.bmp           → Windows Bitmap
.tiff, .tif    → TIFF profesional
.heic, .heif   → Apple High Efficiency
.svg           → SVG vectorial
.raw           → RAW genérico
.cr2, .cr3     → Canon RAW
.nef           → Nikon RAW
.arw           → Sony RAW
.raf           → Fujifilm RAW
.orf           → Olympus RAW
.rw2           → Panasonic RAW
.pef           → Pentax RAW
.srw           → Samsung RAW
.dng           → Adobe DNG
```

**Total: 20+ formatos soportados** ✅
