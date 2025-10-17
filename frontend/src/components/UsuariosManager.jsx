// frontend/src/components/UsersManager.jsx
import { useState, useEffect } from 'react';
import axios from '../utils/axios';
import UserRepositoriosModal from './UserRepositoriosModal';

export default function UsersManager() {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showPermisosModal, setShowPermisosModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedUserForPermisos, setSelectedUserForPermisos] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name_completo: '',
    compania: '',
    email: '',
    is_active: true
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/users/');
      setUsers(response.data);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        password: '',
        name_completo: user.name_completo || '',
        compania: user.compania || '',
        email: user.email,
        is_active: user.is_active
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: '',
        password: '',
        name_completo: '',
        compania: '',
        email: '',
        is_active: true
      });
    }
    setShowModal(true);
    setError('');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      name_completo: '',
      compania: '',
      email: '',
      is_active: true
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (!editingUser && !formData.password) {
      setError('La password es requerida para nuevos users');
      return;
    }

    try {
      const dataToSend = { ...formData };
      
      // Si estamos editando y no se cambió la password, eliminarla del payload
      if (editingUser && !dataToSend.password) {
        delete dataToSend.password;
      }

      if (editingUser) {
        // Actualizar user existente
        await axios.patch(`http://localhost:8000/api/users/${editingUser.id}/`, dataToSend);
      } else {
        // Create nuevo user
        await axios.post('http://localhost:8000/api/users/', dataToSend);
      }
      
      fetchUsers();
      handleCloseModal();
    } catch (err) {
      console.error('Error saving user:', err);
      setError(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Error guardar el user');
    }
  };

  const handleDelete = async (id, username) => {
    if (username === 'admin') {
      alert('No se puede eliminar el user administrador');
      return;
    }

    if (!window.confirm(`Are you sure de eliminar el user "${username}"?`)) {
      return;
    }

    try {
      await axios.delete(`http://localhost:8000/api/users/${id}/`);
      fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      alert('Error eliminar el user');
    }
  };

  const toggleActivo = async (user) => {
    if (user.username === 'admin') {
      alert('No se puede desactivar el user administrador');
      return;
    }

    try {
      await axios.patch(`http://localhost:8000/api/users/${user.id}/`, {
        is_active: !user.is_active
      });
      fetchUsers();
    } catch (err) {
      console.error('Error toggling activo:', err);
    }
  };

  const handleOpenPermisosModal = (user) => {
    setSelectedUserForPermisos(user);
    setShowPermisosModal(true);
  };

  const handleClosePermisosModal = () => {
    setShowPermisosModal(false);
    setSelectedUserForPermisos(null);
    fetchUsers(); // Recargar para actualizar el contador de repositorios
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Gestión de Users</h2>
        <button
          onClick={() => handleOpenModal()}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
        >
          ➕ New User
        </button>
      </div>

      {/* Tabla de Users */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100 border-b-2 border-gray-300">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">User</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Compañía</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Correo</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-32">Status</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-48">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {user.username}
                  {user.username === 'admin' && (
                    <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">Admin</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{user.name_completo || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{user.compania || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActivo(user)}
                    disabled={user.username === 'admin'}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      user.is_active 
                        ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                    } ${user.username === 'admin' ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                  >
                    {user.is_active ? '✓ Activo' : '✗ Inactivo'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleOpenModal(user)}
                      className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                      title="Edit user"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleOpenPermisosModal(user)}
                      className="text-purple-600 hover:text-purple-800 font-medium text-sm"
                      title="Gestionar repositorios y permisos"
                    >
                      🔐 Repositorios
                      {user.permisos_repositorios?.length > 0 && (
                        <span className="ml-1 text-xs bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-full">
                          {user.permisos_repositorios.length}
                        </span>
                      )}
                    </button>
                    {user.username !== 'admin' && (
                      <button
                        onClick={() => handleDelete(user.id, user.username)}
                        className="text-red-600 hover:text-red-800 font-medium text-sm"
                        title="Delete user"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-xl mb-2">👥</p>
            <p>No hay users registrados</p>
          </div>
        )}
      </div>

      {/* Modal Create/Edit User */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-green-600 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold">
                {editingUser ? '✏️ Edit User' : '➕ New User'}
              </h3>
              <button onClick={handleCloseModal} className="text-white hover:text-gray-200 text-2xl">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* User */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  disabled={editingUser?.username === 'admin'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                  placeholder="user123"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password: {!editingUser && <span className="text-red-500">*</span>}
                  {editingUser && <span className="text-xs text-gray-500">(dejar vacío para no cambiar)</span>}
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required={!editingUser}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder={editingUser ? "••••••••" : "Password segura"}
                />
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name_completo"
                  value={formData.name_completo}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Juan Pérez López"
                />
              </div>

              {/* Compañía */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Compañía:
                </label>
                <input
                  type="text"
                  name="compania"
                  value={formData.compania}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Agency XYZ"
                />
              </div>

              {/* Correo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Correo: <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="user@ejemplo.com"
                />
              </div>

              {/* Status */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="is_active"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  disabled={editingUser?.username === 'admin'}
                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 disabled:opacity-50"
                />
                <label htmlFor="is_active" className="ml-2 text-sm font-medium text-gray-700">
                  User Activo
                </label>
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
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  {editingUser ? 'Actualizar' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Permisos de Repositorios */}
      {showPermisosModal && selectedUserForPermisos && (
        <UserRepositoriosModal
          user={selectedUserForPermisos}
          onClose={handleClosePermisosModal}
          onSave={fetchUsers}
        />
      )}
    </div>
  );
}
