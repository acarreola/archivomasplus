import { useState, useRef, useEffect } from 'react';
import axios from '../utils/axios';
import { useLanguage } from '../context/LanguageContext';

// Support both old and new prop names from callers
function MultiFileUploader(props) {
  const {
    repositorioId,
    // repo name may come as repositorioNombre (new) or repositorioName (old)
    repositorioNombre,
    repositorioName,
    // directory id/name may come as directorioId/directorioNombre (new) or folderId/folderName (old)
    directorioId,
    directorioNombre,
    folderId,
    folderName,
    moduloId,
    moduloInfo,
    onClose,
    onSuccess,
  } = props;

  const repoDisplayName = repositorioNombre || repositorioName || '';
  const dirId = directorioId || folderId || null;
  const dirDisplayName = directorioNombre || folderName || '';
  const { t } = useLanguage();
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const abortControllerRef = useRef(null);
  // Track existing files (name + extension) to prevent duplicates
  const existingKeysRef = useRef(new Set());
  const [preserveFolders, setPreserveFolders] = useState(true);
  // Cache for created/located directories to reduce API calls
  const dirCacheRef = useRef(new Map()); // key: `${parentId||0}/${name.toLowerCase()}` => id

  // Helper to build a normalized duplicate key: base name (without extension) + '.' + ext (lowercase)
  const buildDuplicateKey = (fileName) => {
    if (!fileName) return '';
    const parts = fileName.split('.');
    if (parts.length === 1) return parts[0].toLowerCase();
    const ext = parts.pop().toLowerCase();
    const base = parts.join('.').toLowerCase();
    return `${base}.${ext}`;
  };

  // Load existing names for this repo/modulo/directorio (only for current scope)
  useEffect(() => {
    if (!repositorioId || !moduloId) return;
    let cancelled = false;
    (async () => {
      try {
        // Decide endpoint according to module type
        let endpoint = '/api/broadcasts/';
        if (moduloInfo?.tipo === 'audio') endpoint = '/api/audios/';
        else if (moduloInfo?.tipo === 'images') endpoint = '/api/images/';
        else if (moduloInfo?.tipo === 'storage') endpoint = '/api/storage/';
        const params = new URLSearchParams();
        params.append('repositorio', repositorioId);
        params.append('modulo', moduloId);
        // Directory filter if provided
        if (dirId) params.append('directorio', dirId);
        const url = `${endpoint}?${params.toString()}`;
        const res = await axios.get(url);
        if (cancelled) return;
        const set = new Set();
        (res.data || []).forEach(item => {
          // For images/storage we may have nombre_original or nombre
          const raw = item.nombre_original || item.nombre || item.archivo_original || '';
          if (!raw) return;
            // raw might come without extension in some modules (broadcast uses nombre_original sin extension en form?)
          // Attempt to extract extension from archivo_original if nombre_original lacks it
          let nameForKey = raw;
          if (!/\.[a-zA-Z0-9]{1,6}$/.test(raw) && item.archivo_original && /\.[a-zA-Z0-9]{1,6}$/.test(item.archivo_original)) {
            const urlParts = item.archivo_original.split('/').pop();
            if (urlParts && /\.[a-zA-Z0-9]{1,6}$/.test(urlParts)) {
              nameForKey = urlParts;
            }
          }
          set.add(buildDuplicateKey(nameForKey));
        });
        existingKeysRef.current = set;
        // eslint-disable-next-line no-console
        console.log('🔐 Loaded existing file keys to prevent duplicates:', set.size);
      } catch (e) {
        console.warn('No se pudo cargar lista para validar duplicados', e);
      }
    })();
    return () => { cancelled = true; };
  }, [repositorioId, moduloId, dirId, moduloInfo]);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const isFileAllowed = (file) => {
    // Si no hay módulo o el módulo es Storage (sin restricciones), permitir todo
    if (!moduloInfo || !moduloInfo.formatos_permitidos || moduloInfo.formatos_permitidos.length === 0) {
      return { allowed: true, reason: '' };
    }

    // Obtener extensión del file
    const fileName = file.name.toLowerCase();
    const extension = '.' + fileName.split('.').pop();

    // Verificar si la extensión está permitida
    const allowed = moduloInfo.formatos_permitidos.some(formato => 
      fileName.endsWith(formato.toLowerCase())
    );

    if (!allowed) {
      return { 
        allowed: false, 
        reason: `Module ${moduloInfo.nombre || moduloInfo.name} only accepts: ${moduloInfo.formatos_permitidos.join(', ')}`
      };
    }

    return { allowed: true, reason: '' };
  };

  // Get accept attribute based on module allowed formats
  const getAcceptAttribute = () => {
    if (!moduloInfo || !moduloInfo.formatos_permitidos || moduloInfo.formatos_permitidos.length === 0) {
      return '*/*'; // Accept all files if no restrictions
    }
    
    // Convert extensions to mime types or keep as extensions
    return moduloInfo.formatos_permitidos.map(fmt => {
      // If it's already a mime type, return as is
      if (fmt.includes('/')) return fmt;
      // Otherwise, treat as file extension
      return fmt.startsWith('.') ? fmt : `.${fmt}`;
    }).join(',');
  };

  // Get user-friendly file type label
  const getFileTypeLabel = () => {
    if (!moduloInfo || !moduloInfo.nombre) return 'files';
    
    const moduleName = (moduloInfo.nombre || moduloInfo.name || '').toLowerCase();
    if (moduleName.includes('broadcast') || moduleName.includes('video')) return 'video files';
    if (moduleName.includes('audio')) return 'audio files';
    if (moduleName.includes('image')) return 'image files';
    return 'files';
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    console.log('🎯 handleDrop - moduloInfo:', moduloInfo);
    console.log('🎯 handleDrop - formatos_permitidos:', moduloInfo?.formatos_permitidos);
    console.log('🎯 handleDrop - accept attribute:', getAcceptAttribute());

    // Process both files and folders from drag & drop
    const items = e.dataTransfer.items;

    if (!items || items.length === 0) {
      // Fallback to files if items not available
      const droppedFiles = Array.from(e.dataTransfer.files);
      processFiles(droppedFiles, false);
      return;
    }

    // Process items (supports folders)
     // Process all items (files and folders) in parallel
     const promises = [];

     for (let i = 0; i < items.length; i++) {
       const item = items[i].webkitGetAsEntry?.() || items[i].getAsEntry?.();

       if (item) {
         if (item.isFile) {
           // Single file
           const file = items[i].getAsFile();
           if (file) {
             promises.push(Promise.resolve([{ file, relPath: file.name }]));
           }
         } else if (item.isDirectory) {
           // Folder - read recursively
           promises.push(readDirectoryRecursively(item, item.name));
         }
       } else {
         // Fallback for browsers without FileSystemEntry API
         const file = items[i].getAsFile();
         if (file) {
           promises.push(Promise.resolve([{ file, relPath: file.name }]));
         }
       }
     }

     // Wait for all folders and files to be processed
     const results = await Promise.all(promises);
     const allFiles = results.flat();

    // Validate and add files
    processFiles(allFiles.map(f => f.file), true, allFiles);
  };

  // Helper function to read directory recursively
  const readDirectoryRecursively = async (directoryEntry, basePath = '') => {
    const files = [];
    const reader = directoryEntry.createReader();
    
    return new Promise((resolve, reject) => {
      const readEntries = () => {
        reader.readEntries(async (entries) => {
          if (entries.length === 0) {
            // Done reading this directory
            resolve(files);
            return;
          }

          // Process each entry
          for (const entry of entries) {
            if (entry.isFile) {
              // Get the file
              const file = await new Promise((res, rej) => {
                entry.file(res, rej);
              });
              const relPath = basePath ? `${basePath}/${file.name}` : file.name;
              files.push({ file, relPath });
            } else if (entry.isDirectory) {
              // Recursively read subdirectory
              const subPath = basePath ? `${basePath}/${entry.name}` : entry.name;
              const subFiles = await readDirectoryRecursively(entry, subPath);
              files.push(...subFiles);
            }
          }

          // Continue reading (directories may return entries in batches)
          readEntries();
        }, reject);
      };

      readEntries();
    });
  };

  // Helper to process and validate files
  const processFiles = (files, hasRelPath = false, wrappedFiles = null) => {
    const validFiles = [];
    const invalidFiles = [];

    files.forEach((file, index) => {
      const validation = isFileAllowed(file);
      if (validation.allowed) {
        if (hasRelPath && wrappedFiles) {
          // Use the wrapped file with relPath
          validFiles.push(wrappedFiles[index]);
        } else {
          // Wrap the file
          validFiles.push({ file, relPath: file.webkitRelativePath || file.name });
        }
      } else {
        invalidFiles.push({ name: file.name, reason: validation.reason });
      }
    });

    if (invalidFiles.length > 0) {
      const message = `The following files are not allowed for the selected module:\n\n${
        invalidFiles.map(f => `• ${f.name}\n  ${f.reason}`).join('\n\n')
      }`;
      alert(message);
    }

    if (validFiles.length > 0) {
      addFiles(validFiles);
    }
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const wrapped = selectedFiles.map(f => ({ 
      file: f, 
      relPath: f.webkitRelativePath || f.name 
    }));
    processFiles(selectedFiles, true, wrapped);
  };

  const handleFolderSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (!selectedFiles || selectedFiles.length === 0) return;
    const wrapped = selectedFiles.map(f => ({ 
      file: f, 
      relPath: f.webkitRelativePath || f.name 
    }));
    processFiles(selectedFiles, true, wrapped);
  };

  const addFiles = (newFiles) => {
    const skipped = [];
    const accepted = [];
    // Build a set of already queued (pending or uploading) names to also block duplicates within the modal session
    const queuedKeys = new Set(files.map(f => buildDuplicateKey(f.name)));
    newFiles.forEach(item => {
      const file = item.file || item; // support both raw File and wrapped {file, relPath}
      const key = buildDuplicateKey(file.name);
      if (existingKeysRef.current.has(key) || queuedKeys.has(key)) {
        skipped.push(file.name);
      } else {
        accepted.push(item);
        queuedKeys.add(key);
      }
    });
    if (skipped.length > 0) {
      alert(`Los siguientes archivos ya existen (nombre + extensión):\n\n${skipped.map(n => '• ' + n).join('\n')}\n\nSe omitieron para evitar duplicados.`);
    }
    if (accepted.length === 0) return;
    const filesWithMetadata = accepted.map(item => {
      const f = item.file || item;
      return ({
      file: f,
      id: `${f.name}-${Date.now()}-${Math.random()}`,
      name: f.name,
      size: f.size,
      relPath: item.relPath || f.webkitRelativePath || f.name,
      status: 'pending',
      progress: 0,
      error: null
    })});
    setFiles(prev => [...prev, ...filesWithMetadata]);
  };

  // Ensure nested directory path exists (when preserveFolders is true)
  const ensureDirectoryPath = async (relativePath) => {
    // Take directory part (exclude filename)
    const parts = (relativePath || '').split('/').filter(Boolean);
    if (parts.length === 0) return dirId || null;
    const dirParts = parts.slice(0, -1); // exclude filename
    let parent = dirId || null;
    for (const name of dirParts) {
      const key = `${parent || 0}/${name.toLowerCase()}`;
      if (dirCacheRef.current.has(key)) {
        parent = dirCacheRef.current.get(key);
        continue;
      }
      // Try to find existing
      try {
        const params = new URLSearchParams();
        params.append('repositorio', repositorioId);
        if (moduloId) params.append('modulo', moduloId);
        if (parent) params.append('parent', parent);
        const res = await axios.get(`/api/directorios/?${params.toString()}`);
        const found = (res.data || []).find(d => (d.nombre || '').toLowerCase() === name.toLowerCase());
        let dirIdFound = found?.id;
        if (!dirIdFound) {
          // Create
          const payload = { nombre: name, repositorio: repositorioId, modulo: moduloId || null, parent: parent };
          const create = await axios.post('/api/directorios/', payload);
          dirIdFound = create.data.id;
        }
        dirCacheRef.current.set(key, dirIdFound);
        parent = dirIdFound;
      } catch (e) {
        console.error('Failed ensuring directory path', e);
        // fallback: keep current parent
      }
    }
    return parent;
  };

  const removeFile = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const uploadFile = async (fileData) => {
    const formData = new FormData();
    formData.append('repositorio', repositorioId);
    // Backend expects 'archivo_original'
    formData.append('archivo_original', fileData.file);
    
    // Send original filename to nombre_original field
    const originalName = fileData.name.replace(/\.[^/.]+$/, ''); // Name without extension
    formData.append('nombre_original', originalName);
    
    // Backend expects 'directorio' (optional)
    let targetDirId = dirId || null;
    if (preserveFolders && fileData.relPath) {
      try { targetDirId = await ensureDirectoryPath(fileData.relPath); } catch (e) { /* ignore */ }
    }
    if (targetDirId) {
      formData.append('directorio', targetDirId);
    }

    if (moduloId) {
      formData.append('modulo', moduloId);
    }

    // Pizarra: empty by default, user will fill manually
    const pizarra = {
      producto: '',
      cliente: '',
      agencia: '',
      version: '',
      duracion: '',
      formato: '',
      fecha: ''
    };
    formData.append('pizarra', JSON.stringify(pizarra));

    // Metadata para audio: empty by default
    const metadata = {
      titulo: '',
      artista: '',
      album: ''
    };
    formData.append('metadata', JSON.stringify(metadata));

    try {
      // Actualizar estado a uploading
      setFiles(prev => prev.map(f => 
        f.id === fileData.id ? { ...f, status: 'uploading', progress: 0 } : f
      ));

      // Determinar el endpoint según el tipo de módulo
      const isAudioModule = moduloInfo?.tipo === 'audio';
      const isImagesModule = moduloInfo?.tipo === 'images';
      const isStorageModule = moduloInfo?.tipo === 'storage';
      
      let uploadEndpoint = 'http://localhost:8000/api/broadcasts/'; // default: videos
      if (isAudioModule) {
        uploadEndpoint = 'http://localhost:8000/api/audios/';
      } else if (isImagesModule) {
        uploadEndpoint = 'http://localhost:8000/api/images/';
      } else if (isStorageModule) {
        uploadEndpoint = 'http://localhost:8000/api/storage/';
      }

      await axios.post(uploadEndpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        signal: abortControllerRef.current?.signal,
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setFiles(prev => prev.map(f => 
            f.id === fileData.id ? { ...f, progress: percentCompleted } : f
          ));
        }
      });

      // Marcar como completado
      setFiles(prev => prev.map(f => 
        f.id === fileData.id ? { ...f, status: 'completed', progress: 100 } : f
      ));

      // Añadir al set de existentes para bloquear futuros intentos en esta sesión
      const completedKey = buildDuplicateKey(fileData.name);
      if (completedKey) existingKeysRef.current.add(completedKey);

    } catch (error) {
      // Si fue cancelado, marcar como cancelado
      if (axios.isCancel(error)) {
        setFiles(prev => prev.map(f => 
          f.id === fileData.id ? { 
            ...f, 
            status: 'error', 
            error: 'Upload cancelled by user'
          } : f
        ));
        return;
      }

      console.error('Error uploading file:', error);
      setFiles(prev => prev.map(f => 
        f.id === fileData.id ? { 
          ...f, 
          status: 'error', 
          error: error.response?.data?.message || 'Error uploading file'
        } : f
      ));
    }
  };

  const uploadAllFiles = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    
    if (pendingFiles.length === 0) {
      alert('No hay files pendientes para subir');
      return;
    }

    // Create nuevo AbortController para esta sesión de carga
    abortControllerRef.current = new AbortController();

    // Upload files secuencialmente (uno a la vez)
    for (const fileData of pendingFiles) {
      // Si se canceló, detener el loop
      if (abortControllerRef.current.signal.aborted) {
        break;
      }
      await uploadFile(fileData);
    }

    // Notificar éxito y refrescar
    onSuccess();
  };

  const cancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return '⏸️';
      case 'uploading':
        return '⏫';
      case 'completed':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '📄';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 border-gray-300';
      case 'uploading':
        return 'bg-blue-50 border-blue-300';
      case 'completed':
        return 'bg-green-50 border-green-300';
      case 'error':
        return 'bg-red-50 border-red-300';
      default:
        return 'bg-gray-100 border-gray-300';
    }
  };

  const allCompleted = files.length > 0 && files.every(f => f.status === 'completed');
  const hasErrors = files.some(f => f.status === 'error');
  const isUploading = files.some(f => f.status === 'uploading');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 flex justify-between items-center rounded-t-lg">
          <div>
            <h2 className="text-xl font-semibold flex items-center space-x-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>{t('upload.title') || 'UPLOAD FILES'}</span>
            </h2>
            <p className="text-sm text-green-100 mt-1 flex items-center space-x-2">
              <span>📁 {repoDisplayName}</span>
              {moduloInfo && (
                <>
                  <span>•</span>
                  <span className="font-semibold">
                    {moduloInfo.nombre || moduloInfo.name}
                    {moduloInfo.formatos_permitidos && moduloInfo.formatos_permitidos.length > 0 && (
                      <span className="text-xs ml-2 opacity-80">
                        ({moduloInfo.formatos_permitidos.join(', ')})
                      </span>
                    )}
                  </span>
                </>
              )}
              {dirDisplayName && (
                <>
                  <span>•</span>
                  <span>{dirDisplayName}</span>
                </>
              )}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-white hover:text-gray-200 text-2xl font-bold"
            disabled={isUploading}
          >
            ×
          </button>
        </div>

        {/* Drag & Drop Area */}
        <div className="p-6 border-b">
          <div
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
              isDragging 
                ? 'border-green-500 bg-green-50' 
                : 'border-gray-300 bg-gray-50 hover:border-green-400 hover:bg-green-50'
            }`}
          >
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-lg font-semibold text-gray-700 mb-2">
              {isDragging 
                ? (moduloInfo?.tipo === 'audio' ? 'Drop files or folders here!' : 'Drop files here!') 
                : (moduloInfo?.tipo === 'audio' ? `Drag ${getFileTypeLabel()} or folders here` : `Drag ${getFileTypeLabel()} here`)
              }
            </p>
            <p className="text-sm text-gray-500 mb-4">or</p>
            
            <div className="flex items-center justify-center space-x-3">
              <button
                type="button"
                onClick={() => fileInputRef.current.click()}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
              >
                Select Files
              </button>
              
              {/* Show "Select Folder" button only for Audio module */}
              {moduloInfo?.tipo === 'audio' && (
                <button
                  type="button"
                  onClick={() => folderInputRef.current.click()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <span>Select Folder</span>
                </button>
              )}
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={getAcceptAttribute()}
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {/* Folder input (hidden) - only for Audio module */}
            {moduloInfo?.tipo === 'audio' && (
              <input
                ref={folderInputRef}
                type="file"
                webkitdirectory=""
                directory=""
                multiple
                accept={getAcceptAttribute()}
                onChange={handleFileSelect}
                className="hidden"
              />
            )}
          </div>
        </div>

        {/* Files List */}
        <div className="flex-1 overflow-y-auto p-6">
          {files.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-lg">No files selected</p>
              <p className="text-sm">Drag files here or click "Select Files"</p>
            </div>
          ) : (
            <div className="space-y-3">
              {files.map((fileData) => (
                <div 
                  key={fileData.id} 
                  className={`border-2 rounded-lg p-4 transition-all ${getStatusColor(fileData.status)}`}
                >
                  <div className="flex items-start space-x-3">
                    {/* Status Icon */}
                    <div className="text-2xl flex-shrink-0 mt-1">
                      {getStatusIcon(fileData.status)}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900 truncate flex-1">
                          {fileData.name}
                        </h4>
                        <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                          {formatFileSize(fileData.size)}
                        </span>
                        {fileData.status === 'pending' && (
                          <button
                            onClick={() => removeFile(fileData.id)}
                            className="ml-2 text-red-500 hover:text-red-700 flex-shrink-0"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        )}
                      </div>

                      {/* Progress Bar */}
                      {fileData.status === 'uploading' && (
                        <div className="mb-2">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${fileData.progress}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">{fileData.progress}%</p>
                        </div>
                      )}

                      {/* Error Message */}
                      {fileData.status === 'error' && fileData.error && (
                        <p className="text-sm text-red-600 mb-2">{fileData.error}</p>
                      )}

                      {/* Status Messages */}
                      {fileData.status === 'pending' && (
                        <p className="text-xs text-gray-500 mt-1">
                          ⏸️ Ready to upload • Metadata will be added after upload
                        </p>
                      )}
                      {/* Completed Message */}
                      {fileData.status === 'completed' && (
                        <p className="text-sm text-green-600 font-semibold">✓ Uploaded successfully</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t rounded-b-lg">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {files.length > 0 && (
                <>
                  <span className="font-semibold">{files.length}</span> file(s) •{' '}
                  <span className="text-green-600 font-semibold">
                    {files.filter(f => f.status === 'completed').length} completed
                  </span>
                  {hasErrors && (
                    <>
                      {' • '}
                      <span className="text-red-600 font-semibold">
                        {files.filter(f => f.status === 'error').length} error(es)
                      </span>
                    </>
                  )}
                </>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  if (isUploading) {
                    // If uploading, confirm cancel
                    if (window.confirm('Are you sure you want to cancel the current upload?')) {
                      cancelUpload();
                    }
                  } else {
                    // If not uploading, just close the modal
                    onClose();
                  }
                }}
                className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                  isUploading 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                {isUploading ? '⏹️ Cancel Upload' : (allCompleted ? 'Close' : 'Cancel')}
              </button>
              
              {!allCompleted && (
                <button
                  type="button"
                  onClick={uploadAllFiles}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-2 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  disabled={isUploading || files.filter(f => f.status === 'pending').length === 0}
                >
                  {isUploading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span>Upload {files.filter(f => f.status === 'pending').length} File(s)</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MultiFileUploader;
