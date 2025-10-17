import { useState, useEffect } from 'react';
import axios from '../utils/axios';

function ConfiguracionManager() {
  const [modulos, setModulos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchModulos();
  }, []);

  const fetchModulos = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:8000/api/modulos/');
      setModulos(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching módulos:', err);
      setError('Error cargar los módulos');
    } finally {
      setLoading(false);
    }
  };

  const toggleActivo = async (modulo) => {
    try {
      const updatedModulo = { ...modulo, activo: !modulo.activo };
      await axios.patch(`http://localhost:8000/api/modulos/${modulo.id}/`, {
        activo: updatedModulo.activo
      });
      
      setModulos(modulos.map(m => 
        m.id === modulo.id ? updatedModulo : m
      ));
    } catch (err) {
      console.error('Error updating módulo:', err);
      setError('Error actualizar el módulo');
    }
  };

  const getModuloIcon = (tipo) => {
    const icons = {
      storage: '💾',
      reel: '🎬',
      broadcast: '📡',
      audio: '🎵',
      images: '🖼️'
    };
    return icons[tipo] || '📦';
  };

  const getModuloColor = (tipo) => {
    const colors = {
      storage: 'bg-blue-100 text-blue-800 border-blue-300',
      reel: 'bg-purple-100 text-purple-800 border-purple-300',
      broadcast: 'bg-red-100 text-red-800 border-red-300',
      audio: 'bg-green-100 text-green-800 border-green-300',
      images: 'bg-yellow-100 text-yellow-800 border-yellow-300'
    };
    return colors[tipo] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl">Cargando módulos...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Configuración - Módulos</h2>
        <p className="text-gray-600 mt-2">
          Gestiona los módulos de almacenamiento del sistema. Cada módulo tiene restricciones específicas de formato.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modulos.map((modulo) => (
          <div 
            key={modulo.id}
            className={`border-2 rounded-lg p-6 ${getModuloColor(modulo.tipo)} ${
              !modulo.activo ? 'opacity-50' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <span className="text-4xl mr-3">{getModuloIcon(modulo.tipo)}</span>
                <div>
                  <h3 className="text-xl font-bold">{modulo.name}</h3>
                  <span className="text-sm opacity-75 capitalize">{modulo.tipo}</span>
                </div>
              </div>
              <button
                onClick={() => toggleActivo(modulo)}
                className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${
                  modulo.activo
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-gray-400 text-white hover:bg-gray-500'
                }`}
              >
                {modulo.activo ? 'Activo' : 'Inactivo'}
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm leading-relaxed">{modulo.descripcion}</p>
            </div>

            <div className="border-t pt-4 border-current border-opacity-20">
              <h4 className="text-sm font-semibold mb-2">Formats Permitidos:</h4>
              {modulo.formatos_permitidos && modulo.formatos_permitidos.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {modulo.formatos_permitidos.map((formato, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-white bg-opacity-50 rounded text-xs font-mono"
                    >
                      {formato}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm italic">Sin restricciones</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Información</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Los módulos son componentes del sistema y no se pueden crear o eliminar.</li>
          <li>• Puedes activar o desactivar módulos según las necesidades de tu organización.</li>
          <li>• Cada repositorio puede tener uno o más módulos asignados.</li>
          <li>• Los formatos permitidos se validan al momento de subir files.</li>
        </ul>
      </div>
    </div>
  );
};

export default ConfiguracionManager;
