// frontend/src/components/PerfilesManager.jsx
import { useState, useEffect } from 'react';
import axios from '../utils/axios';

export default function PerfilesManager() {
  const [perfiles, setPerfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPerfiles();
  }, []);

  const fetchPerfiles = async () => {
    try {
      const response = await axios.get('/api/perfiles/');
      setPerfiles(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching perfiles:', err);
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-4 flex justify-between items-center px-6 pt-4">
        <h2 className="text-2xl font-bold text-gray-800">👥 Profiles & Permissions</h2>
        <button
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          ➕ New Profile
        </button>
      </div>

      {/* Profiles Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-full">
          <thead className="bg-gray-100 border-b-2 border-gray-300 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase" style={{width: '5%'}}>Color</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase" style={{width: '15%'}}>Name</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase" style={{width: '15%'}}>Key</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase" style={{width: '35%'}}>Description</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase" style={{width: '15%'}}>Permissions</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase" style={{width: '10%'}}>Status</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase" style={{width: '5%'}}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? (
              <tr>
                <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                  <p>Loading profiles...</p>
                </td>
              </tr>
            ) : perfiles.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                  <p className="text-xl mb-2">👥</p>
                  <p>No profiles configured</p>
                </td>
              </tr>
            ) : (
              perfiles.map(perfil => (
                <tr key={perfil.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3">
                    <div 
                      className="w-8 h-8 rounded-full border-2 border-gray-300"
                      style={{backgroundColor: perfil.color}}
                    ></div>
                  </td>
                  <td className="px-6 py-3 font-medium text-gray-900">
                    <div className="flex flex-col">
                      <span className="text-base font-bold text-indigo-700">{perfil.nombre}</span>
                      <span className="text-xs text-gray-500">ID: {perfil.id}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <code className="text-sm font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded">
                      {perfil.clave}
                    </code>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-700">
                    {perfil.descripcion || 'No description'}
                  </td>
                  <td className="px-6 py-3 text-center">
                    <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200 transition-colors">
                      View Details
                    </button>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      perfil.activo 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {perfil.activo ? '✓ Active' : '✗ Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex space-x-1 items-center justify-center">
                      {/* Edit */}
                      <div className="relative group">
                        <button
                          className="inline-flex items-center justify-center p-2 rounded-lg border border-gray-300 text-gray-600 hover:text-white hover:bg-indigo-600 hover:border-indigo-600 transition-all"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
                            <path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/>
                          </svg>
                        </button>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                          Edit
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
      <div className="mx-6 mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <h3 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
            <path d="M480-280q17 0 28.5-11.5T520-320q0-17-11.5-28.5T480-360q-17 0-28.5 11.5T440-320q0 17 11.5 28.5T480-280Zm-40-160h80v-240h-80v240Zm40 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z"/>
          </svg>
          About Profiles
        </h3>
        <ul className="text-sm text-purple-800 space-y-1 ml-6">
          <li>• Profiles define roles and permissions for users in the system.</li>
          <li>• Each user must be assigned one profile that determines their access level.</li>
          <li>• Permissions can be customized per profile for fine-grained control.</li>
          <li>• Default profiles: Admin, Operator, Client.</li>
        </ul>
      </div>
    </div>
  );
}
