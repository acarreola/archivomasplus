// frontend/src/components/RepoUsuariosModal.jsx
import { useState, useEffect } from 'react';
import axios from '../utils/axios';

export default function RepoUsuariosModal({ repositorio, onClose, onSave }) {
  const [users, setUsers] = useState([]);
  const [permisos, setPermisos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [repositorio.id]);

  const fetchData = async () => {
    try {
      // Obtener todos los usuarios
      const usersResponse = await axios.get('/api/users/');
      setUsers(usersResponse.data);

      // Obtener permisos del repositorio
      const permisosResponse = await axios.get(`/api/repositorio-permisos/?repositorio=${repositorio.id}`);
      setPermisos(permisosResponse.data);
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setLoading(false);
    }
  };

  const getPermisosForUser = (userId) => permisos.find(p => p.usuario === userId);

  const toggleUser = async (user) => {
    const permisoExistente = getPermisosForUser(user.id);
    
    try {
      if (permisoExistente) {
        // Delete permiso
        await axios.delete(`/api/repositorio-permisos/${permisoExistente.id}/`);
      } else {
        // Create permiso nuevo (por defecto: solo ver)
        await axios.post('/api/repositorio-permisos/', {
          usuario: user.id,
          repositorio: repositorio.id,
          puede_ver: true,
          puede_editar: false,
          puede_borrar: false,
          modulos_permitidos: (repositorio.modulos || []).length ? repositorio.modulos : []
        });
      }
      fetchData(); // Recargar permisos
    } catch (err) {
      console.error('Error toggling user:', err);
    }
  };

  const togglePermiso = async (permisoId, campo, valorActual) => {
    try {
      await axios.patch(`/api/repositorio-permisos/${permisoId}/`, {
        [campo]: !valorActual
      });
      fetchData(); // Recargar permisos
    } catch (err) {
      console.error('Error toggling permiso:', err);
    }
  };

  const toggleModulo = async (permiso, moduloId) => {
    const actuales = permiso.modulos_permitidos || [];
    const existe = actuales.includes(moduloId);
    const nuevos = existe ? actuales.filter(id => id !== moduloId) : [...actuales, moduloId];
    try {
      await axios.patch(`/api/repositorio-permisos/${permiso.id}/`, {
        modulos_permitidos: nuevos
      });
      fetchData();
    } catch (err) {
      console.error('Error toggling módulo:', err);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-purple-600 text-white px-6 py-4 flex justify-between items-center">
          <h3 className="text-xl font-bold">
            👥 Assign Users - {repositorio.nombre || repositorio.name}
          </h3>
          <button onClick={onClose} className="text-white hover:text-gray-200 text-2xl">
            ✕
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            Select the users who will have access to this repository and configure their permissions.
          </p>

          <div className="space-y-3">
            {users.map(user => {
              const permiso = getPermisosForUser(user.id);
              const tieneAcceso = !!permiso;

              return (
                <div
                  key={user.id}
                  className={`border rounded-lg p-4 transition-all ${
                    tieneAcceso ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      {/* Checkbox para seleccionar/deseleccionar usuario */}
                      <input
                        type="checkbox"
                        checked={tieneAcceso}
                        onChange={() => toggleUser(user)}
                        className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      <div>
                        <h4 className="font-bold text-gray-900">
                          {user.nombre_completo || user.username || user.email}
                        </h4>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <span>{user.email}</span>
                          {user.perfil_info && (
                            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-medium">
                              {user.perfil_info.nombre}
                            </span>
                          )}
                          {user.compania && (
                            <span className="text-gray-500">• {user.compania}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {!tieneAcceso && (
                      <span className="text-xs text-gray-500 italic">No access</span>
                    )}
                  </div>

                  {/* Permisos (solo si tiene acceso) */}
                  {tieneAcceso && permiso && (
                    <div className="ml-8 space-y-3 pt-2 border-t border-green-200">
                      <div className="flex items-center space-x-6">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={permiso.puede_ver}
                            onChange={() => togglePermiso(permiso.id, 'puede_ver', permiso.puede_ver)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-gray-700">👁️ View</span>
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
                          <span className="text-sm font-medium text-gray-700">🗑️ Delete</span>
                        </label>
                      </div>

                      {/* Módulos permitidos */}
                      <div className="flex flex-wrap items-center gap-4">
                        {(repositorio.modulos_detalle || []).map(m => {
                          const activos = permiso.modulos_permitidos || [];
                          const checked = activos.includes(m.id);
                          const labelMap = {
                            storage: 'Storage',
                            reel: 'H264',
                            broadcast: 'Broadcast',
                            audio: 'Audio',
                            images: 'Gráficos'
                          };
                          return (
                            <label key={m.id} className={`inline-flex items-center px-2 py-1 rounded border ${checked ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-300'} cursor-pointer`}>
                              <input
                                type="checkbox"
                                className="mr-2"
                                checked={checked}
                                onChange={() => toggleModulo(permiso, m.id)}
                              />
                              <span className="text-sm text-gray-700">{labelMap[m.tipo] || m.nombre}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {users.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>No users available</p>
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
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
