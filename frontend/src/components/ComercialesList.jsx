// frontend/src/components/ComercialesList.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import ComercialEditModal from './ComercialEditModal';

export default function ComercialesList({ uploadCount }) {
  const [comerciales, setComerciales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [repositorios, setRepositorios] = useState([]);
  const [editingComercial, setEditingComercial] = useState(null);

  useEffect(() => {
    // Cargar lista de repositorios para el filtro
    axios.get('http://localhost:8000/api/repositorios/')
      .then(res => setRepositorios(res.data))
      .catch(err => console.error('Error cargar repositorios:', err));
  }, []);

  useEffect(() => {
    fetchComerciales();
  }, [uploadCount, selectedRepo]);

  const fetchComerciales = () => {
    setLoading(true);
    let url = 'http://localhost:8000/api/broadcasts/';
    if (selectedRepo) {
      url += `?repositorio=${selectedRepo}`;
    }
    
    axios.get(url)
      .then(res => {
        setComerciales(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error cargar comerciales:', err);
        setLoading(false);
      });
  };

  const getEstadoBadge = (estado) => {
    const badges = {
      'PENDIENTE': 'bg-yellow-100 text-yellow-800',
      'PROCESANDO': 'bg-blue-100 text-blue-800',
      'COMPLETADO': 'bg-green-100 text-green-800',
      'ERROR': 'bg-red-100 text-red-800'
    };
    return badges[estado] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">Cargando comerciales...</p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      {/* Modal de Edición */}
      {editingComercial && (
        <ComercialEditModal
          comercial={editingComercial}
          onClose={() => setEditingComercial(null)}
          onSave={() => {
            fetchComerciales();
            setEditingComercial(null);
          }}
        />
      )}

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">Comerciales Subidos</h3>
        <div className="flex items-center space-x-2">
          <label htmlFor="repoFilter" className="text-sm text-gray-600">Filtrar por repositorio:</label>
          <select
            id="repoFilter"
            value={selectedRepo}
            onChange={(e) => setSelectedRepo(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm"
          >
            <option value="">Todos</option>
            {repositorios.map(repo => (
              <option key={repo.id} value={repo.id}>
                {repo.folio} - {repo.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {comerciales.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-500">No hay comerciales subidos aún.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Repositorio</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Version</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {comerciales.map(comercial => (
                <tr key={comercial.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                    {comercial.id.substring(0, 8)}...
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="font-medium text-gray-900">{comercial.repositorio_name}</div>
                    <div className="text-xs text-gray-500 font-mono">{comercial.repositorio_folio}</div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {comercial.pizarra?.producto || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {comercial.pizarra?.version || 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${getEstadoBadge(comercial.estado_transcodificacion)}`}>
                      {comercial.estado_transcodificacion}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(comercial.date_subida).toLocaleString('es-MX', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    <button 
                      onClick={() => setEditingComercial(comercial)}
                      className="text-blue-600 hover:text-blue-900 font-medium"
                    >
                      ✏️ Edit
                    </button>
                    {comercial.estado_transcodificacion === 'COMPLETADO' && (
                      <button className="text-green-600 hover:text-green-900">▶ View</button>
                    )}
                    <button className="text-purple-600 hover:text-purple-900">↓ Download</button>
                    <button className="text-red-600 hover:text-red-900">🗑 Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
