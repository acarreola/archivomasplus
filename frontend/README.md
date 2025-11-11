# Frontend (Vite React)

## Iconos por tipo de archivo (Módulo Storage)

Se agregó soporte para mostrar diferentes íconos según la extensión de cada archivo dentro del módulo `storage`.

Utilidad: `src/utils/fileIcons.js`

Extensiones soportadas iniciales (documentos, hojas de cálculo, imágenes, audio, video, compresión). Para añadir nuevas:
1. Importa el ícono que quieras desde `react-icons/fi` (o cualquier otro sub‐paquete).
2. Añade un nuevo par `ext: IconComponent` dentro de `EXT_ICON_MAP`.
3. Guarda; Vite recarga automáticamente.

Ejemplo para añadir `.psd`:
```js
import { FiFile } from 'react-icons/fi'; // ya importado normalmente
// ...
const EXT_ICON_MAP = {
  // otros
  psd: FiFile,
}
```

Si una extensión no está mapeada se usa el ícono genérico (`FiFile`).

La vista de Storage incluye:
- Ícono grande centrado
- Chip con extensión
- Tamaño formateado (B / KB / MB)
- Acciones: Descargar, Compartir, Eliminar

Personalización:
Modifica el branch `if (currentModulo?.tipo === 'storage')` dentro de `src/components/ComercialesManager.jsx` para ajustar estilos o acciones.

Dependencia añadida: `react-icons@4.12.0`.
