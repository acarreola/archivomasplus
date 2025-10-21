// frontend/src/components/UsersManager.jsx
import { useState, useEffect } from 'react';
import axios from '../utils/axios';
import UserRepositoriosModal from './UserRepositoriosModal';
import UserPermissionsModal from './UserPermissionsModal';

export default function UsersManager() {
  const [users, setUsers] = useState([]);
  const [perfiles, setPerfiles] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showPermisosModal, setShowPermisosModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedUserForPermisos, setSelectedUserForPermisos] = useState(null);
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nombre_completo: '',
    compania: '',
    perfil: null,
    is_active: true
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchPerfiles();
  }, []);

  const fetchPerfiles = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/perfiles/');
      setPerfiles(response.data);
    } catch (err) {
      console.error('Error fetching profiles:', err);
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

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        email: user.email,
        password: '',
        nombre_completo: user.nombre_completo || '',
        compania: user.compania || '',
        perfil: user.perfil || null,
        is_active: user.is_active
      });
    } else {
      setEditingUser(null);
      setFormData({
        email: '',
        password: '',
        nombre_completo: '',
        compania: '',
        perfil: null,
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
      email: '',
      password: '',
      nombre_completo: '',
      compania: '',
      perfil: null,
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

    // Validations
    if (!formData.email) {
      setError('Email is required');
      return;
    }
    
    if (!formData.nombre_completo) {
      setError('Full Name is required');
      return;
    }
    
    if (!formData.perfil) {
      setError('Profile/Role is required');
      return;
    }

    if (!editingUser && !formData.password) {
      setError('Password is required for new users');
      return;
    }

    try {
      const dataToSend = { ...formData };
      
      // If editing and password wasn't changed, remove it from payload
      if (editingUser && !dataToSend.password) {
        delete dataToSend.password;
      }

      if (editingUser) {
        // Update existing user
        await axios.patch(`http://localhost:8000/api/users/${editingUser.id}/`, dataToSend);
      } else {
        // Create new user
        await axios.post('http://localhost:8000/api/users/', dataToSend);
      }
      
      fetchUsers();
      handleCloseModal();
    } catch (err) {
      console.error('Error saving user:', err);
      setError(err.response?.data?.detail || err.response?.data?.email?.[0] || 'Error saving user');
    }
  };

  const handleDelete = async (id, email) => {
    if (email === 'admin@example.com') {
      alert('Cannot delete admin user');
      return;
    }

    if (!window.confirm(`Are you sure to delete user ${email}?`)) {
      return;
    }

    try {
      await axios.delete(`http://localhost:8000/api/users/${id}/`);
      fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      alert('Error deleting user');
    }
  };

  const toggleActivo = async (user) => {
    if (user.username === 'admin') {
      alert('Cannot deactivate admin user');
      return;
    }

    try {
      await axios.patch(`http://localhost:8000/api/users/${user.id}/`, {
        is_active: !user.is_active
      });
      fetchUsers();
    } catch (err) {
      console.error('Error toggling active status:', err);
    }
  };

  const handleOpenPermisosModal = (user) => {
    setSelectedUserForPermisos(user);
    setShowPermisosModal(true);
  };

  const handleClosePermisosModal = () => {
    setShowPermisosModal(false);
    setSelectedUserForPermisos(null);
    fetchUsers(); // Reload to update repository counter
  };

  const handleOpenPermissionsModal = (user) => {
    setSelectedUserForPermissions(user);
    setShowPermissionsModal(true);
  };

  const handleClosePermissionsModal = () => {
    setShowPermissionsModal(false);
    setSelectedUserForPermissions(null);
    fetchUsers(); // Reload
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 pt-4 pb-3 flex justify-between items-center border-b border-gray-200 bg-white">
        <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="white">
            <path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/>
          </svg>
          <span>New User</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="flex-1 overflow-auto bg-white">
        <table className="w-full min-w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-gray-100 border-b-2 border-gray-300">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase" style={{width: '18%'}}>Email</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase" style={{width: '18%'}}>Name</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase" style={{width: '14%'}}>Company</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase" style={{width: '12%'}}>Type</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase" style={{width: '10%'}}>Status</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase" style={{width: '28%'}}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900" style={{width: '18%'}}>
                  {user.email}
                  {user.is_superuser && (
                    <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">Admin</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700" style={{width: '18%'}}>{user.nombre_completo || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600" style={{width: '14%'}}>{user.compania || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-700" style={{width: '12%'}}>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    user.tipo === 'administrador' ? 'bg-purple-100 text-purple-800' :
                    user.tipo === 'operador' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {user.tipo === 'administrador' ? 'Administrator' :
                     user.tipo === 'operador' ? 'Operator' :
                     user.tipo === 'cliente' ? 'Client' :
                     user.tipo}
                  </span>
                </td>
                <td className="px-4 py-3" style={{width: '10%'}}>
                  <button
                    onClick={() => toggleActivo(user)}
                    disabled={user.is_superuser || user.email === 'admin@example.com'}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      user.is_active 
                        ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                    } ${(user.is_superuser || user.email === 'admin@example.com') ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                  >
                    {user.is_active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-4 py-3" style={{width: '28%'}}>
                  <div className="flex space-x-1 items-center justify-center flex-wrap gap-1">
                    {/* Edit Button */}
                    <div className="relative group">
                      <button
                        onClick={() => handleOpenModal(user)}
                        className="inline-flex items-center justify-center p-2 text-blue-700 hover:text-white hover:bg-blue-700 rounded-lg border border-blue-400 transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/></svg>
                      </button>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                        Edit
                      </div>
                    </div>

                    {/* Repositories Button */}
                    <div className="relative group">
                      <button
                        onClick={() => handleOpenPermisosModal(user)}
                        className="inline-flex items-center justify-center p-2 text-purple-600 hover:text-white hover:bg-purple-600 rounded-lg border border-purple-300 transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M480-80q-139-35-229.5-159.5T160-516v-244l320-120 320 120v244q0 152-90.5 276.5T480-80Zm0-84q104-33 172-132t68-220v-189l-240-90-240 90v189q0 121 68 220t172 132Zm0-316Z"/></svg>
                        {user.permisos_repositorios?.length > 0 && (
                          <span className="absolute -top-1 -right-1 text-xs bg-purple-600 text-white px-1.5 py-0.5 rounded-full">
                            {user.permisos_repositorios.length}
                          </span>
                        )}
                      </button>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                        Repositories
                      </div>
                    </div>

                    {/* Permissions Button */}
                    <div className="relative group">
                      <button
                        onClick={() => handleOpenPermissionsModal(user)}
                        className="inline-flex items-center justify-center p-2 text-orange-600 hover:text-white hover:bg-orange-600 rounded-lg border border-orange-300 transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M240-80q-33 0-56.5-23.5T160-160v-400q0-33 23.5-56.5T240-640h40v-80q0-83 58.5-141.5T480-920q83 0 141.5 58.5T680-720v80h40q33 0 56.5 23.5T800-560v400q0 33-23.5 56.5T720-80H240Zm0-80h480v-400H240v400Zm240-120q33 0 56.5-23.5T560-360q0-33-23.5-56.5T480-440q-33 0-56.5 23.5T400-360q0 33 23.5 56.5T480-280ZM360-640h240v-80q0-50-35-85t-85-35q-50 0-85 35t-35 85v80ZM240-160v-400 400Z"/></svg>
                      </button>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                        Permissions
                      </div>
                    </div>

                    {/* Delete Button */}
                    {!user.is_superuser && user.email !== 'admin@example.com' && (
                      <div className="relative group">
                        <button
                          onClick={() => handleDelete(user.id, user.email)}
                          className="inline-flex items-center justify-center p-2 text-red-600 hover:text-white hover:bg-red-600 rounded-lg border border-red-300 transition-all"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>
                        </button>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                          Delete
                        </div>
                      </div>
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
            <p>No users registered</p>
          </div>
        )}
      </div>

      {/* Modal Create/Edit User */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2">
                {editingUser ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="white">
                      <path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/>
                    </svg>
                    <span>Edit User</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="white">
                      <path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/>
                    </svg>
                    <span>New User</span>
                  </>
                )}
              </h3>
              <button onClick={handleCloseModal} className="text-white hover:text-gray-200 text-2xl">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Block: User Information */}
              <fieldset className="border border-gray-200 rounded-md p-4">
                <legend className="px-2 text-sm font-semibold text-gray-700">User Information</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      * Full Name:
                    </label>
                    <input
                      type="text"
                      name="nombre_completo"
                      value={formData.nombre_completo}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="John Doe"
                    />
                  </div>

                  {/* Company */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company:
                    </label>
                    <input
                      type="text"
                      name="compania"
                      value={formData.compania}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Agency XYZ"
                    />
                  </div>

                  {/* Email */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      * Email (Login):
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      disabled={editingUser?.email === 'admin@example.com'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      placeholder="user@example.com"
                    />
                  </div>

                  {/* Password */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {!editingUser && <span>* Password:</span>}
                      {editingUser && <span>Password:</span>}
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required={!editingUser}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={editingUser ? "Leave blank to keep current password" : "Secure password"}
                    />
                    {editingUser && (
                      <p className="text-xs text-gray-500 mt-1">Leave blank to keep current password</p>
                    )}
                  </div>
                </div>
              </fieldset>

              {/* Block: Access & Permissions */}
              <fieldset className="border border-gray-200 rounded-md p-4">
                <legend className="px-2 text-sm font-semibold text-gray-700">Access & Permissions</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Profile/Role */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      * Profile:
                    </label>
                    <select
                      name="perfil"
                      value={formData.perfil || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, perfil: e.target.value ? parseInt(e.target.value) : null }))}
                      disabled={editingUser?.email === 'admin@example.com'}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    >
                      <option value="">Select profile...</option>
                      {perfiles.map(perfil => (
                        <option key={perfil.id} value={perfil.id}>
                          {perfil.nombre}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Determines system permissions</p>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      * Status:
                    </label>
                    <select
                      name="is_active"
                      value={formData.is_active ? 'active' : 'inactive'}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.value === 'active' }))}
                      disabled={editingUser?.email === 'admin@example.com'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </fieldset>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
                  {error}
                </div>
              )}

              {/* Buttons */}
              <div className="flex justify-end space-x-3">
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
                  Save
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

      {/* Modal de Permisos del Usuario */}
      {showPermissionsModal && selectedUserForPermissions && (
        <UserPermissionsModal
          user={selectedUserForPermissions}
          onClose={handleClosePermissionsModal}
        />
      )}
    </div>
  );
}
