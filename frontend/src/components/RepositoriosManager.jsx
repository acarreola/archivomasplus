// frontend/src/components/RepositoriosManager.jsx
import { useState, useEffect } from 'react';
import axios from '../utils/axios';

export default function RepositoriosManager() {
  const [repositorios, setRepositorios] = useState([]);
  const [users, setUsers] = useState([]);
  const [modulos, setModulos] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingRepo, setEditingRepo] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    clave: '',
    activo: true,
    users_asignados: [],
    modulos_ids: []
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRepositorios();
    fetchUsers();
    fetchModulos();
  }, []);

  const fetchRepositorios = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/repositorios/');
      setRepositorios(response.data);
    } catch (err) {
      console.error('Error fetching repositorios:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/users/');
      setUsers(response.data);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchModulos = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/modulos/');
      setModulos(response.data);
    } catch (err) {
      console.error('Error fetching módulos:', err);
    }
  };

  const handleOpenModal = (repo = null) => {
    if (repo) {
      setEditingRepo(repo);
      setFormData({
        name: repo.name,
        clave: repo.clave || '',
        activo: repo.activo,
        users_asignados: repo.users_asignados || [],
        modulos_ids: repo.modulos_detalle?.map(m => m.id) || []
      });
    } else {
      setEditingRepo(null);
      setFormData({
        name: '',
        clave: '',
        activo: true,
        users_asignados: [],
        modulos_ids: []
      });
    }
    setShowModal(true);
    setError('');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRepo(null);
    setFormData({
      name: '',
      clave: '',
      activo: true,
      users_asignados: [],
      modulos_ids: []
    });
    setError('');
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleUsersChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => parseInt(option.value));
    setFormData(prev => ({
      ...prev,
      users_asignados: selectedOptions
    }));
  };

  const handleModuloToggle = (moduloId) => {
    setFormData(prev => ({
      ...prev,
      modulos_ids: prev.modulos_ids.includes(moduloId)
        ? prev.modulos_ids.filter(id => id !== moduloId)
        : [...prev.modulos_ids, moduloId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validar clave (3 caracteres)
    if (formData.clave && formData.clave.length !== 3) {
      setError('La clave debe tener exactamente 3 caracteres');
      return;
    }

    // Validar que al menos un módulo esté selectdo
    if (formData.modulos_ids.length === 0) {
      setError('Must select al menos un módulo para el repositorio');
      return;
    }

    try {
      if (editingRepo) {
        // Update existing repository
        await axios.patch(`http://localhost:8000/api/repositorios/${editingRepo.id}/`, formData);
      } else {
        // Create new repository
        await axios.post('http://localhost:8000/api/repositorios/', formData);
      }
      
      fetchRepositorios();
      handleCloseModal();
    } catch (err) {
      console.error('Error saving repositorio:', err);
      setError(err.response?.data?.detail || 'Error saving repository');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure to delete this repository? All associated files will be deleted.')) {
      return;
    }

    try {
      await axios.delete(`http://localhost:8000/api/repositorios/${id}/`);
      fetchRepositorios();
    } catch (err) {
      console.error('Error deleting repositorio:', err);
      alert('Error eliminar el repositorio');
    }
  };

  const toggleActivo = async (repo) => {
    try {
      await axios.patch(`http://localhost:8000/api/repositorios/${repo.id}/`, {
        activo: !repo.activo
      });
      fetchRepositorios();
    } catch (err) {
      console.error('Error toggling activo:', err);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Gestión de Repositorios</h2>
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          ➕ New Repositorio
        </button>
      </div>

      {/* Tabla de Repositorios */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100 border-b-2 border-gray-300">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-32">Folio</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-24">Clave</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-32">Estado</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Módulos</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-40">Users</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-48">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {repositorios.map(repo => (
              <tr key={repo.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{repo.name}</td>
                <td className="px-4 py-3">
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">{repo.folio}</code>
                </td>
                <td className="px-4 py-3">
                  <code className="text-sm font-bold text-blue-600">{repo.clave || '-'}</code>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActivo(repo)}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium cursor-pointer ${
                      repo.activo 
                        ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                    }`}
                  >
                    {repo.activo ? '✓ Activo' : '✗ Inactivo'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {repo.modulos_detalle && repo.modulos_detalle.length > 0 ? (
                      repo.modulos_detalle.map(modulo => (
                        <span 
                          key={modulo.id}
                          className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium"
                          title={modulo.name}
                        >
                          {modulo.tipo}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-400 italic">Sin módulos</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {repo.users_asignados?.length || 0} user(s)
                </td>
                <td className="px-4 py-3">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleOpenModal(repo)}
                      className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(repo.id)}
                      className="text-red-600 hover:text-red-800 font-medium text-sm"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {repositorios.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-xl mb-2">📁</p>
            <p>No hay repositorios creados</p>
            <button
              onClick={() => handleOpenModal()}
              className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
            >
              Create primer repositorio
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold">
                {editingRepo ? '✏️ Edit Repositorio' : '➕ New Repositorio'}
              </h3>
              <button onClick={handleCloseModal} className="text-white hover:text-gray-200 text-2xl">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Repository Name: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: KELLOGG, COCA-COLA, etc."
                />
              </div>

              {/* Clave */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Clave (3 caracteres): <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="clave"
                  value={formData.clave}
                  onChange={handleChange}
                  maxLength="3"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                  placeholder="Ej: KEL, COC, etc."
                  style={{ textTransform: 'uppercase' }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Introduce exactamente 3 caracteres para identificar este repositorio
                </p>
              </div>

              {/* Folio (solo lectura en edición) */}
              {editingRepo && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Folio (generado automáticamente):
                  </label>
                  <input
                    type="text"
                    value={editingRepo.folio}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                  />
                </div>
              )}

              {/* Activo/Inactivo */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="activo"
                  id="activo"
                  checked={formData.activo}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="activo" className="ml-2 text-sm font-medium text-gray-700">
                  Repositorio Activo
                </label>
              </div>

              {/* Módulos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Módulos: <span className="text-red-500">*</span>
                </label>
                <div className="border border-gray-300 rounded-md p-4 space-y-2 bg-gray-50">
                  {modulos
                    .filter(m => m.activo)
                    .map(modulo => (
                      <div key={modulo.id} className="flex items-start">
                        <input
                          type="checkbox"
                          id={`modulo-${modulo.id}`}
                          checked={formData.modulos_ids.includes(modulo.id)}
                          onChange={() => handleModuloToggle(modulo.id)}
                          className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor={`modulo-${modulo.id}`} className="ml-2 text-sm">
                          <span className="font-medium text-gray-900">{modulo.name}</span>
                          <span className="text-gray-500"> - {modulo.descripcion}</span>
                          {modulo.formatos_permitidos && modulo.formatos_permitidos.length > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              Formats: {modulo.formatos_permitidos.join(', ')}
                            </div>
                          )}
                        </label>
                      </div>
                    ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Select al menos un módulo. Cada módulo tiene restricciones de formato específicas.
                </p>
              </div>

              {/* Users Asignados */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Users con Acceso:
                </label>
                <select
                  multiple
                  value={formData.users_asignados}
                  onChange={handleUsersChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
                >
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name_completo || user.username} ({user.email})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Mantén presionado Cmd/Ctrl para selectr múltiples users
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
                  {error}
                </div>
              )}

              {/* Botones */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingRepo ? 'Actualizar' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
