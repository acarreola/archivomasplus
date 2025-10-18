# Broadcast Model - Database Schema

## Campos principales del modelo Broadcast

### Identificación
- **id** (UUID) - Primary key, auto-generado
- **repositorio** (FK) - Relación con Repositorio (cliente/proyecto)
- **directorio** (FK, nullable) - Carpeta donde está ubicado el archivo
- **modulo** (FK, nullable) - Módulo al que pertenece (Storage, Reel, Broadcast, Audio, Images)

### Archivos
- **archivo_original** (FileField) - Archivo master original subido por el usuario
  - Path: `sources/{short_id}.ext`
  - Max length: 512 caracteres
  
- **nombre_original** (CharField) - Nombre original del archivo subido
  - Max length: 512 caracteres

### Archivos Transcodificados
- **ruta_proxy** (CharField) - Ruta al archivo H.265 proxy
  - Max length: 1024 caracteres
  - Uso: Visualización ligera en el navegador
  
- **ruta_h264** (CharField) - Ruta al archivo H.264 transcodificado
  - Max length: 1024 caracteres
  - Uso: Compatibilidad y descarga

- **encoded_files** (JSONField) - Lista de archivos codificados personalizados
  - Formato: `[{filename, path, codec, resolution, bitrate, etc.}, ...]`
  - Default: `[]`

### Thumbnails
- **thumbnail** (ImageField) - Thumbnail principal
  - Path: `thumbnails/`
  - Frame capturado en: 07:03 (timecode)
  - Uso: Vista de galería/lista
  
- **pizarra_thumbnail** (ImageField) - Thumbnail del slate/pizarra
  - Path: `pizarra/`
  - Frame capturado en: 00:02 (timecode)
  - Uso: Vista de edición

### Estado de Procesamiento
- **estado_transcodificacion** (CharField)
  - Opciones:
    - `PENDIENTE` - Pending
    - `PROCESANDO` - Processing
    - `COMPLETADO` - Completed
    - `ERROR` - Error
  - Default: `PENDIENTE`

### Metadata (Pizarra)
- **pizarra** (JSONField) - Metadata flexible del comercial
  - Default: `{}`
  - Campos típicos:
    ```json
    {
      "producto": "Product Name",
      "version": "Version/Title",
      "agencia": "Agency Name",
      "cliente": "Client Name",
      "duracion": "00:00:30:00",
      "tipo": "Master/H264/Proxy",
      "notas": "Additional notes"
    }
    ```

### Timestamps
- **fecha_subida** (DateTimeField) - Fecha de creación del registro
  - Auto-generado en creación

## Relaciones

### Repositorio
```python
repositorio = ForeignKey(Repositorio)
# Campos del repositorio:
# - nombre: str (nombre del cliente/proyecto)
# - folio: str (código único)
# - clave: str (clave manual 3 chars)
# - activo: bool
```

### Directorio (opcional)
```python
directorio = ForeignKey(Directorio, null=True)
# Campos del directorio:
# - nombre: str
# - repositorio: FK
# - modulo: FK
# - parent: FK (self, para jerarquía)
```

### Módulo (opcional)
```python
modulo = ForeignKey(Modulo, null=True)
# Tipos de módulo:
# - storage: Sin restricciones
# - reel: Solo H.264
# - broadcast: Solo Masters
# - audio: Solo Audio
# - images: Solo Imágenes
```

## Ejemplo de datos típicos

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "repositorio": "ACME Corp",
  "directorio": "Campaña 2025",
  "modulo": "Broadcast",
  "archivo_original": "sources/a1b2c3d4.mov",
  "nombre_original": "ACME_Product_Master_30s.mov",
  "ruta_proxy": "transcoded/a1b2c3d4_proxy.mp4",
  "ruta_h264": "transcoded/a1b2c3d4_h264.mp4",
  "thumbnail": "thumbnails/a1b2c3d4.jpg",
  "pizarra_thumbnail": "pizarra/a1b2c3d4.jpg",
  "estado_transcodificacion": "COMPLETADO",
  "pizarra": {
    "producto": "Product Name",
    "version": "30s Master",
    "agencia": "Creative Agency",
    "cliente": "ACME Corp",
    "duracion": "00:00:30:00",
    "tipo": "Master"
  },
  "encoded_files": [
    {
      "filename": "ACME_Product_1080p_10mbps.mp4",
      "path": "encoded/a1b2c3d4_custom_1.mp4",
      "codec": "h264",
      "resolution": "1920x1080",
      "bitrate": "10000k",
      "preset": "high_quality"
    }
  ],
  "fecha_subida": "2025-10-18T14:30:00Z"
}
```

## Serializer (API Response)

El serializer en `core/serializers.py` incluye campos calculados adicionales:

- **thumbnail_url** - URL completa del thumbnail
- **pizarra_thumbnail_url** - URL completa del pizarra thumbnail
- **repositorio_info** - Datos completos del repositorio
- **directorio_info** - Datos del directorio (si existe)
- **modulo_info** - Datos del módulo (si existe)

## Uso en Frontend

Los campos más utilizados en `ComercialesManager.jsx`:

```javascript
{
  id,
  repositorio,
  directorio,
  modulo,
  nombre_original,
  estado_transcodificacion,
  thumbnail_url,
  pizarra_thumbnail_url,
  pizarra: {
    producto,
    version,
    agencia,
    cliente,
    duracion,
    tipo
  },
  ruta_h264,
  ruta_proxy,
  encoded_files,
  fecha_subida
}
```
