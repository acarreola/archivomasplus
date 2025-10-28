// frontend/src/components/SystemInfoManager.jsx
import { useState, useEffect } from 'react';
import axios from '../utils/axios';

export default function SystemInfoManager() {
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingReleaseId, setEditingReleaseId] = useState(null);
  const [isCreatingRelease, setIsCreatingRelease] = useState(false);
  const todayPretty = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const [newRelease, setNewRelease] = useState({ version: '', release_date: todayPretty, updates: '', is_current: false });
  const [editingData, setEditingData] = useState({});

  useEffect(() => {
    fetchReleases();
  }, []);

  const fetchReleases = async () => {
    try {
      const response = await axios.get('/api/system-info/');
      setReleases(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching releases:', err);
      setLoading(false);
    }
  };

  const handleSaveEdit = async (releaseId) => {
    if (!editingData[releaseId]) return;
    try {
      await axios.patch(`/api/system-info/${releaseId}/`, editingData[releaseId]);
      setEditingReleaseId(null);
      setEditingData({});
      fetchReleases();
    } catch (err) {
      console.error('Error updating release:', err);
      alert('Error updating release');
    }
  };

  const handleDeleteRelease = async (releaseId) => {
    if (!window.confirm('Are you sure you want to delete this version?')) return;
    try {
      await axios.delete(`/api/system-info/${releaseId}/`);
      fetchReleases();
    } catch (err) {
      console.error('Error deleting release:', err);
      alert('Error deleting release: ' + (err.response?.data?.detail || err.message));
    }
  };

  const startEditing = (release) => {
    setEditingReleaseId(release.id);
    setEditingData({
      [release.id]: {
        version: release.version,
        release_date: release.release_date,
        updates: release.updates,
        is_current: release.is_current
      }
    });
  };

  const cancelEditing = () => {
    setEditingReleaseId(null);
    setEditingData({});
  };

  const handleCreateRelease = async () => {
    if (!newRelease.version.trim() || !newRelease.release_date.trim() || !newRelease.updates.trim()) {
      alert('Please fill version, release date and updates.');
      return;
    }
    try {
      await axios.post('/api/system-info/', {
        version: newRelease.version.trim(),
        release_date: newRelease.release_date.trim(),
        updates: newRelease.updates,
        is_current: newRelease.is_current
      });
      setIsCreatingRelease(false);
      setNewRelease({ version: '', release_date: todayPretty, updates: '', is_current: false });
      fetchReleases();
    } catch (err) {
      console.error('Error creating release:', err);
      alert('Error creating release: ' + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header - Estilo consistente con otros componentes del admin */}
      <div className="mb-4 flex justify-between items-center px-6 pt-4">
        <h2 className="text-2xl font-bold text-gray-800">System Information</h2>
        <button
          onClick={() => setIsCreatingRelease(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="white">
            <path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/>
          </svg>
          <span>New Version</span>
        </button>
      </div>

      {/* Content - Estilo de tabla consistente */}
      <div className="flex-1 overflow-auto px-6">
        {loading ? (
          <div className="text-center py-12 text-gray-500">
            <p>Loading system information...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* New release form */}
            {isCreatingRelease && (
              <div className="bg-white rounded-lg border border-gray-300 shadow-sm overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900">Create New Version</h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Version</label>
                      <input
                        type="text"
                        value={newRelease.version}
                        onChange={(e) => setNewRelease(prev => ({ ...prev, version: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., 3.2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Release Date</label>
                      <input
                        type="text"
                        value={newRelease.release_date}
                        onChange={(e) => setNewRelease(prev => ({ ...prev, release_date: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., October 2025"
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Update Notes</label>
                    <textarea
                      value={newRelease.updates}
                      onChange={(e) => setNewRelease(prev => ({ ...prev, updates: e.target.value }))}
                      className="w-full h-32 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="- New feature A&#10;- Improvement B&#10;- Bug fix C"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newRelease.is_current}
                        onChange={(e) => setNewRelease(prev => ({ ...prev, is_current: e.target.checked }))}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Mark as current version</span>
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleCreateRelease}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                    >
                      Save Version
                    </button>
                    <button
                      onClick={() => {
                        setIsCreatingRelease(false);
                        setNewRelease({ version: '', release_date: todayPretty, updates: '', is_current: false });
                      }}
                      className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Empty state */}
            {releases.length === 0 && !isCreatingRelease ? (
              <div className="bg-white rounded-lg border border-gray-300 p-12 text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Versions Registered</h3>
                <p className="text-gray-500 mb-6">Create your first version to start tracking system updates</p>
                <button
                  onClick={() => setIsCreatingRelease(true)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="white">
                    <path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/>
                  </svg>
                  <span>New Version</span>
                </button>
              </div>
            ) : (
              /* Versions table */
              <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b-2 border-gray-300">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Version</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Release Date</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Updates</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {releases.map((release) => {
                      const isEditing = editingReleaseId === release.id;
                      const isCurrentVersion = release.is_current;
                      
                      return (
                        <tr key={release.id} className={isCurrentVersion ? 'bg-green-50' : 'bg-white'}>
                          {/* Version */}
                          <td className="px-6 py-4">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editingData[release.id]?.version || ''}
                                onChange={(e) => setEditingData(prev => ({
                                  ...prev,
                                  [release.id]: { ...prev[release.id], version: e.target.value }
                                }))}
                                className="w-32 border border-gray-300 rounded-md px-2 py-1 text-sm"
                              />
                            ) : (
                              <span className="font-bold text-gray-900">v{release.version}</span>
                            )}
                          </td>
                          
                          {/* Release Date */}
                          <td className="px-6 py-4">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editingData[release.id]?.release_date || ''}
                                onChange={(e) => setEditingData(prev => ({
                                  ...prev,
                                  [release.id]: { ...prev[release.id], release_date: e.target.value }
                                }))}
                                className="w-48 border border-gray-300 rounded-md px-2 py-1 text-sm"
                              />
                            ) : (
                              <span className="text-gray-700 text-sm">{release.release_date}</span>
                            )}
                          </td>
                          
                          {/* Status */}
                          <td className="px-6 py-4">
                            {isEditing ? (
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editingData[release.id]?.is_current || false}
                                  onChange={(e) => setEditingData(prev => ({
                                    ...prev,
                                    [release.id]: { ...prev[release.id], is_current: e.target.checked }
                                  }))}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                                />
                                <span className="text-xs text-gray-700">Current</span>
                              </label>
                            ) : (
                              <>
                                {isCurrentVersion ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-600 text-white">
                                    Current
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                                    Previous
                                  </span>
                                )}
                              </>
                            )}
                          </td>
                          
                          {/* Updates */}
                          <td className="px-6 py-4">
                            {isEditing ? (
                              <textarea
                                value={editingData[release.id]?.updates || ''}
                                onChange={(e) => setEditingData(prev => ({
                                  ...prev,
                                  [release.id]: { ...prev[release.id], updates: e.target.value }
                                }))}
                                className="w-full h-24 border border-gray-300 rounded-md px-2 py-1 text-sm resize-none"
                                rows="3"
                              />
                            ) : (
                              <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                                {release.updates.split('\n').filter(line => line.trim()).slice(0, 3).map((line, i) => (
                                  <li key={i}>{line.replace(/^- /, '').trim()}</li>
                                ))}
                                {release.updates.split('\n').filter(line => line.trim()).length > 3 && (
                                  <li className="text-gray-500 italic">+{release.updates.split('\n').filter(line => line.trim()).length - 3} more...</li>
                                )}
                              </ul>
                            )}
                          </td>
                          
                          {/* Actions */}
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={() => handleSaveEdit(release.id)}
                                    className="bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700 transition-colors text-sm"
                                    title="Save changes"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={cancelEditing}
                                    className="bg-gray-200 text-gray-800 px-3 py-1.5 rounded-md hover:bg-gray-300 transition-colors text-sm"
                                    title="Cancel editing"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => startEditing(release)}
                                    className="bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors text-sm"
                                    title="Edit version"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteRelease(release.id)}
                                    className="bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-700 transition-colors text-sm"
                                    title="Delete version"
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
