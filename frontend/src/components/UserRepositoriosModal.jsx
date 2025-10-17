// frontend/src/components/UserRepositoriosModal.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function UserRepositoriosModal({ user, onClose, onSave }) {
  const [repositorios, setRepositorios] = useState([]);
  const [permisos, setPermisos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [user.id]);

  const fetchData = async () => {
    try {
      // Obtener todos los repositorios
      const reposResponse = await axios.get('http://localhost:8000/api/repositorios/');
      setRepositorios(reposResponse.data);

      // Obtener permisos del user
      const permisosResponse = await axios.get(`http://localhost:8000/api/repositorio-permisos/?user=${user.id}`);
      setPermisos(permisosResponse.data);
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setLoading(false);
    }
  };

  const getPermisosForRepo = (repoId) => {
    return permisos.find(p => p.repositorio === repoId);
  };

  const toggleRepositorio = async (repo) => {
    const permisoExistente = getPermisosForRepo(repo.id);
    
    try {
      if (permisoExistente) {
        // Delete permiso
        await axios.delete(`http://localhost:8000/api/repositorio-permisos/${permisoExistente.id}/`);
      } else {
        // Create permiso nuevo (por defecto: solo ver)
        await axios.post('http://localhost:8000/api/repositorio-permisos/', {
          user: user.id,
          repositorio: repo.id,
          puede_ver: true,
          puede_editar: false,
          puede_borrar: false
        });
      }
      fetchData(); // Recargar permisos
    } catch (err) {
      console.error('Error toggling repositorio:', err);
    }
  };

  const togglePermiso = async (permisoId, campo, valorActual) => {
    try {
      await axios.patch(`http://localhost:8000/api/repositorio-permisos/${permisoId}/`, {
        [campo]: !valorActual
      });
      fetchData(); // Recargar permisos
    } catch (err) {
      console.error('Error toggling permiso:', err);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-purple-600 text-white px-6 py-4 flex justify-between items-center">
          <h3 className="text-xl font-bold">
            🔐 Repositorios y Permisos - {user.name_completo || user.username}
          </h3>
          <button onClick={onClose} className="text-white hover:text-gray-200 text-2xl">
            ✕
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            Select los repositorios a los que este user tendrá acceso y configura sus permisos.
          </p>

          <div className="space-y-3">
            {repositorios.map(repo => {
              const permiso = getPermisosForRepo(repo.id);
              const tieneAcceso = !!permiso;

              return (
                <div
                  key={repo.id}
                  className={`border rounded-lg p-4 transition-all ${
                    tieneAcceso ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      {/* Checkbox para selectr/deselectr repositorio */}
                      <input
                        type="checkbox"
                        checked={tieneAcceso}
                        onChange={() => toggleRepositorio(repo)}
                        className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      <div>
                        <h4 className="font-bold text-gray-900">{repo.name}</h4>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <code className="bg-gray-200 px-2 py-0.5 rounded font-mono text-xs">
                            {repo.folio}
                          </code>
                          {repo.clave && (
                            <span className="text-blue-600 font-bold">• {repo.clave}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {!tieneAcceso && (
                      <span className="text-xs text-gray-500 italic">Sin acceso</span>
                    )}
                  </div>

                  {/* Permisos (solo si tiene acceso) */}
                  {tieneAcceso && permiso && (
                    <div className="ml-8 flex items-center space-x-6 pt-2 border-t border-green-200">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={permiso.puede_ver}
                          onChange={() => togglePermiso(permiso.id, 'puede_ver', permiso.puede_ver)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">👁️ Ver</span>
                      </label>

                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={permiso.puede_editar}
                          onChange={() => togglePermiso(permiso.id, 'puede_editar', permiso.puede_editar)}
                          className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                        />
                        <span className="text-sm font-medium text-gray-700">✏️ Edit</span>
                      </label>

                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={permiso.puede_borrar}
                          onChange={() => togglePermiso(permiso.id, 'puede_borrar', permiso.puede_borrar)}
                          className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                        />
                        <span className="text-sm font-medium text-gray-700">🗑️ Borrar</span>
                      </label>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {repositorios.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>No hay repositorios disponibles</p>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => {
                if (onSave) onSave();
                onClose();
              }}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
