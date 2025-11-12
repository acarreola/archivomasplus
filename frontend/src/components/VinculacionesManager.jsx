// frontend/src/components/VinculacionesManager.jsx
import { useEffect, useState, useCallback, useRef } from 'react';
import axios from '../utils/axios';

export default function VinculacionesManager() {
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [overview, setOverview] = useState(null);
  const fetchingOverview = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await axios.get('/api/repositorios/');
        setRepos(r.data);
      } catch (e) {
        console.error('Error cargando repos:', e);
      }
    })();
  }, []);

  const fetchOverview = useCallback(async () => {
    if (fetchingOverview.current) {
      console.log('⚠️ Ya hay una petición de overview en curso, saltando...');
      return;
    }
    
    fetchingOverview.current = true;
    try {
      const r = await axios.get('/api/broadcasts/sources_overview/');
      setOverview(r.data);
    } catch (e) {
      console.error('Error fetching overview:', e);
      setOverview({ error: e.response?.data?.error || e.message });
    } finally {
      fetchingOverview.current = false;
    }
  }, []);

  useEffect(() => { 
    fetchOverview(); 
  }, [fetchOverview]);

  const handlePreview = async () => {
    if (!selectedRepo) return;
    setLoading(true);
    setResult(null);
    try {
      const r = await axios.post('/api/broadcasts/match_source_files/', {
        repositorio_id: selectedRepo,
        dry_run: true,
      });
      setResult(r.data);
    } catch (e) {
      setResult({ error: e.response?.data?.error || e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!selectedRepo) return;
    setLoading(true);
    try {
      const r = await axios.post('/api/broadcasts/match_source_files/', {
        repositorio_id: selectedRepo,
        dry_run: false,
      });
      setResult(r.data);
    } catch (e) {
      alert('Error al aplicar vinculación: ' + (e.response?.data?.error || e.message));
    } finally {
      setLoading(false);
      fetchOverview();
    }
  };

  const matched = result?.matched_list || [];
  const notMatched = result?.not_matched_list || [];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-4 flex justify-between items-center px-6 pt-4">
        <h2 className="text-2xl font-bold text-gray-800">🔗 Connections from sources/</h2>
        <button 
          onClick={fetchOverview} 
          className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-sm font-medium transition-colors"
        >
          🔄 Refresh Overview
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        <div className="max-w-7xl mx-auto space-y-4">
          
          {/* Overview de sources */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <h3 className="font-bold text-lg mb-3 text-gray-900">📊 Overview de Sources</h3>
            {!overview && <div className="text-gray-500">Cargando información...</div>}
            {overview && overview.error && (
              <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700">
                ❌ {overview.error}
              </div>
            )}
            {overview && !overview.error && (
              <div className="text-sm">
                <div className="flex gap-6 mb-4 p-3 bg-gray-50 rounded">
                  <div><span className="font-semibold text-gray-700">Media root:</span> <code className="text-purple-600">{overview.media_root}</code></div>
                  <div><span className="font-semibold text-gray-700">Sources:</span> <code className="text-purple-600">{overview.sources_path}</code> {overview.exists ? '✅' : '❌'}</div>
                  <div><span className="font-semibold text-gray-700">Directorios:</span> <span className="text-blue-600 font-bold">{overview.dirs_total}</span></div>
                  <div><span className="font-semibold text-gray-700">Archivos:</span> <span className="text-green-600 font-bold">{overview.files_total}</span></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-auto">
                  {overview.dirs?.map((d, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-3 bg-gradient-to-br from-gray-50 to-white hover:shadow-md transition-shadow">
                      <div className="font-bold text-gray-900 mb-1">📁 {d.name}</div>
                      <div className="text-xs text-gray-500 mb-2"><code>{d.relpath}</code></div>
                      <div className="text-xs font-medium text-indigo-600 mb-1">� {d.file_count} archivo(s)</div>
                      <div className="text-xs text-gray-600 bg-gray-100 rounded p-1 max-h-20 overflow-auto">
                        {d.sample_files.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Selector + Acciones */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-4">
              <label className="text-sm font-semibold text-gray-700">Repositorio:</label>
              <select 
                className="border border-gray-300 rounded-lg px-3 py-2 flex-1 max-w-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                value={selectedRepo} 
                onChange={(e) => setSelectedRepo(e.target.value)}
              >
                <option value="">— Seleccionar repositorio —</option>
                {repos.map(r => (
                  <option key={r.id} value={r.id}>{r.nombre} ({r.folio})</option>
                ))}
              </select>
              <button 
                disabled={!selectedRepo || loading} 
                onClick={handlePreview} 
                className={`px-4 py-2 rounded-lg text-white font-medium transition-colors ${
                  !selectedRepo || loading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                👁️ Preview
              </button>
              <button 
                disabled={!selectedRepo || loading} 
                onClick={handleApply} 
                className={`px-4 py-2 rounded-lg text-white font-medium transition-colors ${
                  !selectedRepo || loading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                ✅ Aplicar Vinculación
              </button>
            </div>
          </div>

          {/* Resultados detallados */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Coincidencias */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-green-50 border-b border-green-200 px-4 py-3">
                <div className="font-bold text-lg text-green-800">
                  ✅ Coincidencias ({result?.matched || 0})
                </div>
              </div>
              <div className="overflow-auto max-h-96">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="text-left text-gray-600 border-b border-gray-200">
                      <th className="p-3 font-semibold">Broadcast</th>
                      <th className="p-3 font-semibold">ID Content</th>
                      <th className="p-3 font-semibold">Nombre</th>
                      <th className="p-3 font-semibold">Archivo</th>
                      <th className="p-3 font-semibold">Path</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {matched.map((m, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="p-3 font-medium text-indigo-600">#{m.id}</td>
                        <td className="p-3"><code className="text-xs bg-purple-50 text-purple-700 px-1 py-0.5 rounded">{m.id_content || '—'}</code></td>
                        <td className="p-3">{m.nombre || '—'}</td>
                        <td className="p-3 text-xs text-gray-600">{m.archivo}</td>
                        <td className="p-3 text-xs text-gray-500">{m.path}</td>
                      </tr>
                    ))}
                    {matched.length === 0 && (
                      <tr>
                        <td className="p-6 text-center text-gray-500" colSpan={5}>
                          — Sin coincidencias —
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* No encontrados */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-red-50 border-b border-red-200 px-4 py-3">
                <div className="font-bold text-lg text-red-800">
                  ❌ No Encontrados ({result?.not_matched || 0})
                </div>
              </div>
              <div className="overflow-auto max-h-96">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="text-left text-gray-600 border-b border-gray-200">
                      <th className="p-3 font-semibold">Broadcast</th>
                      <th className="p-3 font-semibold">ID Content</th>
                      <th className="p-3 font-semibold">Nombre</th>
                      <th className="p-3 font-semibold">Motivo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {notMatched.map((m, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="p-3 font-medium text-indigo-600">#{m.id}</td>
                        <td className="p-3"><code className="text-xs bg-purple-50 text-purple-700 px-1 py-0.5 rounded">{m.id_content || '—'}</code></td>
                        <td className="p-3">{m.nombre || '—'}</td>
                        <td className="p-3 text-xs text-red-600">{m.reason}</td>
                      </tr>
                    ))}
                    {notMatched.length === 0 && (
                      <tr>
                        <td className="p-6 text-center text-gray-500" colSpan={4}>
                          — Sin no-encontrados —
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

