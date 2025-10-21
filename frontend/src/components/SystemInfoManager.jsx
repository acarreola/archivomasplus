// frontend/src/components/SystemInfoManager.jsx
import { useState, useEffect } from 'react';
import axios from '../utils/axios';

export default function SystemInfoManager() {
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditingCurrent, setIsEditingCurrent] = useState(false);
  const [isCreatingRelease, setIsCreatingRelease] = useState(false);
  const todayPretty = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const [newRelease, setNewRelease] = useState({ version: '', release_date: todayPretty, updates: '', is_current: false });

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

  const handleSaveEdit = async () => {
    if (!releases[0]) return;
    try {
      await axios.patch(`/api/system-info/${releases[0].id}/`, {
        version: releases[0].version,
        release_date: releases[0].release_date,
        updates: releases[0].updates
      });
      setIsEditingCurrent(false);
      fetchReleases();
    } catch (err) {
      console.error('Error updating release:', err);
      alert('Error updating release');
    }
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
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="px-6 pt-4 pb-3 flex justify-between items-center border-b border-gray-200 bg-white">
        <h2 className="text-2xl font-bold text-gray-800">ℹ️ System Information</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto space-y-4">
          
          {loading ? (
            <div className="text-center py-12 text-gray-500">
              <p>Loading system information...</p>
            </div>
          ) : (
            <>
              {/* Current Version */}
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
                          value={releases[0].release_date}
                          onChange={(e) => {
                            const d = e.target.value;
                            setReleases(prev => [{ ...prev[0], release_date: d }, ...prev.slice(1)]);
                          }}
                          className="text-sm text-gray-600 bg-white border border-blue-300 rounded px-2 py-1"
                        />
                      </div>
                    ) : (
                      <div>
                        <h4 className="text-2xl font-bold text-gray-900">Version {releases[0].version}</h4>
                        <p className="text-sm text-gray-600">Release: {releases[0].release_date}</p>
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
                        onClick={() => {
                          if (isEditingCurrent) {
                            handleSaveEdit();
                          } else {
                            setIsEditingCurrent(true);
                          }
                        }}
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
                  <div className="border-l-4 border-blue-500 pl-4 py-2 bg-white rounded-r-lg">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">v{releases[0].version}</span>
                      <span className="text-sm text-gray-500">{releases[0].release_date}</span>
                      {releases[0].is_current && (
                        <span className="bg-green-600 text-white text-xs font-medium px-2 py-1 rounded">Current</span>
                      )}
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
                <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                  <h5 className="font-semibold text-gray-900 mb-3">Create New Release</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
                      <input
                        type="text"
                        value={newRelease.version}
                        onChange={(e) => setNewRelease(prev => ({ ...prev, version: e.target.value }))}
                        className="w-full border border-gray-300 rounded px-3 py-2"
                        placeholder="e.g., 1.1.0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Release date</label>
                      <input
                        type="text"
                        value={newRelease.release_date}
                        onChange={(e) => setNewRelease(prev => ({ ...prev, release_date: e.target.value }))}
                        className="w-full border border-gray-300 rounded px-3 py-2"
                        placeholder="e.g., October 2025"
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Update notes</label>
                    <textarea
                      value={newRelease.updates}
                      onChange={(e) => setNewRelease(prev => ({ ...prev, updates: e.target.value }))}
                      className="w-full h-32 border border-gray-300 rounded px-3 py-2"
                      placeholder={"- New feature A\n- Improvement B\n- Fix C"}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newRelease.is_current}
                        onChange={(e) => setNewRelease(prev => ({ ...prev, is_current: e.target.checked }))}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">Mark as current version</span>
                    </label>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={handleCreateRelease}
                      className="px-4 py-2 rounded-lg font-medium transition-all text-sm bg-green-600 text-white hover:bg-green-700"
                    >
                      ✓ Save Release
                    </button>
                    <button
                      onClick={() => {
                        setIsCreatingRelease(false);
                        setNewRelease({ version: '', release_date: todayPretty, updates: '', is_current: false });
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
                    <div key={idx} className="border-l-4 border-gray-300 pl-4 py-2 bg-white rounded-r-lg">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2 py-1 rounded">v{r.version}</span>
                        <span className="text-sm text-gray-500">{r.release_date}</span>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
