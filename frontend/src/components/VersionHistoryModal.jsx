import { useState, useEffect } from 'react';
import axios from '../utils/axios';

function VersionHistoryModal({ onClose }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVersions();
  }, []);

  const fetchVersions = async () => {
    try {
      const response = await axios.get('/api/system-info/');
      setVersions(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching version history:', err);
      setLoading(false);
    }
  };

  const parseUpdates = (updates) => {
    if (!updates) return [];
    return updates.split('\n').filter(line => line.trim() !== '');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <div>
              <h2 className="text-2xl font-bold">Version History</h2>
              <p className="text-blue-100 text-sm">ARCHIVO+ Release Notes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-800 rounded-full p-2 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12 text-gray-500">
              <p>Loading version history...</p>
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No version history available</p>
            </div>
          ) : (
            <div className="space-y-6">
              {versions.map((version, index) => (
                <div key={version.id || index} className="relative pl-8 pb-6 border-l-2 border-blue-200 last:border-l-0 last:pb-0">
                  {/* Timeline dot */}
                  <div className="absolute left-0 top-0 -translate-x-[9px] w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow"></div>
                  
                  {/* Version card */}
                  <div className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-600 text-white">
                          v{version.version}
                        </span>
                        <span className="text-sm text-gray-500 font-medium">
                          {new Date(version.release_date).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </span>
                        {version.is_current && (
                          <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded">
                            Current
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <ul className="space-y-2">
                      {parseUpdates(version.updates).map((change, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-gray-700">
                          <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-sm">{change}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {!loading && versions.length > 0 && versions[0] && (
                <span><span className="font-semibold">Current Version:</span> v{versions[0].version}</span>
              )}
            </div>
            <button
              onClick={onClose}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VersionHistoryModal;
