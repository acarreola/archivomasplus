import { useState, useEffect } from 'react';
import axios from '../utils/axios';

export default function ConfiguracionManager() {
  const [modulos, setModulos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    modulos: true,
    perfiles: false,
    version: false
  });
  // System Information: releases history (latest first)
  const [releases, setReleases] = useState([
    {
      version: '1.0.0',
      releaseDate: 'October 2025',
      updates: `🎉 Initial Release\n- Repository management system\n- User and permissions management\n- Module system (Audio, Broadcast, Images, Reel, Storage)\n- Email-based authentication\n- Granular permissions per user and repository\n- Module assignment per user\n- System configuration panel`
    }
  ]);
  const [isEditingCurrent, setIsEditingCurrent] = useState(false);
  const [isCreatingRelease, setIsCreatingRelease] = useState(false);
  const todayPretty = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const [newRelease, setNewRelease] = useState({ version: '', releaseDate: todayPretty, updates: '' });

  useEffect(() => {
    fetchModulos();
  }, []);

  // Load/save releases in localStorage to survive reloads (temporary until backend persistence)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('systemReleases');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) setReleases(parsed);
      }
    } catch (e) {
      console.warn('Could not load releases from localStorage:', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('systemReleases', JSON.stringify(releases));
    } catch (e) {
      console.warn('Could not save releases to localStorage:', e);
    }
  }, [releases]);

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

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
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
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="px-6 pt-4 pb-3 flex justify-between items-center border-b border-gray-200 bg-white">
        <h2 className="text-2xl font-bold text-gray-800">⚙️ System Configuration</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto space-y-4">
          
          {/* Sección: Módulos */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <button
              onClick={() => toggleSection('modulos')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="http://www.w3.org/2000/svg" width="24px" fill="white">
                    <path d="M160-120v-80h640v80H160Zm0-640v-80h640v80H160Zm320 320q-33 0-56.5-23.5T400-520q0-33 23.5-56.5T480-600q33 0 56.5 23.5T560-520q0 33-23.5 56.5T480-440ZM240-360q-17 0-28.5-11.5T200-400q0-17 11.5-28.5T240-440q17 0 28.5 11.5T280-400q0 17-11.5 28.5T240-360Zm480 0q-17 0-28.5-11.5T680-400q0-17 11.5-28.5T720-440q17 0 28.5 11.5T760-400q0 17-11.5 28.5T720-360ZM360-600q-17 0-28.5-11.5T320-640q0-17 11.5-28.5T360-680q17 0 28.5 11.5T400-640q0 17-11.5 28.5T360-600Zm240 0q-17 0-28.5-11.5T560-640q0-17 11.5-28.5T600-680q17 0 28.5 11.5T640-640q0 17-11.5 28.5T600-600Z"/>
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-bold text-gray-900">Modules</h3>
                  <p className="text-sm text-gray-500">Manage available content modules</p>
                </div>
              </div>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                height="24px" 
                viewBox="http://www.w3.org/2000/svg" 
                width="24px" 
                fill="currentColor"
                className={`transform transition-transform ${expandedSections.modulos ? 'rotate-180' : ''}`}
              >
                <path d="M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z"/>
              </svg>
            </button>

            {expandedSections.modulos && (
              <div className="px-6 pb-6 border-t border-gray-100">
                <div className="mt-4 space-y-3">
                  {loading ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>Loading modules...</p>
                    </div>
                  ) : modulos.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>No modules configured</p>
                    </div>
                  ) : (
                    modulos.map(modulo => (
                      <div 
                        key={modulo.id}
                        className={`border rounded-lg p-4 transition-all ${
                          modulo.activo ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={`w-12 h-12 bg-gradient-to-br ${getModuloColor(modulo.tipo)} rounded-lg flex items-center justify-center text-2xl`}>
                              {getModuloIcon(modulo.tipo)}
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900">{modulo.nombre}</h4>
                              <p className="text-sm text-gray-600">{modulo.descripcion || 'No description'}</p>
                              {modulo.formatos_permitidos && modulo.formatos_permitidos.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {modulo.formatos_permitidos.map((formato, idx) => (
                                    <span key={idx} className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                      {formato}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <button
                            onClick={() => toggleModuloActivo(modulo)}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${
                              modulo.activo
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                            }`}
                          >
                            {modulo.activo ? '✓ Active' : '✗ Inactive'}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sección: Perfiles y Permisos */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <button
              onClick={() => toggleSection('perfiles')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="http://www.w3.org/2000/svg" width="24px" fill="white">
                    <path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Z"/>
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-bold text-gray-900">Profiles & Permissions</h3>
                  <p className="text-sm text-gray-500">Configure system roles and permissions</p>
                </div>
              </div>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                height="24px" 
                viewBox="http://www.w3.org/2000/svg" 
                width="24px" 
                fill="currentColor"
                className={`transform transition-transform ${expandedSections.perfiles ? 'rotate-180' : ''}`}
              >
                <path d="M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z"/>
              </svg>
            </button>

            {expandedSections.perfiles && (
              <div className="px-6 pb-6 border-t border-gray-100">
                <div className="mt-4 text-center py-12 text-gray-500">
                  <div className="text-5xl mb-4">🚧</div>
                  <h4 className="text-lg font-semibold mb-2">Under Development</h4>
                  <p className="text-sm">
                    Profile and permission management will be available soon.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Sección: Versión */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <button
              onClick={() => toggleSection('version')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="http://www.w3.org/2000/svg" width="24px" fill="white">
                    <path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Zm-40 200h80v-240h-80v240Zm40-320q17 0 28.5-11.5T520-640q0-17-11.5-28.5T480-680q-17 0-28.5 11.5T440-640q0 17 11.5 28.5T480-600Z"/>
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-bold text-gray-900">System Information</h3>
                  <p className="text-sm text-gray-500">Version and recent updates</p>
                </div>
              </div>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                height="24px" 
                viewBox="http://www.w3.org/2000/svg" 
                width="24px" 
                fill="currentColor"
                className={`transform transition-transform ${expandedSections.version ? 'rotate-180' : ''}`}
              >
                <path d="M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z"/>
              </svg>
            </button>

            {expandedSections.version && (
              <div className="px-6 pb-6 border-t border-gray-100">
                <div className="mt-4 space-y-4">
                  {/* Versión Actual */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                    {releases.length === 0 ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-2xl font-bold text-gray-900">No releases yet</h4>
                          <p className="text-sm text-gray-600">Create your first release entry</p>
                        </div>
                        <button
                          onClick={() => setIsCreatingRelease(true)}
                          className="px-4 py-2 rounded-lg font-medium transition-all text-sm bg-blue-600 text-white hover:bg-blue-700"
                        >
                          ➕ New Release
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between mb-2">
                        {isEditingCurrent ? (
                          <div className="flex items-center gap-4">
                            <input
                              type="text"
                              value={releases[0].version}
                              onChange={(e) => {
                                const v = e.target.value;
                                setReleases(prev => [{ ...prev[0], version: v }, ...prev.slice(1)]);
                              }}
                              className="text-2xl font-bold text-gray-900 bg-white border border-blue-300 rounded px-2 py-1 w-40"
                            />
                            <input
                              type="text"
                              value={releases[0].releaseDate}
                              onChange={(e) => {
                                const d = e.target.value;
                                setReleases(prev => [{ ...prev[0], releaseDate: d }, ...prev.slice(1)]);
                              }}
                              className="text-sm text-gray-600 bg-white border border-blue-300 rounded px-2 py-1"
                            />
                          </div>
                        ) : (
                          <div>
                            <h4 className="text-2xl font-bold text-gray-900">Version {releases[0].version}</h4>
                            <p className="text-sm text-gray-600">Release: {releases[0].releaseDate}</p>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setIsCreatingRelease(true)}
                            className="px-4 py-2 rounded-lg font-medium transition-all text-sm bg-gray-800 text-white hover:bg-black"
                          >
                            ➕ New Release
                          </button>
                          <button
                            onClick={() => setIsEditingCurrent(!isEditingCurrent)}
                            className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                              isEditingCurrent ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          >
                            {isEditingCurrent ? '✓ Save' : '✎ Edit'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Changelog for current */}
                  {releases.length > 0 && (
                    <div className="space-y-3">
                      <h5 className="font-semibold text-gray-900">Recent Updates:</h5>
                      <div className="border-l-4 border-blue-500 pl-4 py-2">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">v{releases[0].version}</span>
                          <span className="text-sm text-gray-500">{releases[0].releaseDate}</span>
                        </div>
                        {isEditingCurrent ? (
                          <textarea
                            value={releases[0].updates}
                            onChange={(e) => {
                              const u = e.target.value;
                              setReleases(prev => [{ ...prev[0], updates: u }, ...prev.slice(1)]);
                            }}
                            className="w-full h-48 p-2 mt-2 border border-blue-300 rounded text-sm text-gray-600 bg-white"
                            rows="6"
                          />
                        ) : (
                          <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                            {releases[0].updates.split('\n').map((line, index) => (
                              <li key={index}>{line.replace(/^- /, '')}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}

                  {/* New release form */}
                  {isCreatingRelease && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <h5 className="font-semibold text-gray-900 mb-3">Create New Release</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
                          <input
                            type="text"
                            value={newRelease.version}
                            onChange={(e) => setNewRelease(prev => ({ ...prev, version: e.target.value }))}
                            className="w-full border rounded px-2 py-1"
                            placeholder="e.g., 1.1.0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Release date</label>
                          <input
                            type="text"
                            value={newRelease.releaseDate}
                            onChange={(e) => setNewRelease(prev => ({ ...prev, releaseDate: e.target.value }))}
                            className="w-full border rounded px-2 py-1"
                            placeholder="e.g., October 2025"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Update notes</label>
                        <textarea
                          value={newRelease.updates}
                          onChange={(e) => setNewRelease(prev => ({ ...prev, updates: e.target.value }))}
                          className="w-full h-32 border rounded px-2 py-1"
                          placeholder={"- New feature A\n- Improvement B\n- Fix C"}
                        />
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (!newRelease.version.trim() || !newRelease.releaseDate.trim() || !newRelease.updates.trim()) {
                              alert('Please fill version, release date and updates.');
                              return;
                            }
                            setReleases(prev => [
                              { version: newRelease.version.trim(), releaseDate: newRelease.releaseDate.trim(), updates: newRelease.updates },
                              ...prev
                            ]);
                            setIsCreatingRelease(false);
                            setNewRelease({ version: '', releaseDate: todayPretty, updates: '' });
                          }}
                          className="px-4 py-2 rounded-lg font-medium transition-all text-sm bg-green-600 text-white hover:bg-green-700"
                        >
                          ✓ Save Release
                        </button>
                        <button
                          onClick={() => {
                            setIsCreatingRelease(false);
                            setNewRelease({ version: '', releaseDate: todayPretty, updates: '' });
                          }}
                          className="px-4 py-2 rounded-lg font-medium transition-all text-sm bg-gray-200 text-gray-800 hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Previous releases */}
                  {releases.length > 1 && (
                    <div className="space-y-3">
                      <h5 className="font-semibold text-gray-900">Previous Releases</h5>
                      {releases.slice(1).map((r, idx) => (
                        <div key={idx} className="border-l-4 border-gray-300 pl-4 py-2">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2 py-1 rounded">v{r.version}</span>
                            <span className="text-sm text-gray-500">{r.releaseDate}</span>
                          </div>
                          <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                            {r.updates.split('\n').map((line, i) => (
                              <li key={i}>{line.replace(/^- /, '')}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
