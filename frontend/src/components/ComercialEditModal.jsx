// frontend/src/components/ComercialEditModal.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function ComercialEditModal({ comercial, onClose, onSave }) {
  const [activeTab, setActiveTab] = useState('preview'); // 'preview' or 'edit'
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  
  // Form data for editing
  const [formData, setFormData] = useState({
    nombre_original: '',
    pizarra: {
      producto: '',
      cliente: '',
      agencia: '',
      version: '',
      duracion: '',
      formato: '',
      fecha: '',
    }
  });

  // Initialize form data when comercial changes
  useEffect(() => {
    if (comercial) {
      setFormData({
        nombre_original: comercial.nombre_original || '',
        pizarra: {
          producto: comercial.pizarra?.producto || '',
          cliente: comercial.pizarra?.cliente || '',
          agencia: comercial.pizarra?.agencia || '',
          version: comercial.pizarra?.version || '',
          duracion: comercial.pizarra?.duracion || '',
          formato: comercial.pizarra?.formato || '',
          fecha: comercial.pizarra?.fecha || '',
        }
      });
    }
  }, [comercial]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('pizarra.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        pizarra: {
          ...prev.pizarra,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    
    try {
      await axios.patch(`/api/broadcasts/${comercial.id}/`, formData);
      onSave && onSave();
      onClose();
    } catch (err) {
      setError('Error saving changes: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSaving(false);
    }
  };

  if (!comercial) return null;

  // URL del video (usar proxy si está disponible, sino el original)
  const videoUrl = comercial.ruta_proxy 
    ? `http://localhost:8000/media/${comercial.ruta_proxy}`
    : comercial.file_original 
    ? `http://localhost:8000${comercial.file_original}`
    : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header with Tabs */}
        <div className="bg-blue-700 text-white px-6 py-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-semibold">
              {activeTab === 'preview' ? 'PREVIEW' : 'EDIT METADATA'}
            </h2>
            <button 
              onClick={onClose}
              className="text-white hover:text-gray-300 text-2xl font-bold"
            >
              ×
            </button>
          </div>
          
          {/* Tab Buttons */}
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-2 rounded-t-lg font-semibold transition ${
                activeTab === 'preview' 
                  ? 'bg-white text-blue-700' 
                  : 'bg-blue-600 text-white hover:bg-blue-500'
              }`}
            >
              Preview
            </button>
            <button
              onClick={() => setActiveTab('edit')}
              className={`px-4 py-2 rounded-t-lg font-semibold transition ${
                activeTab === 'edit' 
                  ? 'bg-white text-blue-700' 
                  : 'bg-blue-600 text-white hover:bg-blue-500'
              }`}
            >
              Edit Metadata
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          {activeTab === 'preview' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Lado Izquierdo: Video + Thumbnail */}
              <div className="space-y-4">
                {/* Video Player */}
                <div className="bg-black rounded-lg overflow-hidden shadow-lg" style={{ aspectRatio: '16/9' }}>
                  {videoUrl ? (
                    <video 
                      controls 
                      className="w-full h-full"
                      style={{ objectFit: 'contain' }}
                      src={videoUrl}
                    >
                      Tu navegador no soporta el elemento de video.
                    </video>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-center p-4">
                      <div>
                        <p>Video no disponible</p>
                        {comercial.estado_transcodificacion === 'PROCESANDO' && (
                          <p className="text-sm mt-2">Transcodificando...</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Thumbnail */}
                <div className="bg-white border-2 border-gray-200 rounded-lg p-4 shadow-sm">
                  <h3 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wide">Thumbnail Preview</h3>
                  {comercial.thumbnail_url ? (
                    <img 
                      src={comercial.thumbnail_url} 
                      alt="Thumbnail" 
                      className="w-full rounded border-2 border-gray-300 shadow-sm"
                    />
                  ) : (
                    <div className="w-full aspect-video bg-gray-100 rounded flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300">
                      <div className="text-center">
                        <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm">Sin thumbnail</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Lado Derecho: Metadata */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 rounded-lg p-6 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4 text-lg border-b-2 border-blue-500 pb-2">File Information</h3>
                <div className="space-y-4">
                  {/* Name Original */}
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="text-xs font-bold text-gray-500 uppercase mb-1">Original Name</div>
                    <div className="text-sm text-gray-900 break-all font-medium">
                      {comercial.nombre_original || 'N/A'}
                    </div>
                  </div>

                  {/* Código (File Name) */}
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="text-xs font-bold text-gray-500 uppercase mb-1">File Code</div>
                    <code className="text-sm bg-gray-800 text-green-400 px-3 py-1.5 rounded font-mono inline-block">
                      {comercial.id.split('-')[0]}.mov
                    </code>
                  </div>

                  {/* File Size */}
                  {comercial.file_size && (
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="text-xs font-bold text-gray-500 uppercase mb-1">File Size</div>
                      <div className="text-sm text-gray-900 font-medium">
                        {(() => {
                          const bytes = comercial.file_size;
                          if (bytes >= 1073741824) {
                            return `${(bytes / 1073741824).toFixed(2)} GB`;
                          } else if (bytes >= 1048576) {
                            return `${(bytes / 1048576).toFixed(2)} MB`;
                          } else if (bytes >= 1024) {
                            return `${(bytes / 1024).toFixed(2)} KB`;
                          } else {
                            return `${bytes} bytes`;
                          }
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Date de Carga */}
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="text-xs font-bold text-gray-500 uppercase mb-1">Upload Date</div>
                    <div className="text-sm text-gray-900 font-medium">
                      {new Date(comercial.date_subida).toLocaleString('es-MX', {
                        dateStyle: 'long',
                        timeStyle: 'short'
                      })}
                    </div>
                  </div>

                  {/* Estado */}
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="text-xs font-bold text-gray-500 uppercase mb-1">Status</div>
                    <span className={`inline-block px-3 py-1.5 text-xs font-bold rounded-lg ${
                      comercial.estado_transcodificacion === 'COMPLETADO' ? 'bg-green-500 text-white' :
                      comercial.estado_transcodificacion === 'PROCESANDO' ? 'bg-yellow-500 text-white' :
                      comercial.estado_transcodificacion === 'PENDIENTE' ? 'bg-blue-500 text-white' :
                      'bg-red-500 text-white'
                    }`}>
                      {comercial.estado_transcodificacion}
                    </span>
                  </div>

                  {/* Product */}
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="text-xs font-bold text-gray-500 uppercase mb-1">Product</div>
                    <div className="text-sm text-gray-900 font-medium">
                      {comercial.pizarra?.producto || 'Not specified'}
                    </div>
                  </div>

                  {/* Metadata adicional si existe */}
                  {comercial.pizarra && (comercial.pizarra.cliente || comercial.pizarra.agencia) && (
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 mt-4">
                      <div className="text-xs font-bold text-blue-700 uppercase mb-2">Additional Metadata</div>
                      <div className="space-y-2 text-sm">
                        {comercial.pizarra.cliente && (
                          <div>
                            <span className="font-semibold text-gray-700">Client:</span>{' '}
                            <span className="text-gray-900">{comercial.pizarra.cliente}</span>
                          </div>
                        )}
                        {comercial.pizarra.agencia && (
                          <div>
                            <span className="font-semibold text-gray-700">Agency:</span>{' '}
                            <span className="text-gray-900">{comercial.pizarra.agencia}</span>
                          </div>
                        )}
                        {comercial.pizarra.version && (
                          <div>
                            <span className="font-semibold text-gray-700">Version:</span>{' '}
                            <span className="text-gray-900">{comercial.pizarra.version}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Edit Metadata Tab - Two Column Layout (60/40 split) */
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                {/* Left Column: Video Player (60% - 3 cols) */}
                <div className="md:col-span-3 space-y-4">
                  {/* Video Player - 30% bigger */}
                  <div className="bg-black rounded-lg overflow-hidden shadow-lg" style={{ aspectRatio: '16/9' }}>
                    {videoUrl ? (
                      <video 
                        controls 
                        className="w-full h-full"
                        style={{ objectFit: 'contain' }}
                        src={videoUrl}
                      >
                        Tu navegador no soporta el elemento de video.
                      </video>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-center p-4">
                        <div>
                          <p>Video no disponible</p>
                          {comercial.estado_transcodificacion === 'PROCESANDO' && (
                            <p className="text-sm mt-2">Transcodificando...</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Only 3 fields: Original Name, File Code, File Size */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="space-y-3">
                      {/* Original Name */}
                      <div>
                        <span className="font-bold text-gray-700 text-sm">Original Name:</span>{' '}
                        <span className="text-gray-900 text-sm">{comercial.nombre_original || 'N/A'}</span>
                      </div>
                      
                      {/* File Code */}
                      <div>
                        <span className="font-bold text-gray-700 text-sm">File Code:</span>{' '}
                        <code className="bg-gray-800 text-green-400 px-2 py-1 rounded text-xs font-mono">
                          {comercial.id.split('-')[0]}.mov
                        </code>
                      </div>

                      {/* File Size */}
                      {comercial.file_size && (
                        <div>
                          <span className="font-bold text-gray-700 text-sm">File Size:</span>{' '}
                          <span className="text-gray-900 text-sm font-semibold">
                            {(() => {
                              const bytes = comercial.file_size;
                              if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
                              else if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(2)} MB`;
                              else if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
                              else return `${bytes} bytes`;
                            })()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Editable Metadata Fields (40% - 2 cols) */}
                <div className="md:col-span-2 space-y-3">
                  <h3 className="text-base font-bold text-gray-800 border-b-2 border-blue-500 pb-2">Metadata Fields</h3>
                  
                  {/* Client */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Client
                    </label>
                    <input
                      type="text"
                      name="pizarra.cliente"
                      value={formData.pizarra.cliente}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="Client name"
                    />
                  </div>

                  {/* Agency */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Agency
                    </label>
                    <input
                      type="text"
                      name="pizarra.agencia"
                      value={formData.pizarra.agencia}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="Agency name"
                    />
                  </div>

                  {/* Product */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Product
                    </label>
                    <input
                      type="text"
                      name="pizarra.producto"
                      value={formData.pizarra.producto}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="Product description (not commercial name)"
                    />
                  </div>

                  {/* Version */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Version
                    </label>
                    <input
                      type="text"
                      name="pizarra.version"
                      value={formData.pizarra.version}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="e.g., 30s, 15s"
                    />
                  </div>

                  {/* Time */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Time
                    </label>
                    <input
                      type="text"
                      name="pizarra.duracion"
                      value={formData.pizarra.duracion}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="e.g., 30, 60"
                    />
                  </div>

                  {/* Format */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Format
                    </label>
                    <select
                      name="pizarra.formato"
                      value={formData.pizarra.formato}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Select format...</option>
                      <option value="Master">Master</option>
                      <option value="Generico">Generico</option>
                      <option value="Intergenerico">Intergenerico</option>
                    </select>
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Date
                    </label>
                    <input
                      type="text"
                      name="pizarra.fecha"
                      value={formData.pizarra.fecha}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="e.g., 2024-10-17"
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition font-semibold"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

