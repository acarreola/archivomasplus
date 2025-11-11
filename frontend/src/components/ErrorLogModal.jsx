import { useEffect, useState } from 'react';
import axios from '../utils/axios';

function formatDate(dt) {
  try {
    return new Date(dt).toLocaleString('es-MX');
  } catch {
    return dt;
  }
}

export default function ErrorLogModal({ open, onClose, repositorioId, moduloId, directorioId }) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchErrors = async () => {
    if (!repositorioId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('repositorio', repositorioId);
      if (moduloId) params.append('modulo', moduloId);
      if (directorioId) params.append('directorio', directorioId);
      params.append('ordering', '-fecha_creacion');
      const res = await axios.get(`/api/processing-errors/?${params.toString()}`);
      setErrors(res.data || []);
    } catch (e) {
      console.error('Error fetching processing errors', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    fetchErrors();
  }, [open, repositorioId, moduloId, directorioId]);

  useEffect(() => {
    if (!open || !autoRefresh) return;
    const id = setInterval(fetchErrors, 5000);
    return () => clearInterval(id);
  }, [open, autoRefresh, repositorioId, moduloId, directorioId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[80vh] flex flex-col">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="font-semibold text-lg">Log de Errores de Procesamiento</h2>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-sm text-gray-700">
              <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} /> Auto refrescar
            </label>
            <button onClick={fetchErrors} className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-sm">Refrescar</button>
            <button onClick={onClose} className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-sm">Cerrar</button>
          </div>
        </div>

        <div className="px-4 py-3 text-sm text-gray-600">
          {repositorioId && (<span className="mr-4">Repositorio: <b>{repositorioId}</b></span>)}
          {moduloId && (<span className="mr-4">Módulo: <b>{moduloId}</b></span>)}
          {directorioId && (<span>Directorio: <b>{directorioId}</b></span>)}
        </div>

        <div className="flex-1 overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-3 py-2">Fecha</th>
                <th className="text-left px-3 py-2">Etapa</th>
                <th className="text-left px-3 py-2">Archivo</th>
                <th className="text-left px-3 py-2">Tipo</th>
                <th className="text-left px-3 py-2">Mensaje</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-500">Cargando…</td></tr>
              ) : errors.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-500">Sin errores recientes</td></tr>
              ) : (
                errors.map(err => (
                  <tr key={err.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap text-gray-600">{formatDate(err.fecha_creacion)}</td>
                    <td className="px-3 py-2">{err.stage}</td>
                    <td className="px-3 py-2">{err.file_name || '-'}</td>
                    <td className="px-3 py-2">{
                      err.broadcast ? 'Video' : err.audio ? 'Audio' : err.imagen ? 'Imagen' : err.storage_file ? 'Archivo' : '-'
                    }</td>
                    <td className="px-3 py-2">
                      <div className="max-w-[520px] truncate" title={err.error_message}>{err.short_error || err.error_message}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
