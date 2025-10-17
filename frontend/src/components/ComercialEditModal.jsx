// frontend/src/components/ComercialEditModal.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function ComercialEditModal({ comercial, onClose, onSave }) {
  // Simplified: Only show preview, no edit tab
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

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
        {/* Header - Simple, no tabs */}
        <div className="bg-blue-700 text-white px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">PREVIEW</h2>
          <button 
            onClick={onClose}
            className="text-white hover:text-gray-300 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content - Preview Only */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">{/* Vista Preview - Layout: Video + Thumbnail (izquierda) | Metadata (derecha) */}
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
                      {comercial.name_original || 'N/A'}
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
        </div>
      </div>
    </div>
  );
}
