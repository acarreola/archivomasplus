// frontend/src/components/RepoContentPage.jsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from '../utils/axios';

export default function RepoContentPage() {
  const { repoId } = useParams();
  const [repo, setRepo] = useState(null);
  const [directorios, setDirectorios] = useState([]);
  const [items, setItems] = useState([]); // Genérico: broadcasts, audios o images
  const [moduleType, setModuleType] = useState('broadcast'); // Tipo de módulo detectado
  const [moveModal, setMoveModal] = useState({ show: false, item: null });
  const [moveTargetDir, setMoveTargetDir] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  useEffect(() => {
    const fetchRepoData = async () => {
      try {
        setLoading(true);
        
        // 1. Cargar info del repositorio
        const repoRes = await axios.get(`/api/repositorios/${repoId}/`);
        const repoData = repoRes.data;
        setRepo(repoData);
        console.log('🔍 Repo data:', repoData);
        
        // 2. Detectar tipo de módulo
        let detectedModuleType = 'broadcast'; // Default
        if (repoData.modulos && repoData.modulos.length > 0) {
          const moduloId = repoData.modulos[0];
          console.log('📦 Módulo ID:', moduloId);
          try {
            const moduloRes = await axios.get(`/api/modulos/${moduloId}/`);
            const moduloTipo = moduloRes.data.tipo;
            console.log('✅ Tipo de módulo detectado:', moduloTipo);
            if (moduloTipo === 'images') {
              detectedModuleType = 'images';
            } else if (moduloTipo === 'audio') {
              detectedModuleType = 'audio';
            } else if (moduloTipo === 'broadcast') {
              detectedModuleType = 'broadcast';
            }
          } catch (err) {
            console.warn('⚠️ No se pudo detectar el módulo, usando broadcast por defecto');
          }
        }
        console.log('🎯 Module type final:', detectedModuleType);
        setModuleType(detectedModuleType);
        
        // 3. Cargar directorios
        const directoriosRes = await axios.get(`/api/directorios/?repositorio=${repoId}`);
        setDirectorios(directoriosRes.data);
        
        // 4. Cargar items según el tipo de módulo
        let itemsRes;
        if (detectedModuleType === 'images') {
          console.log('📸 Cargando IMAGES desde /api/images/');
          itemsRes = await axios.get(`/api/images/?repositorio=${repoId}`);
        } else if (detectedModuleType === 'audio') {
          console.log('🎵 Cargando AUDIO desde /api/audios/');
          itemsRes = await axios.get(`/api/audios/?repositorio=${repoId}`);
        } else {
          console.log('📺 Cargando BROADCASTS desde /api/broadcasts/');
          itemsRes = await axios.get(`/api/broadcasts/?repositorio=${repoId}`);
        }
        console.log('📊 Items cargados:', itemsRes.data.length);
        setItems(itemsRes.data);
        
      } catch (err) {
        setError('Error al cargar el contenido del repositorio.');
        console.error('❌ Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRepoData();
  }, [repoId]);

  const handleMoveItem = async () => {
    if (!moveTargetDir || !moveModal.item) return;
    try {
      let endpoint;
      if (moduleType === 'images') {
        endpoint = `/api/images/${moveModal.item.id}/`;
      } else if (moduleType === 'audio') {
        endpoint = `/api/audios/${moveModal.item.id}/`;
      } else {
        endpoint = `/api/broadcasts/${moveModal.item.id}/`;
      }
      
      await axios.patch(endpoint, { directorio: moveTargetDir });
      setMoveModal({ show: false, item: null });
      
      // Refresh items
      let itemsRes;
      if (moduleType === 'images') {
        itemsRes = await axios.get(`/api/images/?repositorio=${repoId}`);
      } else if (moduleType === 'audio') {
        itemsRes = await axios.get(`/api/audios/?repositorio=${repoId}`);
      } else {
        itemsRes = await axios.get(`/api/broadcasts/?repositorio=${repoId}`);
      }
      setItems(itemsRes.data);
    } catch (err) {
      alert('Error al mover el archivo: ' + (err.response?.data?.detail || err.message));
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Cargando contenido...</div>;
  }

  if (error) {
    return <div className="p-6 text-center text-red-500">{error}</div>;
  }

  // Calcular datos de paginación
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = items.slice(startIndex, endIndex);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Función para obtener el label del módulo
  const getModuleLabel = () => {
    if (moduleType === 'images') return 'Images';
    if (moduleType === 'audio') return 'Audio Files';
    return 'Commercials';
  };

  // Función para renderizar una fila según el tipo de módulo
  const renderItemRow = (item) => {
    if (moduleType === 'images') {
      return (
        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
          <td className="px-4 py-3 text-sm text-gray-600">
            <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">{item.id.substring(0, 8)}</span>
          </td>
          <td className="px-4 py-3">
            <div className="flex items-center gap-3">
              {item.thumbnail && (
                <img src={item.thumbnail} alt={item.nombre_original} className="w-16 h-16 object-cover rounded" />
              )}
              <div className="flex flex-col">
                <span className="font-medium text-gray-900">
                  {item.nombre_original || 'Unnamed'}
                </span>
                <span className="text-xs text-gray-500 mt-1">{item.tipo_archivo || '-'}</span>
              </div>
            </div>
          </td>
          <td className="px-4 py-3">
            <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
              {item.directorio_nombre || 'No directory'}
            </span>
          </td>
          <td className="px-4 py-3 text-sm text-gray-600">
            {item.metadata?.width && item.metadata?.height 
              ? `${item.metadata.width}x${item.metadata.height}` 
              : '-'}
          </td>
          <td className="px-4 py-3">
            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
              item.estado === 'COMPLETADO'
                ? 'bg-green-100 text-green-800' 
                : item.estado === 'ERROR'
                ? 'bg-red-100 text-red-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {item.estado || 'PENDIENTE'}
            </span>
          </td>
          <td className="px-4 py-3">
            <button
              onClick={() => { setMoveModal({ show: true, item }); setMoveTargetDir(''); }}
              className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 transition-colors"
            >
              Move
            </button>
          </td>
        </tr>
      );
    } else if (moduleType === 'audio') {
      return (
        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
          <td className="px-4 py-3 text-sm text-gray-600">
            <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">{item.id.substring(0, 8)}</span>
          </td>
          <td className="px-4 py-3">
            <div className="flex flex-col">
              <span className="font-medium text-gray-900">
                {item.metadata?.titulo || item.nombre_original || 'Unnamed'}
              </span>
              {item.nombre_original && item.metadata?.titulo && (
                <span className="text-xs text-gray-500 mt-1">{item.nombre_original}</span>
              )}
            </div>
          </td>
          <td className="px-4 py-3">
            <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
              {item.directorio_nombre || 'No directory'}
            </span>
          </td>
          <td className="px-4 py-3 text-sm text-gray-600">
            {item.metadata?.duracion || '-'}
          </td>
          <td className="px-4 py-3">
            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
              item.estado_procesamiento === 'COMPLETADO'
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {item.estado_procesamiento || 'PENDIENTE'}
            </span>
          </td>
          <td className="px-4 py-3">
            <button
              onClick={() => { setMoveModal({ show: true, item }); setMoveTargetDir(''); }}
              className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 transition-colors"
            >
              Move
            </button>
          </td>
        </tr>
      );
    } else {
      // Broadcast
      return (
        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
          <td className="px-4 py-3 text-sm text-gray-600">
            <span className="font-mono bg-gray-100 px-2 py-1 rounded">{item.id}</span>
          </td>
          <td className="px-4 py-3">
            <div className="flex flex-col">
              <span className="font-medium text-gray-900">
                {item.pizarra?.producto || item.nombre_original || 'Unnamed'}
              </span>
              {item.nombre_original && item.pizarra?.producto && (
                <span className="text-xs text-gray-500 mt-1">{item.nombre_original}</span>
              )}
            </div>
          </td>
          <td className="px-4 py-3">
            <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
              {item.directorio_nombre || 'No directory'}
            </span>
          </td>
          <td className="px-4 py-3 text-sm text-gray-600">
            {item.duracion || '-'}
          </td>
          <td className="px-4 py-3">
            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
              item.transcodificado 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {item.transcodificado ? 'Transcoded' : 'Pending'}
            </span>
          </td>
          <td className="px-4 py-3">
            <button
              onClick={() => { setMoveModal({ show: true, item }); setMoveTargetDir(''); }}
              className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 transition-colors"
            >
              Move
            </button>
          </td>
        </tr>
      );
    }
  };

  // Función para obtener headers según el tipo
  const getTableHeaders = () => {
    if (moduleType === 'images') {
      return (
        <tr>
          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-32">ID</th>
          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Image / Name</th>
          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-48">Directory</th>
          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-32">Dimensions</th>
          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-32">Status</th>
          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-32">Actions</th>
        </tr>
      );
    } else if (moduleType === 'audio') {
      return (
        <tr>
          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-32">ID</th>
          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Audio / Name</th>
          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-48">Directory</th>
          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-32">Duration</th>
          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-32">Status</th>
          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-32">Actions</th>
        </tr>
      );
    } else {
      return (
        <tr>
          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-20">ID</th>
          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Product / Name</th>
          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-48">Directory</th>
          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-32">Duration</th>
          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-32">Status</th>
          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-32">Actions</th>
        </tr>
      );
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
        <span>Module: <strong className="text-blue-600">{getModuleLabel()}</strong></span>
        <span>Total Items: <strong>{items.length}</strong></span>
      </div>

      {/* Tabla genérica con paginación */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800">{getModuleLabel()} List</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b-2 border-gray-300">
              {getTableHeaders()}
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentItems.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-400 italic">
                    No {getModuleLabel().toLowerCase()} found
                  </td>
                </tr>
              )}
              {currentItems.map(item => renderItemRow(item))}
            </tbody>
          </table>
        </div>

        {/* Paginador */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1} to {Math.min(endIndex, items.length)} of {items.length} items
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
      {moveModal.show && moveModal.item && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl"
              onClick={() => setMoveModal({ show: false, item: null })}
            >
              &times;
            </button>
            <h4 className="text-lg font-bold mb-3">Move {getModuleLabel()} Item</h4>
            <div className="mb-4 text-sm text-gray-700">
              {moveModal.item.nombre_original || moveModal.item.pizarra?.producto || 'Unnamed'} (ID: {moveModal.item.id})
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
              onClick={handleMoveItem}
            >
              Confirm Move
            </button>
          </div>
        </div>
      )}
    </div>
  );
}