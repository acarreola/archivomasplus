import { useState, useEffect, useCallback, useRef } from 'react';
import axios from '../utils/axios';
import UploadForm from '../UploadForm';
import MultiFileUploader from './MultiFileUploader';
import ComercialEditModal from './ComercialEditModal';
import ShareModal from './ShareModal';
import CreateDirectoryModal from './CreateDirectoryModal';
import ProcessingNotification from './ProcessingNotification';
import EncodingModal from './EncodingModal_v2';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

function ComercialesManager() {
  const { language, toggleLanguage, t } = useLanguage();
  const { user } = useAuth();
  const [repositorios, setRepositorios] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [selectedModulo, setSelectedModulo] = useState(null);
  const [comerciales, setComerciales] = useState([]);
  const [directorios, setDirectorios] = useState([]);
  const [selectedDirectory, setSelectedDirectory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadCount, setUploadCount] = useState(0);
  const [editingComercial, setEditingComercial] = useState(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showDirectoryForm, setShowDirectoryForm] = useState(false);
  const [editingDirectory, setEditingDirectory] = useState(null);
  // authError now comes from AuthContext via contextAuthError
  const [viewMode, setViewMode] = useState('simple'); // 'simple', 'list', or 'grid'
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [playingComercial, setPlayingComercial] = useState(null);
  const [sharingComercial, setSharingComercial] = useState(null);
  const [encodingComercial, setEncodingComercial] = useState(null);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  
  // Advanced search filters
  const [filters, setFilters] = useState({
    cliente: '',
    agencia: '',
    producto: '',
    version: '',
    duracion: '',
    formato: '',
    fecha: '',
    nombre: ''
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Processing status
  const [processingVideos, setProcessingVideos] = useState([]);
  
  // Ref to prevent multiple simultaneous fetches
  const fetchingRef = useRef(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      fetchCurrentUser();
      fetchRepositorios();
    }
  }, []);

  useEffect(() => {
    if (mountedRef.current && !fetchingRef.current) {
      const timer = setTimeout(() => {
        fetchComerciales();
        fetchDirectorios();
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [selectedRepo, selectedModulo, uploadCount]);

  // Polling para actualizar estado de videos en proceso
  useEffect(() => {
    const processing = comerciales.filter(c => 
      c.estado_transcodificacion === 'PROCESANDO' || 
      c.estado_transcodificacion === 'PENDIENTE'
    );
    
    if (processing.length > 0) {
      // Refrescar cada 5 segundos si hay videos procesando
      const interval = setInterval(() => {
        fetchComerciales();
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [comerciales]);

  const fetchCurrentUser = () => {
    // console.info('📡 Fetching current user...');
    axios.get('http://localhost:8000/api/auth/me/')
      .then(res => {
        setCurrentUser(res.data);
      })
      .catch(err => {
  console.error('Error loading user:', err);
        setCurrentUser(null);
      });
  };

  const fetchRepositorios = () => {
    axios.get('http://localhost:8000/api/repositorios/')
      .then(res => {
        const activos = res.data.filter(r => r.activo);
        const ordenados = activos.sort((a, b) => a.nombre.localeCompare(b.nombre));
        setRepositorios(ordenados);
      })
      .catch(err => {
  console.error('Error loading repositories:', err);
      });
  };

  const fetchComerciales = () => {
    if (!selectedModulo) {
      setComerciales([]);
      setLoading(false);
      return;
    }
    
    if (fetchingRef.current) {
      return;
    }
    
    fetchingRef.current = true;
    setLoading(true);
  // console.info('📡 Fetching broadcasts...');
    let url = 'http://localhost:8000/api/broadcasts/?';
    const params = [];
    
    if (selectedRepo) {
      params.push(`repositorio=${selectedRepo}`);
    }
    
    if (selectedModulo) {
      params.push(`modulo=${selectedModulo}`);
    }
    
    url += params.join('&');
    
    axios.get(url)
      .then(res => {
        setComerciales(res.data);
        setLoading(false);
        fetchingRef.current = false;
  // console.info('✅ Broadcasts loaded');
      })
      .catch(err => {
  console.error('❌ Error loading broadcasts:', err);
        setLoading(false);
        fetchingRef.current = false;
        // Si es 403, redirigir (el AuthContext ya maneja el error)
        if (err.response && err.response.status === 403) {
          // console.warn('🚫 403 detected - redirecting to login');
          setTimeout(() => {
            window.location.href = '/login';
          }, 100);
        }
      });
  };

  const fetchDirectorios = () => {
    if (!selectedRepo || !selectedModulo) {
      setDirectorios([]);
      return;
    }
    
    let url = `http://localhost:8000/api/directorios/?repositorio=${selectedRepo}`;
    if (selectedModulo) {
      url += `&modulo=${selectedModulo}`;
    }
    
    axios.get(url)
      .then(res => {
        setDirectorios(res.data);
      })
      .catch(err => {
        console.error('Error al cargar directorios:', err);
        setDirectorios([]);
      });
  };

  const handleUploadSuccess = () => {
    setUploadCount(prev => prev + 1);
    setShowUploadForm(false);
  };

  const handleEditDirectory = (directorio) => {
    setEditingDirectory(directorio);
    setShowDirectoryForm(true);
  };

  const handleDeleteDirectory = (directorioId) => {
    if (window.confirm('Are you sure you want to delete this directory? Files inside will remain but be moved out of the directory.')) {
      axios.delete(`http://localhost:8000/api/directorios/${directorioId}/`)
        .then(() => {
          fetchDirectorios();
          fetchComerciales();
          if (selectedDirectory === directorioId) {
            setSelectedDirectory(null);
          }
        })
        .catch(err => {
          console.error('Error al eliminar directorio:', err);
          alert('Error al eliminar el directorio. Puede que contenga subdirectorios.');
        });
    }
  };

  const handleDelete = (comercialId) => {
    if (window.confirm('Are you sure you want to delete this broadcast?')) {
      axios.delete(`http://localhost:8000/api/broadcasts/${comercialId}/`)
        .then(() => {
          fetchComerciales();
          fetchDirectorios();
        })
        .catch(err => {
          console.error('Error al eliminar:', err);
          if (err.response?.status === 403) {
            alert('You do not have permission to delete this broadcast');
          } else {
            alert(`Error deleting broadcast: ${err.response?.data?.detail || err.message}`);
          }
        });
    }
  };

  const handleDownload = async (comercial, type = 'h264') => {
    // type puede ser 'h264', 'h265' o 'original'
    let url, filename;
    
    if (type === 'original') {
      // archivo_original ya viene con /media/ incluido desde el serializer
      const archivoUrl = comercial.archivo_original.startsWith('http') 
        ? comercial.archivo_original 
        : `http://localhost:8000${comercial.archivo_original.startsWith('/') ? '' : '/'}${comercial.archivo_original}`;
      url = archivoUrl;
      
      // Construir nombre: CLAVE_NOMBREORIGINAL.ext
      const clave = comercial.repositorio_clave || comercial.repositorio_folio || 'XXX';
      const nombreOriginal = comercial.nombre_original 
        ? comercial.nombre_original.replace(/\.[^/.]+$/, '') // Remover extensión del original
        : (comercial.pizarra?.producto || 'comercial');
      const extension = comercial.archivo_original.substring(comercial.archivo_original.lastIndexOf('.'));
      
      filename = `${clave}_${nombreOriginal}${extension}`;
    } else if (type === 'h264') {
      url = `http://localhost:8000/media/${comercial.ruta_h264}`;
      filename = `${comercial.pizarra?.producto || 'comercial'}_h264.mp4`;
    } else if (type === 'h265' || type === 'proxy') {
      url = `http://localhost:8000/media/${comercial.ruta_proxy}`;
      filename = `${comercial.pizarra?.producto || 'comercial'}_h265.mp4`;
    }
    
    try {
      // Descargar usando fetch y blob para mayor compatibilidad
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      
      console.log(`✅ Descarga iniciada: ${filename}`);
    } catch (error) {
      console.error('Error al descargar:', error);
      alert('⚠️ Error al descargar el archivo. Por favor intenta de nuevo.');
    }
  };

  const handlePlay = (comercial) => {
    setPlayingComercial(comercial);
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

  // Format file sizes (bytes -> human readable)
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    if (!bytes && bytes !== 0) return '-';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const value = bytes / Math.pow(k, i);
    const fixed = i === 0 ? 0 : 2;
    return `${value.toFixed(fixed)} ${sizes[i]}`;
  };

  // Helper para obtener módulos del repositorio seleccionado
  const getSelectedRepoModulos = () => {
    if (!selectedRepo) return [];
    const repo = repositorios.find(r => r.id === selectedRepo);
    return repo?.modulos_detalle || [];
  };

  // Helper para obtener icono del módulo
  const getModuloIcon = (tipo) => {
    const icons = {
      storage: '💾',
      reel: '🎬',
      broadcast: '📡',
      audio: '🎵',
      images: '🖼️'
    };
    return icons[tipo] || '📦';
  };

  // Helper para obtener color del módulo
  const getModuloColor = (tipo, isSelected) => {
    const colors = {
      storage: isSelected ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800 hover:bg-blue-200',
      reel: isSelected ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-800 hover:bg-purple-200',
      broadcast: isSelected ? 'bg-red-600 text-white' : 'bg-red-100 text-red-800 hover:bg-red-200',
      audio: isSelected ? 'bg-green-600 text-white' : 'bg-green-100 text-green-800 hover:bg-green-200',
      images: isSelected ? 'bg-yellow-600 text-white' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
    };
    return colors[tipo] || (isSelected ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200');
  };

  // Filtrado de búsqueda avanzada
  const filteredComerciales = comerciales.filter(comercial => {
    // Búsqueda rápida (barra superior)
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const cliente = comercial.pizarra?.cliente?.toLowerCase() || '';
      const agencia = comercial.pizarra?.agencia?.toLowerCase() || '';
      const producto = comercial.pizarra?.producto?.toLowerCase() || '';
      const version = comercial.pizarra?.version?.toLowerCase() || '';
      
      const matchesQuickSearch = cliente.includes(search) || 
                                 agencia.includes(search) || 
                                 producto.includes(search) || 
                                 version.includes(search);
      
      if (!matchesQuickSearch) return false;
    }
    
    // Filtros avanzados
    if (filters.cliente && !(comercial.pizarra?.cliente?.toLowerCase() || '').includes(filters.cliente.toLowerCase())) {
      return false;
    }
    if (filters.agencia && !(comercial.pizarra?.agencia?.toLowerCase() || '').includes(filters.agencia.toLowerCase())) {
      return false;
    }
    if (filters.producto && !(comercial.pizarra?.producto?.toLowerCase() || '').includes(filters.producto.toLowerCase())) {
      return false;
    }
    if (filters.version && !(comercial.pizarra?.version?.toLowerCase() || '').includes(filters.version.toLowerCase())) {
      return false;
    }
    if (filters.duracion && !(comercial.pizarra?.duracion?.toLowerCase() || '').includes(filters.duracion.toLowerCase())) {
      return false;
    }
    if (filters.formato && !(comercial.pizarra?.formato?.toLowerCase() || '').includes(filters.formato.toLowerCase())) {
      return false;
    }
    if (filters.fecha && comercial.fecha_subida) {
      const comercialDate = new Date(comercial.fecha_subida).toISOString().split('T')[0];
      if (!comercialDate.includes(filters.fecha)) {
        return false;
      }
    }
    if (filters.nombre && !(comercial.pizarra?.producto?.toLowerCase() || '').includes(filters.nombre.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  // Filtrar directorios por directorio padre si hay uno seleccionado
  const filteredDirectorios = selectedDirectory === null 
    ? directorios.filter(d => !d.parent) // Solo directorios raíz si no hay selección
    : directorios.filter(d => d.parent === selectedDirectory);

  // Filtrar comerciales por directorio si hay uno seleccionado
  const comercialesFiltrados = selectedDirectory 
    ? filteredComerciales.filter(c => c.directorio === selectedDirectory)
    : filteredComerciales.filter(c => !c.directorio); // Solo comerciales sin directorio si no hay selección

  // Cálculos de paginación - Combinar directorios y comerciales
  const totalItems = filteredDirectorios.length + comercialesFiltrados.length;
  const totalFiles = filteredComerciales.length;
  const stanbyFiles = filteredComerciales.filter(c => c.estado_transcodificacion === 'COMPLETADO').length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  
  // Combinar directorios y comerciales para mostrar (directorios primero)
  const combinedItems = [
    ...filteredDirectorios.map(d => ({ type: 'directory', data: d })),
    ...comercialesFiltrados.map(c => ({ type: 'comercial', data: c }))
  ];
  const displayItems = combinedItems.slice(startIndex, endIndex);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters, selectedRepo]);

  return (
    <div className="flex h-full w-full overflow-hidden bg-gray-100">
      {/* Modal de Upload - Nuevo MultiFileUploader */}
      {showUploadForm && selectedRepo && (
        <MultiFileUploader
          repositorioId={selectedRepo}
          repositorioNombre={repositorios.find(r => r.id === selectedRepo)?.nombre}
          directorioId={selectedDirectory}
          directorioNombre={selectedDirectory ? directorios.find(d => d.id === selectedDirectory)?.nombre : null}
          moduloId={selectedModulo}
          moduloInfo={selectedModulo ? getSelectedRepoModulos().find(m => m.id === selectedModulo) : null}
          onClose={() => setShowUploadForm(false)}
          onSuccess={handleUploadSuccess}
        />
      )}

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

      {/* Modal de Reproducción */}
      {playingComercial && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex justify-center items-center z-50 p-4">
          <div className="w-full max-w-6xl">
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-6 py-4 flex justify-between items-center rounded-t-lg">
              <h2 className="text-xl font-semibold">
                {playingComercial.pizarra?.producto || 'REPRODUCIENDO COMERCIAL'}
              </h2>
              <button 
                onClick={() => setPlayingComercial(null)}
                className="text-white hover:text-gray-200 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="bg-black">
              <video 
                className="w-full"
                controls
                autoPlay
                src={`http://localhost:8000/media/${playingComercial.ruta_proxy}`}
              >
                Tu navegador no soporta el elemento de video.
              </video>
            </div>
            <div className="bg-white px-6 py-4 rounded-b-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold">Cliente:</span> {playingComercial.pizarra?.cliente || '-'}
                </div>
                <div>
                  <span className="font-semibold">Agencia:</span> {playingComercial.pizarra?.agencia || '-'}
                </div>
                <div>
                  <span className="font-semibold">Producto:</span> {playingComercial.pizarra?.producto || '-'}
                </div>
                <div>
                  <span className="font-semibold">Versión:</span> {playingComercial.pizarra?.version || '-'}
                </div>
                <div>
                  <span className="font-semibold">Duración:</span> {playingComercial.pizarra?.duracion || '-'}
                </div>
                <div>
                  <span className="font-semibold">Fecha:</span> {new Date(playingComercial.fecha_subida).toLocaleDateString('es-MX')}
                </div>
              </div>
              <div className="mt-4 flex space-x-2">
                <button
                  onClick={() => handleDownload(playingComercial, 'proxy')}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold"
                >
                  Descargar Proxy (H.264)
                </button>
                <button
                  onClick={() => handleDownload(playingComercial, 'original')}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold"
                >
                  Descargar Original
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Compacto */}
      <div className="w-60 bg-gray-800 text-white flex flex-col shadow-lg overflow-y-auto">
        
        {/* Repository Selector */}
        <div className="p-2 border-b border-gray-700">
          <label className="block text-xs font-semibold text-gray-400 mb-1">
            {t('sidebar.repository')}
          </label>
          <select
            value={selectedRepo || ''}
            onChange={(e) => {
              const value = e.target.value === '' ? null : parseInt(e.target.value);
              setSelectedRepo(value);
              setSelectedModulo(null);
              setSelectedDirectory(null);
              setCurrentPage(1);
            }}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">{t('sidebar.allRepositories')}</option>
            {repositorios.map(repo => (
              <option key={repo.id} value={repo.id}>
                {repo.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Modules Section */}
        {selectedRepo && getSelectedRepoModulos().length > 0 && (
          <div className="p-2 border-b border-gray-700">
            <div className="text-sm font-semibold text-gray-400 mb-3">
              {t('sidebar.modules')}
            </div>
            <div className="space-y-3">
              {(() => {
                const moduleOrder = ['broadcast', 'audio', 'images', 'storage', 'reel'];
                const sortedModules = getSelectedRepoModulos().sort((a, b) => 
                  moduleOrder.indexOf(a.tipo.toLowerCase()) - moduleOrder.indexOf(b.tipo.toLowerCase())
                );
                return sortedModules.map(modulo => (
                  <button
                    key={modulo.id}
                    onClick={() => {
                      setSelectedModulo(selectedModulo === modulo.id ? null : modulo.id);
                      setCurrentPage(1);
                    }}
                    className={`w-full text-left px-4 py-4 rounded text-base font-medium transition-all ${
                      selectedModulo === modulo.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <span className="truncate">{modulo.nombre}</span>
                  </button>
                ));
              })()}
            </div>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1"></div>

        <div className="p-2 border-t border-gray-700 space-y-2">
          <button
            onClick={() => setShowDirectoryForm(true)}
            disabled={!selectedRepo || !selectedModulo}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-3 py-4 rounded text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            title={!selectedModulo ? (language === 'en' ? 'Select a module first' : 'Selecciona un módulo primero') : (language === 'en' ? 'Create directory' : 'Crear directorio')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {language === 'en' ? 'Directory' : 'Directorio'}
          </button>
          
          <button
            onClick={() => setShowUploadForm(true)}
            disabled={!selectedRepo || !selectedModulo}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-3 py-4 rounded text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            {t('buttons.upload')}
          </button>
        </div>
      </div>

      {/* Main Content Area with Search Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Advanced Search full-height vertical tab */}
        <button
          onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
          className={`bg-blue-800 text-white hover:bg-blue-700 transition-all duration-300 shadow-lg border-r-2 border-blue-900 flex flex-col items-center justify-center space-y-2 px-1 z-10 self-stretch ${
            showAdvancedSearch ? '' : 'hover:w-14'
          }`}
          title={t('nav.search')}
          style={{
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            width: showAdvancedSearch ? '0px' : '32px',
            minWidth: showAdvancedSearch ? '0px' : '32px',
            height: '100%'
          }}
        >
          <span className="text-sm font-semibold">{t('nav.search')}</span>
        </button>

        {/* Panel de Búsqueda Avanzada - Sidebar Derecho */}
        <div className={`bg-blue-900 text-white shadow-2xl transition-all duration-300 ease-in-out border-r-2 border-blue-950 ${
          showAdvancedSearch ? 'w-80' : 'w-0'
        } overflow-hidden`}>
          {showAdvancedSearch && (
            <div className="h-full flex flex-col p-6">
              {/* Header del panel */}
              <div className="mb-6 pb-4 border-b-2 border-blue-800">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold flex items-center space-x-2">
                    <span>{t('nav.search')}</span>
                  </h3>
                  <button
                    onClick={() => setShowAdvancedSearch(false)}
                    className="text-white hover:text-red-400 transition-colors text-xl font-bold"
                  >
                    ×
                  </button>
                </div>
                <p className="text-xs text-blue-300">{t('search.advancedFilters')}</p>
              </div>

              {/* Formulario de filtros */}
              <div className="flex-1 overflow-y-auto space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">{t('filters.client')}</label>
                  <input
                    type="text"
                    placeholder={t('filters.clientPlaceholder')}
                    value={filters.cliente}
                    onChange={(e) => setFilters({...filters, cliente: e.target.value})}
                    className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">{t('filters.agency')}</label>
                  <input
                    type="text"
                    placeholder={t('filters.agencyPlaceholder')}
                    value={filters.agencia}
                    onChange={(e) => setFilters({...filters, agencia: e.target.value})}
                    className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">{t('filters.product')}</label>
                  <input
                    type="text"
                    placeholder={t('filters.productPlaceholder')}
                    value={filters.producto}
                    onChange={(e) => setFilters({...filters, producto: e.target.value})}
                    className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">{t('filters.version')}</label>
                  <input
                    type="text"
                    placeholder={t('filters.versionPlaceholder')}
                    value={filters.version}
                    onChange={(e) => setFilters({...filters, version: e.target.value})}
                    className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">{t('filters.time')}</label>
                  <input
                    type="text"
                    placeholder={t('filters.timePlaceholder')}
                    value={filters.duracion}
                    onChange={(e) => setFilters({...filters, duracion: e.target.value})}
                    className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">{t('filters.format')}</label>
                  <input
                    type="text"
                    placeholder={t('filters.formatPlaceholder')}
                    value={filters.formato}
                    onChange={(e) => setFilters({...filters, formato: e.target.value})}
                    className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">{t('filters.date')} <span className="text-xs text-blue-300">{t('filters.dateHint')}</span></label>
                  <input
                    type="date"
                    value={filters.fecha}
                    onChange={(e) => setFilters({...filters, fecha: e.target.value})}
                    className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">{t('filters.fileName')}</label>
                  <input
                    type="text"
                    placeholder={t('filters.fileNamePlaceholder')}
                    value={filters.nombre}
                    onChange={(e) => setFilters({...filters, nombre: e.target.value})}
                    className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>

              {/* Botones de acción */}
              <div className="mt-6 pt-4 border-t border-blue-700 space-y-3">
                <button
                  onClick={() => setFilters({
                    cliente: '',
                    agencia: '',
                    producto: '',
                    version: '',
                    duracion: '',
                    formato: '',
                    fecha: '',
                    nombre: ''
                  })}
                  className="w-full px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded font-semibold transition-colors"
                >
                  {t('search.clearFilters')}
                </button>
                <button
                  onClick={() => setShowAdvancedSearch(false)}
                  className="w-full px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded font-semibold transition-colors"
                >
                  {t('search.search')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Content Area Wrapper */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header Bar */}
        <div className="bg-blue-800 text-white px-6 py-3 flex justify-between items-center border-b-2 border-blue-900">
          <div className="flex items-center space-x-6">
            <div>
              <span className="text-sm font-semibold">{t('nav.home')}</span>
              <span className="mx-2">›</span>
              <span className="text-sm">
                {selectedRepo 
                  ? repositorios.find(r => r.id === selectedRepo)?.nombre || 'COMERCIALES'
                  : t('repository.selected').toUpperCase()}
              </span>
              {selectedModulo && (
                <>
                  <span className="mx-2">›</span>
                  <span className="text-sm font-bold">
                    {getSelectedRepoModulos().find(m => m.id === selectedModulo)?.nombre.toUpperCase()}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="flex items-center space-x-4">
                <div>
                  <span className="text-2xl font-bold">{stanbyFiles}</span>
                  <p className="text-xs">{t('stats.standby')}</p>
                </div>
                <div>
                  <span className="text-2xl font-bold">{totalFiles}</span>
                  <p className="text-xs">{t('stats.total')}</p>
                </div>
              </div>
            </div>
            {/* Logout button removed from header */}
          </div>
        </div>

        {/* View Mode Selector */}
        <div className="bg-white px-6 py-3 border-b">
          <div className="flex items-center space-x-4 mb-2">
            <div className="flex space-x-2">
              {/* View 1: Simple */}
              <button
                onClick={() => setViewMode('simple')}
                className={`px-4 py-2 rounded flex items-center space-x-2 font-medium transition-colors ${
                  viewMode === 'simple' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                title="Simple view"
              >
                <span>📄</span>
                <span className="text-sm">Simple</span>
              </button>
              
              {/* View 2: Full list */}
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded flex items-center space-x-2 font-medium transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                title="Full list view"
              >
                <span>📋</span>
                <span className="text-sm">Full</span>
              </button>
              
              {/* View 3: Grid with Thumbnails */}
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2 rounded flex items-center space-x-2 font-medium transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                title="Grid view with Thumbnails"
              >
                <span className="text-sm">Thumbnails</span>
              </button>
            </div>
          </div>

          {/* Breadcrumb Navigation */}
          {selectedRepo && selectedDirectory && (
            <div className="bg-gray-50 px-6 py-2 border-b flex items-center space-x-2 text-sm">
              <button 
                onClick={() => {
                  setSelectedDirectory(null);
                  setCurrentPage(1);
                }}
                className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>{t('directories.back') || 'Volver'}</span>
              </button>
              <span className="text-gray-400">/</span>
              <span className="text-gray-600">{repositorios.find(r => r.id === selectedRepo)?.nombre}</span>
              <span className="text-gray-400">/</span>
              <span className="font-semibold text-gray-900">
                📁 {directorios.find(d => d.id === selectedDirectory)?.nombre}
              </span>
            </div>
          )}
        </div>

          {/* Content Area */}
          <div className="flex-1 overflow-auto bg-white">
          {!selectedRepo ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <svg className="w-24 h-24 mx-auto mb-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <h3 className="text-2xl font-bold text-gray-700 mb-2">{t('messages.selectRepository')}</h3>
                <p className="text-gray-500 mb-6">{t('repository.selectPrompt')}</p>
                <div className="inline-flex items-center px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm">{t('repository.selectHint')}</span>
                </div>
              </div>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600">{t('messages.loading')}</p>
              </div>
            </div>
          ) : displayItems.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500 max-w-lg">
                {selectedModulo ? (
                  <>
                    <h3 className="text-2xl font-bold text-gray-700 mb-4">
                      Sección {getSelectedRepoModulos().find(m => m.id === selectedModulo)?.nombre}
                    </h3>
                    <p className="text-gray-500 mb-4">
                      {getSelectedRepoModulos().find(m => m.id === selectedModulo)?.descripcion}
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <p className="text-sm text-blue-700 font-medium mb-2">Formatos permitidos:</p>
                      {getSelectedRepoModulos().find(m => m.id === selectedModulo)?.formatos_permitidos?.length > 0 ? (
                        <div className="flex flex-wrap gap-2 justify-center">
                          {getSelectedRepoModulos().find(m => m.id === selectedModulo)?.formatos_permitidos.map((formato, idx) => (
                            <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-mono">
                              {formato}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-blue-600">Sin restricciones - Todos los formatos</p>
                      )}
                    </div>
                    <button
                      onClick={() => setShowUploadForm(true)}
                      className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 font-semibold shadow-lg"
                      disabled={!selectedModulo}
                    >
                      Subir Material a {getSelectedRepoModulos().find(m => m.id === selectedModulo)?.nombre}
                    </button>
                  </>
                ) : (
                  <>
                    <p>{searchTerm ? t('messages.noResults') : t('messages.noCommercials')}</p>
                    {!searchTerm && getSelectedRepoModulos().length > 0 && !selectedModulo && (
                      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800 mb-2 font-medium">
                          Selecciona un módulo en el menú lateral para ver o subir archivos
                        </p>
                      </div>
                    )}
                    {!searchTerm && getSelectedRepoModulos().length === 0 && (
                      <button
                        onClick={() => setShowUploadForm(true)}
                        className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
                      >
                        {t('messages.uploadFirst')}
                      </button>
                    )}
                  </>
                )}

              </div>
            </div>
          ) : viewMode === 'simple' ? (
            /* View 1: SIMPLE - Thumbnail, original name, key, file size, upload date, status */
            <div className="p-6">
              <table className="w-full">
                <thead className="bg-gray-100 border-b-2 border-gray-300">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-32">THUMBNAIL</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">ORIGINAL NAME</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-32">KEY</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-28">FILE SIZE</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">UPLOAD DATE</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-40">STATUS</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-32">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {displayItems.map((item, index) => 
                    item.type === 'directory' ? (
                      // Renderizar Directorio como fila
                      <tr 
                        key={`dir-${item.data.id}`} 
                        className="hover:bg-purple-50 transition-colors bg-purple-25"
                      >
                        <td className="px-4 py-3" colSpan="6">
                          <div 
                            className="flex items-center space-x-3 cursor-pointer"
                            onClick={() => {
                              setSelectedDirectory(item.data.id);
                              setCurrentPage(1);
                            }}
                          >
                            {/* Folder icon */}
                            <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                            </svg>
                            {/* Directory name */}
                            <div>
                              <span className="text-base font-semibold text-gray-900">{item.data.nombre}</span>
                              <span className="ml-2 text-sm text-gray-500">({item.data.broadcasts_count || 0} files)</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            {/* Edit button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditDirectory(item.data);
                              }}
                              className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors font-medium"
                              title="Edit directory"
                            >
                              Edit
                            </button>
                            {/* Delete button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteDirectory(item.data.id);
                              }}
                              className="px-3 py-1.5 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors font-medium"
                              title="Delete directory"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      // Render simple Broadcast row
                      <tr key={`com-${item.data.id}`} className="hover:bg-blue-50 transition-colors">
                        {/* Thumbnail */}
                        <td className="px-4 py-3">
                          <div className="relative w-24 h-14 bg-gray-900 rounded overflow-hidden shadow-sm">
                            {item.data.thumbnail_url ? (
                              <img 
                                src={item.data.thumbnail_url} 
                                alt="Thumbnail" 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.parentNode.querySelector('svg').style.display = 'block';
                                }}
                              />
                            ) : null}
                            <svg 
                              className={`absolute inset-0 m-auto w-8 h-8 text-gray-600 ${item.data.thumbnail_url ? 'hidden' : 'block'}`}
                              fill="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path d="M9.4 10.5l4.77-8.26C13.47 2.09 12.75 2 12 2c-2.4 0-4.6.85-6.32 2.25l3.66 6.35.06-.1zM21.54 9c-.92-2.92-3.15-5.26-6-6.34L11.88 9h9.66zm.26 1h-7.49l.29.5 4.76 8.25C21 16.97 22 14.61 22 12c0-.69-.07-1.35-.2-2zM8.54 12l-3.9-6.75C3.01 7.03 2 9.39 2 12c0 .69.07 1.35.2 2h7.49l-1.15-2zm-6.08 3c.92 2.92 3.15 5.26 6 6.34L12.12 15H2.46zm11.27 0l-3.9 6.76c.7.15 1.42.24 2.17.24 2.4 0 4.6-.85 6.32-2.25l-3.66-6.35-.93 1.6z"/>
                            </svg>
                          </div>
                        </td>
                        
                        {/* Nombre Original */}
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-900">
                              {item.data.nombre_original || item.data.pizarra?.producto || 'N/A'}
                            </span>
                          </div>
                        </td>
                        
                        {/* Clave (UUID corto) */}
                        <td className="px-4 py-3">
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-700">
                            {item.data.id.split('-')[0]}
                          </code>
                        </td>
                        
                        {/* File Size */}
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {formatFileSize(item.data.file_size)}
                        </td>
                        
                        {/* Fecha de Carga */}
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {(() => {
                            const date = new Date(item.data.fecha_subida);
                            const dateStr = date.toLocaleDateString('es-MX', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            });
                            const timeStr = date.toLocaleTimeString('es-MX', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            }).toLowerCase();
                            return `${dateStr}, ${timeStr}`;
                          })()}
                        </td>
                        
                        {/* Status */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            item.data.estado_transcodificacion === 'COMPLETADO' ? 'bg-green-100 text-green-800' :
                            item.data.estado_transcodificacion === 'PROCESANDO' ? 'bg-yellow-100 text-yellow-800' :
                            item.data.estado_transcodificacion === 'PENDIENTE' ? 'bg-blue-100 text-blue-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {item.data.estado_transcodificacion === 'PROCESANDO' && (
                              <svg className="animate-spin -ml-1 mr-2 h-3 w-3" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            )}
                            {item.data.estado_transcodificacion}
                          </span>
                        </td>
                        
                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setEditingComercial(item.data)}
                              className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors font-medium"
                              title="Editar"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDelete(item.data.id)}
                              className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors font-medium"
                              title="Eliminar"
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          ) : viewMode === 'list' ? (
            /* Vista 2: LISTA COMPLETA - Todos los campos */
            <div className="p-6">
              <table className="w-full">
                <thead className="bg-gray-100 border-b-2 border-gray-300">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-32">THUMBNAIL</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">CLIENT</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">AGENCY</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">PRODUCT</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">VERSION</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">TIME</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">TYPE</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">DATE</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {displayItems.map((item, index) => 
                    item.type === 'directory' ? (
                      // Renderizar Directorio como fila
                      <tr 
                        key={`dir-${item.data.id}`} 
                        className="hover:bg-purple-50 transition-colors bg-purple-25"
                      >
                        <td className="px-4 py-3" colSpan="8">
                          <div 
                            className="flex items-center space-x-3 cursor-pointer"
                            onClick={() => {
                              setSelectedDirectory(item.data.id);
                              setCurrentPage(1);
                            }}
                          >
                            {/* Icono de carpeta */}
                            <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                            </svg>
                            {/* Nombre del directorio */}
                            <div>
                              <span className="text-base font-semibold text-gray-900">{item.data.nombre}</span>
                              <span className="ml-2 text-sm text-gray-500">({item.data.comerciales_count || 0} {t('repository.count') || 'archivos'})</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            {/* Botón Editar */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditDirectory(item.data);
                              }}
                              className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors font-medium"
                              title="Editar directorio"
                            >
                              Editar
                            </button>
                            {/* Botón Eliminar */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteDirectory(item.data.id);
                              }}
                              className="px-3 py-1.5 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors font-medium"
                              title="Eliminar directorio"
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      // Renderizar Comercial como fila normal
                      <tr key={`com-${item.data.id}`} className="hover:bg-blue-50 transition-colors">
                        {/* Thumbnail */}
                        <td className="px-4 py-3">
                        <div className="relative w-24 h-14 bg-gray-900 rounded overflow-hidden group cursor-pointer" onClick={() => item.data.estado_transcodificacion === 'COMPLETADO' && handlePlay(item.data)}>
                          {item.data.thumbnail_url ? (
                            <img 
                              src={item.data.thumbnail_url}
                              alt={item.data.pizarra?.producto || 'Thumbnail'}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-white" style={{ display: item.data.thumbnail_url ? 'none' : 'flex' }}>
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </div>
                          {item.data.estado_transcodificacion === 'COMPLETADO' && (
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                              <svg className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                              </svg>
                            </div>
                          )}
                        </div>
                      </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {item.data.pizarra?.cliente || item.data.repositorio_nombre}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {item.data.pizarra?.agencia || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {item.data.pizarra?.producto || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {item.data.pizarra?.version || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {item.data.pizarra?.duracion || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 text-xs rounded-full ${getEstadoBadge(item.data.estado_transcodificacion)}`}>
                            {item.data.estado_transcodificacion}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(item.data.fecha_subida).toLocaleDateString('es-MX')}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex space-x-1">
                            <button
                              onClick={() => setEditingComercial(item.data)}
                              className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                              title="Editar"
                            >
                              Editar
                            </button>
                            {item.data.estado_transcodificacion === 'COMPLETADO' && (
                              <button 
                                onClick={() => handlePlay(item.data)}
                                className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors" 
                                title="Reproducir"
                              >
                                Play
                              </button>
                            )}
                            <button 
                              onClick={() => setSharingComercial(item.data)}
                              className="px-2 py-1 text-xs bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors" 
                              title="Compartir"
                            >
                              Share
                            </button>
                            {item.data.estado_transcodificacion === 'COMPLETADO' && (
                              <button 
                                onClick={() => setEncodingComercial(item.data)}
                                className="px-2 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors" 
                                title="Codificar"
                              >
                                Encode
                              </button>
                            )}
                            {item.data.estado_transcodificacion === 'COMPLETADO' && item.data.ruta_h264 && (
                              <button 
                                onClick={() => handleDownload(item.data, 'h264')}
                                className="px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors" 
                                title="Descargar H.264"
                              >
                                H.264
                              </button>
                            )}
                            <button 
                              onClick={() => handleDownload(item.data, 'original')}
                              className="px-2 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors" 
                              title="Descargar Original"
                            >
                              Download
                            </button>
                            <button
                              onClick={() => handleDelete(item.data.id)}
                              className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                              title="Eliminar"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            // Vista Grid con Thumbnails
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {displayItems.filter(item => item.type === 'comercial').map(item => {
                  const comercial = item.data;
                  return (
                  <div 
                    key={comercial.id}
                    className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-xl transition-all duration-200 overflow-hidden group"
                  >
                    {/* Thumbnail */}
                    <div className="relative bg-gray-900 aspect-video flex items-center justify-center">
                      {comercial.thumbnail_url ? (
                        <img 
                          src={comercial.thumbnail_url}
                          alt={comercial.pizarra?.producto || 'Thumbnail'}
                          className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setEditingComercial(comercial)}
                        />
                      ) : comercial.estado_transcodificacion === 'COMPLETADO' && comercial.ruta_proxy ? (
                        <video 
                          className="w-full h-full object-cover"
                          preload="metadata"
                          onMouseEnter={(e) => e.target.play()}
                          onMouseLeave={(e) => {
                            e.target.pause();
                            e.target.currentTime = 0;
                          }}
                        >
                          <source src={`http://localhost:8000${comercial.ruta_proxy}`} type="video/mp4" />
                        </video>
                      ) : (
                        <div className="text-gray-500 text-center p-4">
                          <div className="text-3xl mb-2">🎬</div>
                          <div className="text-xs">
                            {comercial.estado_transcodificacion === 'PROCESANDO' ? 'Processing...' : 
                             comercial.estado_transcodificacion === 'PENDIENTE' ? 'In queue...' : 
                             'Error'}
                          </div>
                        </div>
                      )}
                      
                      {/* Badge de estado */}
                      <div className="absolute top-2 right-2">
                        <span className={`px-2 py-1 text-xs rounded ${getEstadoBadge(comercial.estado_transcodificacion)}`}>
                          {comercial.estado_transcodificacion}
                        </span>
                      </div>

                      {/* Duración */}
                      {comercial.pizarra?.duracion && (
                        <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                          {comercial.pizarra.duracion}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      <h3 className="font-semibold text-sm text-gray-900 truncate mb-1">
                        {comercial.pizarra?.producto || 'Sin título'}
                      </h3>
                      <p className="text-xs text-gray-600 truncate mb-1">
                        {comercial.pizarra?.cliente || comercial.repositorio_nombre}
                      </p>
                      <p className="text-xs text-gray-500 truncate mb-2">
                        {comercial.pizarra?.agencia || '-'}
                      </p>
                      
                      {/* Actions */}
                      <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setEditingComercial(comercial)}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                            title="Editar"
                          >
                            ✏️
                          </button>
                          {comercial.estado_transcodificacion === 'COMPLETADO' && (
                            <button 
                              onClick={() => handlePlay(comercial)}
                              className="text-green-600 hover:text-green-800 text-sm" 
                              title="Reproducir"
                            >
                              ▶️
                            </button>
                          )}
                          <button 
                            onClick={() => setSharingComercial(comercial)}
                            className="text-blue-500 hover:text-blue-700 text-sm" 
                            title="Compartir"
                          >
                            🔗
                          </button>
                          {comercial.estado_transcodificacion === 'COMPLETADO' && (
                            <button 
                              onClick={() => setEncodingComercial(comercial)}
                              className="text-yellow-600 hover:text-yellow-800 text-sm" 
                              title="Codificar"
                            >
                              🎬
                            </button>
                          )}
                          {comercial.estado_transcodificacion === 'COMPLETADO' && comercial.ruta_h264 && (
                            <button 
                              onClick={() => handleDownload(comercial, 'h264')}
                              className="text-orange-600 hover:text-orange-800 text-sm" 
                              title="Descargar H.264"
                            >
                              📦
                            </button>
                          )}
                          <button 
                            onClick={() => handleDownload(comercial, 'original')}
                            className="text-purple-600 hover:text-purple-800 text-sm" 
                            title="Descargar Original"
                          >
                            ⬇️
                          </button>
                        </div>
                        <button
                          onClick={() => handleDelete(comercial.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      </div>
                      
                      {/* Date */}
                      <div className="text-xs text-gray-400 mt-2">
                        {new Date(comercial.fecha_subida).toLocaleDateString('es-MX')}
                      </div>
                    </div>
                  </div>
                );
                })}
              </div>
            </div>
          )}

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="bg-white border-t px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {t('pagination.showing')} <span className="font-semibold">{startIndex + 1}</span> {t('pagination.to')}{' '}
                  <span className="font-semibold">{Math.min(endIndex, totalFiles)}</span> {t('pagination.of')}{' '}
                  <span className="font-semibold">{totalFiles}</span> {t('pagination.results')}
                </div>
                
                <div className="flex items-center space-x-2">
                  {/* Botón Primera Página */}
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 rounded ${
                      currentPage === 1
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    «
                  </button>

                  {/* Botón Anterior */}
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 rounded ${
                      currentPage === 1
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    ‹
                  </button>

                  {/* Números de página */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1 rounded font-semibold ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  {/* Botón Siguiente */}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1 rounded ${
                      currentPage === totalPages
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    ›
                  </button>

                  {/* Botón Última Página */}
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1 rounded ${
                      currentPage === totalPages
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    »
                  </button>
                </div>

                <div className="text-sm text-gray-600">
                  {t('pagination.page')} <span className="font-semibold">{currentPage}</span> {t('pagination.of')}{' '}
                  <span className="font-semibold">{totalPages}</span>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {sharingComercial && (
        <ShareModal
          comercial={sharingComercial}
          onClose={() => setSharingComercial(null)}
        />
      )}

      {/* Create/Edit Directory Modal */}
      {showDirectoryForm && selectedRepo && selectedModulo && (
        <CreateDirectoryModal
          repositorioId={selectedRepo}
          moduloId={selectedModulo}
          repositorioName={repositorios.find(r => r.id === selectedRepo)?.nombre}
          moduloName={getSelectedRepoModulos().find(m => m.id === selectedModulo)?.nombre}
          editingDirectory={editingDirectory}
          onClose={() => {
            setShowDirectoryForm(false);
            setEditingDirectory(null);
          }}
          onSuccess={() => {
            // Refrescar la lista de directorios
            fetchDirectorios();
            alert(editingDirectory ? '✓ Directorio actualizado exitosamente' : (t('messages.directoryCreated') || '✓ Directorio creado exitosamente'));
            setShowDirectoryForm(false);
            setEditingDirectory(null);
          }}
        />
      )}

      {/* Encoding Modal */}
      {encodingComercial && (
        <EncodingModal
          comercial={encodingComercial}
          onClose={() => setEncodingComercial(null)}
          onSuccess={() => {
            setEncodingComercial(null);
            alert('✓ Encoding iniciado exitosamente');
          }}
        />
      )}

      {/* Processing Notification - Flotante */}
      <ProcessingNotification comerciales={comerciales} />
    </div>
  );
}

export default ComercialesManager;
