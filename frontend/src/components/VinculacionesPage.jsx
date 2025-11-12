import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import axios from '../utils/axios';

export default function VinculacionesPage() {
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
    <div className="p-4 h-full flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold">Vinculaciones desde sources/</h2>
        <button onClick={fetchOverview} className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-sm">Refrescar overview</button>
      </div>

      {/* Overview de sources */}
      <div className="bg-white rounded border p-3">
        <h3 className="font-semibold mb-2">Overview de sources</h3>
        {!overview && <div className="text-gray-500">Cargando…</div>}
        {overview && overview.error && (
          <div className="text-red-600">{overview.error}</div>
        )}
        {overview && !overview.error && (
          <div className="text-sm text-gray-700">
            <div className="flex gap-6 mb-2">
              <div><span className="font-medium">Media root:</span> {overview.media_root}</div>
              <div><span className="font-medium">Sources:</span> {overview.sources_path} {overview.exists ? '✓' : '✗'}</div>
              <div><span className="font-medium">Dirs:</span> {overview.dirs_total}</div>
              <div><span className="font-medium">Files:</span> {overview.files_total}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-auto">
              {overview.dirs?.map((d, i) => (
                <div key={i} className="border rounded p-2 bg-gray-50">
                  <div className="font-medium text-gray-800">{d.name}</div>
                  <div className="text-xs text-gray-500">{d.relpath}</div>
                  <div className="text-xs mt-1">{d.file_count} archivo(s)</div>
                  <div className="text-xs text-gray-600 mt-1">{d.sample_files.join(', ')}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Selector + Acciones */}
      <div className="bg-white rounded border p-3 flex items-center gap-3">
        <label className="text-sm">Repositorio:</label>
        <select className="border rounded px-2 py-1" value={selectedRepo} onChange={(e) => setSelectedRepo(e.target.value)}>
          <option value="">— seleccionar —</option>
          {repos.map(r => (
            <option key={r.id} value={r.id}>{r.name} ({r.folio})</option>
          ))}
        </select>
        <button disabled={!selectedRepo || loading} onClick={handlePreview} className={`px-3 py-1 rounded text-white ${!selectedRepo || loading ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}>Preview</button>
        <button disabled={!selectedRepo || loading} onClick={handleApply} className={`px-3 py-1 rounded text-white ${!selectedRepo || loading ? 'bg-gray-400' : 'bg-purple-600 hover:bg-purple-700'}`}>Aplicar vinculación</button>
      </div>

      {/* Resultados detallados */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-hidden">
        <div className="bg-white rounded border p-3 overflow-auto">
          <div className="font-semibold mb-2">Coincidencias ({result?.matched || 0})</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="p-2">Broadcast</th>
                <th className="p-2">id_content</th>
                <th className="p-2">nombre</th>
                <th className="p-2">archivo</th>
                <th className="p-2">path</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {matched.map((m, idx) => (
                <tr key={idx}>
                  <td className="p-2">#{m.id}</td>
                  <td className="p-2">{m.id_content || '—'}</td>
                  <td className="p-2">{m.nombre || '—'}</td>
                  <td className="p-2">{m.archivo}</td>
                  <td className="p-2">{m.path}</td>
                </tr>
              ))}
              {matched.length === 0 && (
                <tr><td className="p-2 text-gray-500" colSpan={5}>— Sin coincidencias —</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-white rounded border p-3 overflow-auto">
          <div className="font-semibold mb-2">No encontrados ({result?.not_matched || 0})</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="p-2">Broadcast</th>
                <th className="p-2">id_content</th>
                <th className="p-2">nombre</th>
                <th className="p-2">motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {notMatched.map((m, idx) => (
                <tr key={idx}>
                  <td className="p-2">#{m.id}</td>
                  <td className="p-2">{m.id_content || '—'}</td>
                  <td className="p-2">{m.nombre || '—'}</td>
                  <td className="p-2">{m.reason}</td>
                </tr>
              ))}
              {notMatched.length === 0 && (
                <tr><td className="p-2 text-gray-500" colSpan={4}>— Sin no-encontrados —</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
