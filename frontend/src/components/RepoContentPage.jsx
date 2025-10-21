// frontend/src/components/RepoContentPage.jsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from '../utils/axios';

export default function RepoContentPage() {
  const { repoId } = useParams();
  const [repo, setRepo] = useState(null);
  const [directorios, setDirectorios] = useState([]);
  const [comerciales, setComerciales] = useState([]);
  const [moveModal, setMoveModal] = useState({ show: false, comercial: null });
  const [moveTargetDir, setMoveTargetDir] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  useEffect(() => {
    const fetchRepoData = async () => {
      try {
        setLoading(true);
        const [repoRes, directoriosRes, comercialesRes] = await Promise.all([
          axios.get(`/api/repositorios/${repoId}/`),
          axios.get(`/api/directorios/?repositorio=${repoId}`),
          axios.get(`/api/broadcasts/?repositorio=${repoId}`)
        ]);
        setRepo(repoRes.data);
        setDirectorios(directoriosRes.data);
        setComerciales(comercialesRes.data);
      } catch (err) {
        setError('Error al cargar el contenido del repositorio.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRepoData();
  }, [repoId]);

  const handleMoveCommercial = async () => {
    if (!moveTargetDir || !moveModal.comercial) return;
    try {
      await axios.patch(`/api/broadcasts/${moveModal.comercial.id}/`, { directorio: moveTargetDir });
      setMoveModal({ show: false, comercial: null });
      // Refresh comerciales
      const comercialesRes = await axios.get(`/api/broadcasts/?repositorio=${repoId}`);
      setComerciales(comercialesRes.data);
    } catch (err) {
      alert('Error al mover el comercial: ' + (err.response?.data?.detail || err.message));
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Cargando contenido...</div>;
  }

  if (error) {
    return <div className="p-6 text-center text-red-500">{error}</div>;
  }

  // Calcular datos de paginación
  const totalPages = Math.ceil(comerciales.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentComerciales = comerciales.slice(startIndex, endIndex);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex justify-between items-center">
        <Link to="/admin" className="text-blue-600 hover:underline flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="m313-440 224 224-57 56-320-320 320-320 57 56-224 224h487v80H313Z"/></svg>
          <span>Back to Repositories</span>
        </Link>
      </div>
      <h2 className="text-3xl font-bold text-gray-800 mb-2">
        {repo?.nombre || repo?.name}
      </h2>
      <div className="mb-6 text-sm text-gray-500 flex gap-4">
        <span>ID: <strong>{repo?.id}</strong></span>
        <span>Folio: <strong>{repo?.folio}</strong></span>
        <span>Key: <strong>{repo?.clave}</strong></span>
        <span>Total Commercials: <strong>{comerciales.length}</strong></span>
      </div>

      {/* Tabla de comerciales con paginación */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800">Commercials List</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b-2 border-gray-300">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-20">ID</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Product / Name</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-48">Directory</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-32">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-32">Status</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentComerciales.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-400 italic">
                    No commercials found
                  </td>
                </tr>
              )}
              {currentComerciales.map((com, index) => (
                <tr key={com.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <span className="font-mono bg-gray-100 px-2 py-1 rounded">{com.id}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">
                        {com.pizarra?.producto || com.nombre_original || 'Unnamed'}
                      </span>
                      {com.nombre_original && com.pizarra?.producto && (
                        <span className="text-xs text-gray-500 mt-1">{com.nombre_original}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                      {com.directorio_nombre || 'No directory'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {com.duracion || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      com.transcodificado 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {com.transcodificado ? 'Transcoded' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative group">
                      <button
                        onClick={() => { setMoveModal({ show: true, comercial: com }); setMoveTargetDir(''); }}
                        className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 transition-colors"
                      >
                        Move
                      </button>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                        Move to directory
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginador */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1} to {Math.min(endIndex, comerciales.length)} of {comerciales.length} commercials
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded border ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border-gray-300'
                }`}
              >
                Previous
              </button>
              
              {/* Números de página */}
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                  // Mostrar solo algunas páginas alrededor de la actual
                  if (
                    page === 1 || 
                    page === totalPages || 
                    (page >= currentPage - 2 && page <= currentPage + 2)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => goToPage(page)}
                        className={`px-3 py-1 rounded ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (page === currentPage - 3 || page === currentPage + 3) {
                    return <span key={page} className="px-2 py-1">...</span>;
                  }
                  return null;
                })}
              </div>

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded border ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border-gray-300'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sección de directorios (colapsada en un acordeón o similar) */}
      <div className="mt-6 bg-white rounded-lg shadow overflow-hidden">
        <details className="group">
          <summary className="px-6 py-4 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800">Directories ({directorios.length})</h3>
            <svg className="w-5 h-5 text-gray-600 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {directorios.length === 0 && (
                <p className="text-gray-400 italic col-span-full">No directories</p>
              )}
              {directorios.map(dir => (
                <div key={dir.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200">
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#6B7280">
                      <path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H447l-80-80H160v480Zm0 0v-480 480Z"/>
                    </svg>
                    <span className="text-sm font-medium text-gray-700">{dir.nombre}</span>
                  </div>
                  <span className="text-xs text-gray-400">ID: {dir.id}</span>
                </div>
              ))}
            </div>
          </div>
        </details>
      </div>
      {/* Sección de directorios (colapsada en un acordeón o similar) */}
      <div className="mt-6 bg-white rounded-lg shadow overflow-hidden">
        <details className="group">
          <summary className="px-6 py-4 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800">Directories ({directorios.length})</h3>
            <svg className="w-5 h-5 text-gray-600 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {directorios.length === 0 && (
                <p className="text-gray-400 italic col-span-full">No directories</p>
              )}
              {directorios.map(dir => (
                <div key={dir.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200">
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#6B7280">
                      <path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H447l-80-80H160v480Zm0 0v-480 480Z"/>
                    </svg>
                    <span className="text-sm font-medium text-gray-700">{dir.nombre}</span>
                  </div>
                  <span className="text-xs text-gray-400">ID: {dir.id}</span>
                </div>
              ))}
            </div>
          </div>
        </details>
      </div>

      {/* Modal para mover comercial */}
      {moveModal.show && moveModal.comercial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl"
              onClick={() => setMoveModal({ show: false, comercial: null })}
            >
              &times;
            </button>
            <h4 className="text-lg font-bold mb-3">Move Commercial</h4>
            <div className="mb-4 text-sm text-gray-700">
              {moveModal.comercial.pizarra?.producto || moveModal.comercial.nombre_original || 'Unnamed'} (ID: {moveModal.comercial.id})
            </div>
            <label className="block mb-2 text-sm font-medium">Select target directory:</label>
            <select
              className="w-full border rounded px-3 py-2 mb-4"
              value={moveTargetDir}
              onChange={e => setMoveTargetDir(e.target.value)}
            >
              <option value="">— Select a directory —</option>
              {directorios.map(dir => (
                <option key={dir.id} value={dir.id}>{dir.nombre}</option>
              ))}
            </select>
            <button
              className={`w-full px-4 py-2 rounded bg-indigo-600 text-white font-semibold ${!moveTargetDir ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-700'}`}
              disabled={!moveTargetDir}
              onClick={handleMoveCommercial}
            >
              Confirm Move
            </button>
          </div>
        </div>
      )}
    </div>
  );
}