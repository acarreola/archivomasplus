// frontend/src/components/UserPermissionsModal.jsx
import { useState, useEffect } from 'react';
import axios from '../utils/axios';

export default function UserPermissionsModal({ user, onClose }) {
  const [permisos, setPermisos] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.perfil_info) {
      setPermisos({
        // Permisos de Administración
        puede_acceder_administracion: user.perfil_info.puede_acceder_administracion || false,
        puede_gestionar_repositorios: user.perfil_info.puede_gestionar_repositorios || false,
        puede_gestionar_usuarios: user.perfil_info.puede_gestionar_usuarios || false,
        puede_gestionar_configuracion: user.perfil_info.puede_gestionar_configuracion || false,
        
        // Permisos de Archivos/Comerciales
        puede_crear_directorio: user.perfil_info.puede_crear_directorio || false,
        puede_actualizar_directorio: user.perfil_info.puede_actualizar_directorio || false,
        puede_borrar_directorio: user.perfil_info.puede_borrar_directorio || false,
        puede_subir_archivo: user.perfil_info.puede_subir_archivo || false,
        puede_actualizar_archivo: user.perfil_info.puede_actualizar_archivo || false,
        puede_borrar_archivo: user.perfil_info.puede_borrar_archivo || false,
        puede_descargar: user.perfil_info.puede_descargar || false,
        puede_mover_archivos: user.perfil_info.puede_mover_archivos || false,
        puede_compartir: user.perfil_info.puede_compartir || false,
        puede_comentar: user.perfil_info.puede_comentar || false,
        puede_guardar_coleccion: user.perfil_info.puede_guardar_coleccion || false,
      });
      setLoading(false);
    }
  }, [user]);

  const handleToggle = (permiso) => {
    setPermisos(prev => ({
      ...prev,
      [permiso]: !prev[permiso]
    }));
  };

  const handleSave = async () => {
    if (!user?.perfil) {
      alert('User must have a profile assigned');
      return;
    }

    try {
      // Update profile permissions
      await axios.patch(`http://localhost:8000/api/perfiles/${user.perfil}/`, permisos);
      alert('Permissions updated successfully');
      onClose();
    } catch (err) {
      console.error('Error updating permissions:', err);
      alert('Error updating permissions: ' + (err.response?.data?.detail || err.message));
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <p>Loading permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-purple-600 text-white px-6 py-4 flex justify-between items-center sticky top-0 z-10">
          <h3 className="text-xl font-bold">
            🔒 Permissions - {user?.nombre_completo || user?.email}
          </h3>
          <button onClick={onClose} className="text-white hover:text-gray-200 text-2xl">
            ✕
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> These permissions are based on the user's profile ({user?.perfil_info?.nombre || 'None'}). 
              Changes will affect all users with this profile.
            </p>
          </div>

          {/* Administration Permissions */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">Administration</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <PermissionToggle
                label="Access Administration"
                checked={permisos.puede_acceder_administracion}
                onChange={() => handleToggle('puede_acceder_administracion')}
              />
              <PermissionToggle
                label="Manage Repositories"
                checked={permisos.puede_gestionar_repositorios}
                onChange={() => handleToggle('puede_gestionar_repositorios')}
              />
              <PermissionToggle
                label="Manage Users"
                checked={permisos.puede_gestionar_usuarios}
                onChange={() => handleToggle('puede_gestionar_usuarios')}
              />
              <PermissionToggle
                label="Manage Configuration"
                checked={permisos.puede_gestionar_configuracion}
                onChange={() => handleToggle('puede_gestionar_configuracion')}
              />
            </div>
          </div>

          {/* File/Content Permissions */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">Files & Content</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <PermissionToggle
                label="Create Directory"
                checked={permisos.puede_crear_directorio}
                onChange={() => handleToggle('puede_crear_directorio')}
              />
              <PermissionToggle
                label="Update Directory"
                checked={permisos.puede_actualizar_directorio}
                onChange={() => handleToggle('puede_actualizar_directorio')}
              />
              <PermissionToggle
                label="Delete Directory"
                checked={permisos.puede_borrar_directorio}
                onChange={() => handleToggle('puede_borrar_directorio')}
              />
              <PermissionToggle
                label="Upload Files"
                checked={permisos.puede_subir_archivo}
                onChange={() => handleToggle('puede_subir_archivo')}
              />
              <PermissionToggle
                label="Update Files"
                checked={permisos.puede_actualizar_archivo}
                onChange={() => handleToggle('puede_actualizar_archivo')}
              />
              <PermissionToggle
                label="Delete Files"
                checked={permisos.puede_borrar_archivo}
                onChange={() => handleToggle('puede_borrar_archivo')}
              />
              <PermissionToggle
                label="Download Files"
                checked={permisos.puede_descargar}
                onChange={() => handleToggle('puede_descargar')}
              />
              <PermissionToggle
                label="Move Files"
                checked={permisos.puede_mover_archivos}
                onChange={() => handleToggle('puede_mover_archivos')}
              />
              <PermissionToggle
                label="Share with Privileges"
                checked={permisos.puede_compartir}
                onChange={() => handleToggle('puede_compartir')}
              />
              <PermissionToggle
                label="Comment"
                checked={permisos.puede_comentar}
                onChange={() => handleToggle('puede_comentar')}
              />
              <PermissionToggle
                label="Save Collections"
                checked={permisos.puede_guardar_coleccion}
                onChange={() => handleToggle('puede_guardar_coleccion')}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            >
              Save Permissions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PermissionToggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center space-x-3 p-3 rounded-md hover:bg-gray-50 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
      />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}
