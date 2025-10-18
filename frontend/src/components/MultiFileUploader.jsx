import { useState, useRef } from 'react';
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
  const abortControllerRef = useRef(null);

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

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    
    // Validar files con el módulo
    const validFiles = [];
    const invalidFiles = [];

    droppedFiles.forEach(file => {
      const validation = isFileAllowed(file);
      if (validation.allowed) {
        validFiles.push(file);
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
    
    // Validar files con el módulo
    const validFiles = [];
    const invalidFiles = [];

    selectedFiles.forEach(file => {
      const validation = isFileAllowed(file);
      if (validation.allowed) {
        validFiles.push(file);
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

  const addFiles = (newFiles) => {
    const filesWithMetadata = newFiles.map(file => ({
      file,
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      name: file.name,
      size: file.size,
      status: 'pending', // pending, uploading, completed, error
      progress: 0,
      error: null
    }));
    
    setFiles(prev => [...prev, ...filesWithMetadata]);
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
    if (dirId) {
      formData.append('directorio', dirId);
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

    try {
      // Actualizar estado a uploading
      setFiles(prev => prev.map(f => 
        f.id === fileData.id ? { ...f, status: 'uploading', progress: 0 } : f
      ));

      await axios.post('http://localhost:8000/api/broadcasts/', formData, {
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

      // Manejar error de archivo duplicado
      if (error.response?.data?.error === 'duplicate_file') {
        setFiles(prev => prev.map(f => 
          f.id === fileData.id ? { 
            ...f, 
            status: 'error', 
            error: error.response.data.message || 'This file has already been uploaded'
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
              {isDragging ? 'Drop files here!' : 'Drag video files here'}
            </p>
            <p className="text-sm text-gray-500 mb-4">or</p>
            <button
              type="button"
              onClick={() => fileInputRef.current.click()}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
            >
              Select Files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
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
