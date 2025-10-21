// frontend/src/components/ModulosManager.jsx
import { useState, useEffect } from 'react';
import axios from '../utils/axios';

export default function ModulosManager() {
  const [modulos, setModulos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchModulos();
  }, []);

  const fetchModulos = async () => {
    try {
      const response = await axios.get('/api/modulos/');
      setModulos(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching modulos:', err);
      setLoading(false);
    }
  };

  const toggleModuloActivo = async (modulo) => {
    try {
      await axios.patch(`/api/modulos/${modulo.id}/`, {
        activo: !modulo.activo
      });
      fetchModulos();
    } catch (err) {
      console.error('Error updating module:', err);
      alert('Error updating module status');
    }
  };

  const getModuloIcon = (tipo) => {
    const icons = {
      audio: '🎵',
      broadcast: '📺',
      images: '🖼️',
      reel: '🎬',
      storage: '💾'
    };
    return icons[tipo] || '📁';
  };

  const getModuloColor = (tipo) => {
    const colors = {
      audio: 'from-purple-500 to-purple-600',
      broadcast: 'from-blue-500 to-blue-600',
      images: 'from-pink-500 to-pink-600',
      reel: 'from-green-500 to-green-600',
      storage: 'from-gray-500 to-gray-600'
    };
    return colors[tipo] || 'from-gray-500 to-gray-600';
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-4 flex justify-between items-center px-6 pt-4">
        <h2 className="text-2xl font-bold text-gray-800">📦 Modules</h2>
      </div>

      {/* Modules Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-full">
          <thead className="bg-gray-100 border-b-2 border-gray-300 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase" style={{width: '8%'}}>Icon</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase" style={{width: '15%'}}>Name</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase" style={{width: '12%'}}>Type</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase" style={{width: '25%'}}>Description</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase" style={{width: '20%'}}>Allowed Formats</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase" style={{width: '10%'}}>Status</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase" style={{width: '10%'}}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? (
              <tr>
                <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                  <p>Loading modules...</p>
                </td>
              </tr>
            ) : modulos.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                  <p className="text-xl mb-2">📦</p>
                  <p>No modules configured</p>
                </td>
              </tr>
            ) : (
              modulos.map(modulo => (
                <tr key={modulo.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 text-center">
                    <span className="text-3xl">{getModuloIcon(modulo.tipo)}</span>
                  </td>
                  <td className="px-6 py-3 font-medium text-gray-900">
                    <div className="flex flex-col">
                      <span className="text-base font-bold text-indigo-700">{modulo.nombre}</span>
                      <span className="text-xs text-gray-500">ID: {modulo.id}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <code className="text-sm font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded capitalize">
                      {modulo.tipo}
                    </code>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-700">
                    {modulo.descripcion || 'No description'}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex flex-wrap gap-1">
                      {modulo.formatos_permitidos && modulo.formatos_permitidos.length > 0 ? (
                        modulo.formatos_permitidos.map((formato, idx) => (
                          <span 
                            key={idx}
                            className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium"
                          >
                            {formato}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-400 italic">All formats</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <button
                      onClick={() => toggleModuloActivo(modulo)}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                        modulo.activo 
                          ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                    >
                      {modulo.activo ? '✓ Active' : '✗ Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex space-x-1 items-center justify-center">
                      {/* Toggle Status */}
                      <div className="relative group">
                        <button
                          onClick={() => toggleModuloActivo(modulo)}
                          className={`inline-flex items-center justify-center p-2 rounded-lg border transition-all ${
                            modulo.activo
                              ? 'text-red-600 hover:text-white hover:bg-red-600 border-red-300'
                              : 'text-green-600 hover:text-white hover:bg-green-600 border-green-300'
                          }`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
                            <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
                          </svg>
                        </button>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                          {modulo.activo ? 'Deactivate' : 'Activate'}
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Info Box */}
      <div className="mx-6 mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
            <path d="M480-280q17 0 28.5-11.5T520-320q0-17-11.5-28.5T480-360q-17 0-28.5 11.5T440-320q0 17 11.5 28.5T480-280Zm-40-160h80v-240h-80v240Zm40 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z"/>
          </svg>
          System Information
        </h3>
        <ul className="text-sm text-blue-800 space-y-1 ml-6">
          <li>• Modules are system components and cannot be created or deleted.</li>
          <li>• You can activate or deactivate modules based on your organization's needs.</li>
          <li>• Each repository can have one or more modules assigned.</li>
          <li>• Allowed formats are validated when uploading files.</li>
        </ul>
      </div>
    </div>
  );
}
