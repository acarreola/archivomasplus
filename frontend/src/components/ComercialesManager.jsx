import { useState, useEffect, useCallback, useRef } from 'react';
import axios, { getMediaUrl, getApiUrl } from '../utils/axios';
import UploadForm from '../UploadForm';
import MultiFileUploader from './MultiFileUploader';
import ComercialEditModal from './ComercialEditModal';
import ShareModal from './ShareModal';
import CreateDirectoryModal from './CreateDirectoryModal';
import ProcessingNotification from './ProcessingNotification';
import EncodingModal from './EncodingModal_v2';
import AudioEncodingModal from './AudioEncodingModal';
import VideoPlayer from './VideoPlayer';
import AudioWavePlayer from './AudioWavePlayer';
import VersionHistoryModal from './VersionHistoryModal';
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
  const [viewMode, setViewMode] = useState('list'); // 'simple', 'list' (Full), or 'grid' (Thumbnails) - Iniciando en list (FULL)
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [playingComercial, setPlayingComercial] = useState(null);
  const [showSafeAction, setShowSafeAction] = useState(false);
  const [showSafeTitle, setShowSafeTitle] = useState(false);
  const [sharingComercial, setSharingComercial] = useState(null);
  const [encodingComercial, setEncodingComercial] = useState(null);
  const [encodingAudio, setEncodingAudio] = useState(null);
  const [inlinePlayingId, setInlinePlayingId] = useState(null); // Para audio inline player en full view
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  
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

  // Helper function to get modules
  const getSelectedRepoModulos = () => {
    if (!selectedRepo) return [];
    const repo = repositorios.find(r => r.id === selectedRepo);
    return repo?.modulos_detalle || [];
  };

  // Derived state: Check if current module is audio type
  const currentModuloInfo = selectedModulo 
    ? getSelectedRepoModulos().find(m => m.id === selectedModulo)
    : null;
  const isAudioModule = currentModuloInfo?.tipo === 'audio';

  const fetchCurrentUser = () => {
    // console.info('📡 Fetching current user...');
    axios.get('/api/auth/me/')
      .then(res => {
        setCurrentUser(res.data);
      })
      .catch(err => {
  console.error('Error loading user:', err);
        setCurrentUser(null);
      });
  };

  const fetchRepositorios = () => {
    axios.get('/api/repositorios/')
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
    
    // Determinar el endpoint según el tipo de módulo
    const currentModuloInfo = selectedModulo ? getSelectedRepoModulos().find(m => m.id === selectedModulo) : null;
    const isAudioModule = currentModuloInfo?.tipo === 'audio';
  const baseEndpoint = isAudioModule ? '/api/audios/?' : '/api/broadcasts/?';
    
    let url = baseEndpoint;
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
        // Normalizar estructura para audio para que el UI siga funcionando
        // igual que con broadcasts (mismos nombres de campos)
        let items = res.data || [];
        if (isAudioModule && Array.isArray(items)) {
          items = items.map(it => ({
            ...it,
            // Mapear estado para que el UI lea el mismo campo
            estado_transcodificacion: it.estado_procesamiento,
            // Mapear ruta de reproducción al campo esperado por el reproductor
            ruta_h264: it.ruta_mp3,
          }));
        }
        setComerciales(items);
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
    
    let url = `/api/directorios/?repositorio=${selectedRepo}`;
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
      axios.delete(`/api/directorios/${directorioId}/`)
        .then(() => {
          fetchDirectorios();
          fetchComerciales();
          if (selectedDirectory === directorioId) {
            setSelectedDirectory(null);
          }
        })
        .catch(err => {
          console.error('Error al eliminar directorio:', err);
          alert('Cannot delete directory. It may contain subdirectories.');
        });
    }
  };

  const handleDelete = (comercialId) => {
    if (!comercialId) {
      console.error('❌ No broadcast ID provided');
      alert('Error: No broadcast ID provided');
      return;
    }

    console.log('🗑️ Attempting to delete broadcast:', comercialId);
    
    if (window.confirm('Are you sure you want to delete this broadcast?')) {
      // Determinar el endpoint según el tipo de módulo
      const currentModuloInfo = selectedModulo ? getSelectedRepoModulos().find(m => m.id === selectedModulo) : null;
      const isAudioModule = currentModuloInfo?.tipo === 'audio';
  const baseEndpoint = isAudioModule ? '/api/audios/' : '/api/broadcasts/';
      const deleteUrl = `${baseEndpoint}${comercialId}/`;
      
      console.log('DELETE URL:', deleteUrl);
      
      axios.delete(deleteUrl)
        .then(() => {
          console.log('✅ Broadcast deleted successfully');
          fetchComerciales();
          fetchDirectorios();
        })
        .catch(err => {
          console.error('❌ Error al eliminar:', err);
          console.error('Error response:', err.response);
          console.error('Error status:', err.response?.status);
          console.error('Error data:', err.response?.data);
          
          if (err.response?.status === 403) {
            alert('You do not have permission to delete this broadcast');
          } else if (err.response?.status === 404) {
            alert(`Broadcast not found (404). ID: ${comercialId}\n\nThe broadcast may have been already deleted or does not exist.`);
            // Refrescar la lista para sincronizar
            fetchComerciales();
          } else {
            alert(`Error deleting broadcast: ${err.response?.data?.detail || err.message}`);
          }
        });
    }
  };

  const handleDownload = async (comercial, type = 'h264') => {
    // type puede ser 'h264', 'h265', 'mp3' o 'original'
    let url, filename;
    
    if (type === 'original') {
      // archivo_original ya viene con /media/ incluido desde el serializer
      const archivoUrl = comercial.archivo_original?.startsWith('http')
        ? comercial.archivo_original
        : getMediaUrl(comercial.archivo_original);
      url = archivoUrl;
      
      // Construir nombre: CLAVE_NOMBREORIGINAL.mov (siempre .mov para originales)
      const clave = comercial.repositorio_clave || comercial.repositorio_folio || 'XXX';
      const nombreOriginal = comercial.nombre_original 
        ? comercial.nombre_original.replace(/\.[^/.]+$/, '') // Remover extensión del original
        : (comercial.pizarra?.producto || 'comercial');
      
      filename = `${clave}_${nombreOriginal}.mov`;
    } else if (type === 'h264') {
      url = getMediaUrl(comercial.ruta_h264);
      // Construir nombre: CLAVE_NOMBRE.mp4 (siempre .mp4 para H.264)
      const clave = comercial.repositorio_clave || comercial.repositorio_folio || 'XXX';
      const nombre = comercial.pizarra?.producto || 'comercial';
      filename = `${clave}_${nombre}.mp4`;
    } else if (type === 'h265' || type === 'proxy') {
      url = getMediaUrl(comercial.ruta_proxy);
      filename = `${comercial.pizarra?.producto || 'comercial'}_h265.mp4`;
    } else if (type === 'mp3') {
      const mp3Path = comercial.ruta_mp3 || (comercial.ruta_h264 && comercial.ruta_h264.endsWith('.mp3') ? comercial.ruta_h264 : null);
      if (!mp3Path) {
        alert('No hay archivo MP3 disponible');
        return;
      }
    url = getMediaUrl(mp3Path);
      const clave = comercial.repositorio_clave || comercial.repositorio_folio || 'AUDIO';
      const base = (comercial.pizarra?.producto || comercial.nombre_original || 'audio').toString().replace(/\.[^/.]+$/, '');
      filename = `${clave}_${base}.mp3`;
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
      alert('⚠️ Error downloading file. Please try again.');
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

  // Map CSV vtype (1/2/3) or fallback fields to human-readable Type label
  const getTypeLabel = (pizarra) => {
    if (!pizarra) return '-';
    const v = (pizarra.vtype ?? '').toString().trim();
    if (v === '1') return 'Master';
    if (v === '2') return 'Genérico';
    if (v === '3') return 'Intergenérico';
    if (v === '4') return 'Intergenérico con logos';
    if (v === '5') return 'Subtitulado';
    if (v === '6') return 'Pista';
    // Fallback: some records might use "formato" or already have a label
    if (pizarra.formato && pizarra.formato.trim()) return pizarra.formato;
    if (pizarra.type && pizarra.type.trim()) return pizarra.type;
    return '-';
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

  // Get file extension from original filename (e.g., MP3, MP4, AIF)
  const getFileExtension = (name) => {
    if (!name || typeof name !== 'string') return '-';
    const idx = name.lastIndexOf('.');
    if (idx === -1 || idx === name.length - 1) return '-';
    return name.substring(idx + 1).toUpperCase();
  };

  // Format seconds to M:SS (e.g., 159.2 -> 2:39)
  const formatSecondsToMSS = (secs) => {
    if (secs == null || isNaN(secs)) return '-';
    const total = Math.max(0, Math.floor(secs));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getAudioDurationLabel = (item) => {
    // Prefer metadata.duracion (seconds) for audio, fallback to pizarra.duracion (string)
    const secs = item?.metadata?.duracion;
    if (typeof secs === 'number') return formatSecondsToMSS(secs);
    return item?.pizarra?.duracion || '-';
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

      {/* Modal de Reproducción (Video o Audio) */}
      {playingComercial && (
        <div className="fixed inset-0 bg-black bg-opacity-95 flex justify-center items-center z-50 p-6">
          <div className="w-full max-w-5xl">
            {/* Header minimalista */}
            <div className="bg-white text-slate-900 px-4 py-2 flex justify-between items-center rounded-t-lg border-b border-slate-200 shadow-sm">
              <h2 className="text-sm font-semibold truncate">
                {playingComercial.pizarra?.producto || playingComercial.nombre_original || 'Reproduciendo'}
              </h2>
              <div className="flex items-center gap-2">
                {/* Safety toggles */}
                <button
                  onClick={() => setShowSafeAction(v => !v)}
                  className={`px-2 py-1 text-xs rounded-full border ${showSafeAction ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                  title="Toggle Action Safe (5%)"
                >
                  Safety Area
                </button>
                <button
                  onClick={() => setShowSafeTitle(v => !v)}
                  className={`px-2 py-1 text-xs rounded-full border ${showSafeTitle ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                  title="Toggle Title Safe (10%)"
                >
                  Safety Titles
                </button>
                <button 
                  onClick={() => setPlayingComercial(null)} 
                  className="text-slate-500 hover:text-slate-800 text-xl font-light ml-2 transition-colors"
                  aria-label="Cerrar"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Player */}
            { (playingComercial.modulo_info?.tipo === 'audio' || playingComercial.ruta_mp3 || (playingComercial.ruta_h264 && playingComercial.ruta_h264.endsWith('.mp3')))
              ? (
                <div className="bg-gray-900 p-6">
                  <AudioWavePlayer url={getMediaUrl(playingComercial.ruta_h264 || playingComercial.ruta_mp3)} />
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={() => setEditingComercial(playingComercial)} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold">Edit</button>
                    <button onClick={() => setSharingComercial(playingComercial)} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-semibold">Share</button>
                    <button onClick={async () => {
                      try {
                        await axios.post(`/api/audios/${playingComercial.id}/reprocess/`);
                        alert('✓ Encode encolado');
                      } catch (e) { alert('⚠️ Error al iniciar encode'); }
                    }} className="px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded font-semibold">Encode</button>
                    <button onClick={() => handleDownload(playingComercial, 'original')} className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-semibold">Download Original</button>
                    <button onClick={() => handleDelete(playingComercial.id)} className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-semibold">Delete</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-black relative aspect-video">
                    <VideoPlayer
                      src={getMediaUrl(playingComercial.ruta_proxy)}
                      poster={playingComercial.thumbnail ? getMediaUrl(playingComercial.thumbnail) : undefined}
                      showSafeAction={showSafeAction}
                      showSafeTitle={showSafeTitle}
                      className="w-full h-full"
                    />
                  </div>
                </>
              )
            }

            {/* Info compacta y elegante */}
            <div className="bg-white px-5 py-3 rounded-b-lg border-t border-slate-200 shadow-sm">
              <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-xs text-slate-800">
                {playingComercial.pizarra?.cliente && (
                  <div className="flex flex-col">
                    <span className="text-slate-500 uppercase text-[10px] font-medium tracking-wide mb-0.5">Cliente</span>
                    <span className="text-slate-900 font-medium truncate">{playingComercial.pizarra.cliente}</span>
                  </div>
                )}
                {playingComercial.pizarra?.agencia && (
                  <div className="flex flex-col">
                    <span className="text-slate-500 uppercase text-[10px] font-medium tracking-wide mb-0.5">Agencia</span>
                    <span className="text-slate-900 font-medium truncate">{playingComercial.pizarra.agencia}</span>
                  </div>
                )}
                {playingComercial.pizarra?.producto && (
                  <div className="flex flex-col">
                    <span className="text-slate-500 uppercase text-[10px] font-medium tracking-wide mb-0.5">Producto</span>
                    <span className="text-slate-900 font-medium truncate">{playingComercial.pizarra.producto}</span>
                  </div>
                )}
                {playingComercial.pizarra?.version && (
                  <div className="flex flex-col">
                    <span className="text-slate-500 uppercase text-[10px] font-medium tracking-wide mb-0.5">Versión</span>
                    <span className="text-slate-900 font-medium truncate">{playingComercial.pizarra.version}</span>
                  </div>
                )}
                {playingComercial.pizarra?.duracion && (
                  <div className="flex flex-col">
                    <span className="text-slate-500 uppercase text-[10px] font-medium tracking-wide mb-0.5">Duración</span>
                    <span className="text-slate-900 font-medium">{playingComercial.pizarra.duracion}</span>
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-slate-500 uppercase text-[10px] font-medium tracking-wide mb-0.5">Fecha</span>
                  <span className="text-slate-900 font-medium">
                    {(() => {
                      // Prioritize pizarra.fecha (metadata date)
                      const metadataDate = playingComercial.pizarra?.fecha;
                      if (metadataDate && metadataDate.trim()) {
                        return new Date(metadataDate).toLocaleDateString('es-MX', { 
                          day: 'numeric', 
                          month: 'short', 
                          year: 'numeric' 
                        });
                      }
                      // Fallback to fecha_subida
                      return new Date(playingComercial.fecha_subida).toLocaleDateString('es-MX', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                      });
                    })()}
                  </span>
                </div>
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

        {/* Action Buttons */}
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

          <button
            onClick={() => setShowVersionHistory(true)}
            className="w-full bg-gray-600 hover:bg-gray-500 text-white px-3 py-4 rounded text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Help
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
          <div className="flex items-center space-x-6 mr-6">
            {/* Statistics */}
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{directorios.length}</div>
              <p className="text-xs text-white font-medium">Directories</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{totalFiles}</div>
              <p className="text-xs text-white font-medium">Commercials</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{stanbyFiles}</div>
              <p className="text-xs text-white font-medium">Pending</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{totalFiles - stanbyFiles}</div>
              <p className="text-xs text-white font-medium">Processed</p>
            </div>
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
            /* View 1: SIMPLE - Thumbnail, original name, key, file size, format, upload date, status */
            <div className="p-6 overflow-x-auto">
              <table className="w-full table-fixed">
                <thead className="bg-gray-100 border-b-2 border-gray-300">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-32"></th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-64">ORIGINAL NAME</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-32">KEY</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-28">FILE SIZE</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-24">FORMAT</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-36">UPLOAD DATE</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-40">STATUS</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-24">ACTIONS</th>
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
                        <td className="px-4 py-3" colSpan="7">
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
                              <span className="ml-2 text-sm text-gray-500">({item.data.broadcasts_count || 0} commercials)</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            {/* Edit button */}
                            <div className="relative group">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditDirectory(item.data);
                                }}
                                className="p-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
                                  <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h357l-80 80H200v560h560v-278l80-80v358q0 33-23.5 56.5T760-120H200Zm280-360ZM360-360v-170l367-367q12-12 27-18t30-6q16 0 30.5 6t26.5 18l56 57q11 12 17 26.5t6 29.5q0 15-5.5 29.5T897-728L530-360H360Zm481-424-56-56 56 56ZM440-440h56l232-232-28-28-29-28-231 231v57Zm260-260-29-28 29 28 28 28-28-28Z"/>
                                </svg>
                              </button>
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                Edit Directory
                              </div>
                            </div>
                            <div className="relative group">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteDirectory(item.data.id);
                                }}
                                className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
                                  <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
                                </svg>
                              </button>
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                Delete Directory
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      // Render simple Broadcast row
                      <tr key={`com-${item.data.id}`} className="hover:bg-blue-50 transition-colors">
                        {/* Thumbnail (Simple view) */}
                        <td className="px-4 py-3">
                          <div className="relative w-24 h-14 bg-transparent rounded overflow-hidden flex items-center justify-center">
                            {(() => {
                              const currentModulo = selectedModulo ? getSelectedRepoModulos().find(m => m.id === selectedModulo) : null;
                              // Detect audio using multiple hints: module, item hint, route, and extension
                              const ext = (getFileExtension(item?.data?.nombre_original || '') || '').toLowerCase();
                              const looksAudioExt = ['mp3','wav','aac','m4a','flac','ogg'].includes(ext);
                              const hasAudioRoute = !!(item?.data?.ruta_mp3 || (item?.data?.ruta_h264 && item?.data?.ruta_h264.endsWith('.mp3')));
                              const isAudioModule = (item?.data?.modulo_info?.tipo === 'audio') || (currentModulo?.tipo === 'audio') || hasAudioRoute || looksAudioExt;
                              if (isAudioModule) {
                                return (
                                  <img
                                    src="/icons/audifono.png?v=20251027-final"
                                    alt="Audio"
                                    className="w-16 h-12 object-contain"
                                    onError={(e) => {
                                      const el = e.currentTarget;
                                      const step = el.dataset.fallbackStep || '0';
                                      if (step === '0') { el.dataset.fallbackStep = '1'; el.src = getApiUrl('/icons/audifono.png?v=20251027-final'); return; }
                                      if (step === '1') { el.dataset.fallbackStep = '2'; el.src = '/icons/audio.png?v=20251027-final'; return; }
                                      if (step === '2') { el.dataset.fallbackStep = '3'; el.src = getApiUrl('/icons/audio.png?v=20251027-final'); return; }
                                      // Final fallback: hide image
                                      el.style.display = 'none';
                                      const fallback = el.nextElementSibling;
                                      if (fallback) fallback.style.display = 'block';
                                    }}
                                  />
                                );
                              }
                              return (
                                <>
                                  {item.data.thumbnail_url ? (
                                    <img 
                                      src={item.data.thumbnail_url} 
                                      alt="Thumbnail" 
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        const fallback = e.currentTarget.nextElementSibling;
                                        if (fallback) fallback.style.display = 'block';
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
                                </>
                              );
                            })()}
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
                        
                        {/* Key (Repositorio Clave) */}
                        <td className="px-4 py-3">
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-700">
                            {item.data.repositorio_clave || '-'}
                          </code>
                        </td>
                        
                        {/* File Size */}
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {formatFileSize(item.data.file_size)}
                        </td>
                        
                        {/* Format */}
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {getFileExtension(item.data.nombre_original)}
                        </td>
                        
                        {/* Upload Date - Show fecha_subida (actual upload timestamp) */}
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {new Date(item.data.fecha_subida).toLocaleDateString('es-MX', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
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
                          <div className="flex justify-end space-x-1">
                            <div className="relative group">
                              <button
                                onClick={() => setEditingComercial(item.data)}
                                className="p-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
                                  <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h357l-80 80H200v560h560v-278l80-80v358q0 33-23.5 56.5T760-120H200Zm280-360ZM360-360v-170l367-367q12-12 27-18t30-6q16 0 30.5 6t26.5 18l56 57q11 12 17 26.5t6 29.5q0 15-5.5 29.5T897-728L530-360H360Zm481-424-56-56 56 56ZM440-440h56l232-232-28-28-29-28-231 231v57Zm260-260-29-28 29 28 28 28-28-28Z"/>
                                </svg>
                              </button>
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                Edit
                              </div>
                            </div>
                            {item.data.estado_transcodificacion === 'COMPLETADO' && (
                              <div className="relative group">
                                <button 
                                  onClick={() => handlePlay(item.data)}
                                  className="p-1.5 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
                                    <path d="M320-200v-560l440 280-440 280Z"/>
                                  </svg>
                                </button>
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                  Play
                                </div>
                              </div>
                            )}
                            <div className="relative group">
                              <button 
                                onClick={() => setSharingComercial(item.data)}
                                className="p-1.5 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
                                  <path d="M720-80q-50 0-85-35t-35-85q0-7 1-14.5t3-13.5L322-392q-17 15-38 23.5t-44 8.5q-50 0-85-35t-35-85q0-50 35-85t85-35q23 0 44 8.5t38 23.5l282-164q-2-6-3-13.5t-1-14.5q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35q-23 0-44-8.5T638-672L356-508q2 6 3 13.5t1 14.5q0 7-1 14.5t-3 13.5l282 164q17-15 38-23.5t44-8.5q50 0 85 35t35 85q0 50-35 85t-85 35Z"/>
                                </svg>
                              </button>
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                Share
                              </div>
                            </div>
                            {item.data.estado_transcodificacion === 'COMPLETADO' && (
                              <div className="relative group">
                                {item.data.modulo_info?.tipo === 'audio' ? (
                                  <>
                                    <button 
                                      onClick={() => setEncodingAudio(item.data)}
                                      className="p-1.5 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
                                        <path d="M480-800q-83 0-156 31.5T197-682q-55 55-86.5 128T79-398h86q0-130 92.5-222.5T480-713v-87Zm0 640q83 0 156-31.5T763-278q55-55 86.5-128T881-562h-86q0 130-92.5 222.5T480-247v87Zm0-480q-66 0-113 47t-47 113q0 66 47 113t113 47q66 0 113-47t47-113q0-66-47-113t-113-47Z"/>
                                      </svg>
                                    </button>
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                      Encode
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <button 
                                      onClick={async () => {
                                        try {
                                          await axios.post(`/api/broadcasts/${item.data.id}/reprocess/`);
                                          alert('✓ Transcodificación encolada');
                                          fetchComerciales();
                                        } catch (e) { 
                                          alert('⚠️ Error starting transcode'); 
                                          console.error(e);
                                        }
                                      }}
                                      className="p-1.5 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
                                        <path d="M480-800q-83 0-156 31.5T197-682q-55 55-86.5 128T79-398h86q0-130 92.5-222.5T480-713v-87Zm0 640q83 0 156-31.5T763-278q55-55 86.5-128T881-562h-86q0 130-92.5 222.5T480-247v87Zm0-480q-66 0-113 47t-47 113q0 66 47 113t113 47q66 0 113-47t47-113q0-66-47-113t-113-47Z"/>
                                      </svg>
                                    </button>
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                      Transcode
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                            {item.data.estado_transcodificacion === 'COMPLETADO' && item.data.modulo_info?.tipo === 'audio' && (item.data.ruta_mp3 || (item.data.ruta_h264 && item.data.ruta_h264.endsWith('.mp3'))) && (
                              <div className="relative group">
                                <button 
                                  onClick={() => handleDownload(item.data, 'mp3')}
                                  className="p-1.5 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
                                    <path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z"/>
                                  </svg>
                                </button>
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                  Download MP3
                                </div>
                              </div>
                            )}
                            <div className="relative group">
                              <button 
                                onClick={() => handleDownload(item.data, 'original')}
                                className="p-1.5 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
                                  <path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z"/>
                                </svg>
                              </button>
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                Download Original
                              </div>
                            </div>
                            <div className="relative group">
                              <button
                                onClick={() => handleDelete(item.data.id)}
                                className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
                                  <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
                                </svg>
                              </button>
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                Delete
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          ) : viewMode === 'list' ? (
            /* Vista 2: LISTA COMPLETA */
            <div className="p-6">
              {/* Si el módulo es audio, render especial tipo waveform list */}
              {(() => {
                const currentModulo = selectedModulo ? getSelectedRepoModulos().find(m => m.id === selectedModulo) : null;
                if (currentModulo?.tipo === 'audio') {
                  return (
                    <div className="space-y-6">
                      {displayItems.map((item) => item.type === 'directory' ? (
                        <div key={`dir-${item.data.id}`} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm">
                          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => { setSelectedDirectory(item.data.id); setCurrentPage(1); }}>
                            <svg className="w-7 h-7 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
                            <div>
                              <div className="text-base font-semibold text-gray-900">{item.data.nombre}</div>
                              <div className="text-xs text-gray-500">{item.data.broadcasts_count || 0} commercials</div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button onClick={() => handleEditDirectory(item.data)} className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">Edit</button>
                            <button onClick={() => handleDeleteDirectory(item.data.id)} className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600">Delete</button>
                          </div>
                        </div>
                      ) : (
                        <div key={`audio-${item.data.id}`} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start gap-4">
                            {/* Play button */}
                            <button 
                              onClick={() => {
                                if (inlinePlayingId === item.data.id) {
                                  setInlinePlayingId(null); // Pause/close
                                } else {
                                  setInlinePlayingId(item.data.id); // Play inline
                                }
                              }}
                              className="flex-shrink-0 w-12 h-12 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                            >
                              {inlinePlayingId === item.data.id ? (
                                <svg xmlns="http://www.w3.org/2000/svg" height="22" viewBox="0 -960 960 960" width="22" fill="currentColor"><path d="M520-200v-560h240v560H520Zm-320 0v-560h240v560H200Z"/></svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" height="22" viewBox="0 -960 960 960" width="22" fill="currentColor"><path d="M320-200v-560l440 280-440 280Z"/></svg>
                              )}
                            </button>

                            {/* File info and waveform */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="truncate font-semibold text-gray-900">
                                  {(item.data.nombre_original || item.data.pizarra?.producto || 'AUDIO').toUpperCase()}
                                </div>
                                <div className="ml-4 text-xs text-gray-500 whitespace-nowrap">{getAudioDurationLabel(item.data)}</div>
                              </div>
                              <div className="mt-1 text-xs text-gray-600">
                                {formatFileSize(item.data.file_size)}<span className="mx-2">•</span>{getFileExtension(item.data.nombre_original)}
                              </div>
                              
                              {/* Inline player or waveform placeholder */}
                              {inlinePlayingId === item.data.id ? (
                                <div className="mt-3">
                                  <AudioWavePlayer 
                                    url={getMediaUrl(item.data.ruta_h264 || item.data.ruta_mp3)}
                                    height={28}
                                  />
                                </div>
                              ) : (
                                <div className="mt-3 h-7 rounded bg-gray-100 relative overflow-hidden cursor-pointer" onClick={() => setInlinePlayingId(item.data.id)}>
                                  <div className="absolute inset-0 opacity-80" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #9ca3af 0, #9ca3af 2px, transparent 2px, transparent 6px)' }}></div>
                                </div>
                              )}
                            </div>

                            {/* Actions (audio): Edit, Share, Encode, Download MP3, Download Original, Delete */}
                            <div className="flex-shrink-0 flex flex-col items-end gap-2">
                              <div className="flex space-x-1">
                                {/* Edit (rename-only for audio) */}
                                <div className="relative group">
                                  <button onClick={() => setEditingComercial(item.data)} className="p-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h357l-80 80H200v560h560v-278l80-80v358q0 33-23.5 56.5T760-120H200Zm280-360ZM360-360v-170l367-367q12-12 27-18t30-6q16 0 30.5 6t26.5 18l56 57q11 12 17 26.5t6 29.5q0 15-5.5 29.5T897-728L530-360H360Zm481-424-56-56 56 56ZM440-440h56l232-232-28-28-29-28-231 231v57Zm260-260-29-28 29 28 28 28-28-28Z"/></svg>
                                  </button>
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">Edit</div>
                                </div>

                                {/* Share */}
                                <div className="relative group">
                                  <button onClick={() => setSharingComercial(item.data)} className="p-1.5 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M720-80q-50 0-85-35t-35-85q0-7 1-14.5t3-13.5L322-392q-17 15-38 23.5t-44 8.5q-50 0-85-35t-35-85q0-50 35-85t85-35q23 0 44 8.5t38 23.5l282-164q-2-6-3-13.5t-1-14.5q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35q-23 0-44-8.5T638-672L356-508q2 6 3 13.5t1 14.5q0 7-1 14.5t-3 13.5l282 164q17-15 38-23.5t44-8.5q50 0 85 35t35 85q0 50-35 85t-85 35Z"/></svg>
                                  </button>
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">Share</div>
                                </div>

                                {/* Encode (open Audio Encoding Modal) */}
                                <div className="relative group">
                                  <button onClick={() => setEncodingAudio(item.data)} className="p-1.5 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M480-800q-83 0-156 31.5T197-682q-55 55-86.5 128T79-398h86q0-130 92.5-222.5T480-713v-87Zm0 640q83 0 156-31.5T763-278q55-55 86.5-128T881-562h-86q0 130-92.5 222.5T480-247v87Zm0-480q-66 0-113 47t-47 113q0 66 47 113t113 47q66 0 113-47t47-113q0-66-47-113t-113-47Z"/></svg>
                                  </button>
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">Encode</div>
                                </div>

                                {/* Download MP3 if available */}
                                {(item.data.ruta_mp3 || (item.data.ruta_h264 && item.data.ruta_h264.endsWith('.mp3'))) && (
                                  <div className="relative group">
                                    <button onClick={() => handleDownload(item.data, 'mp3')} className="p-1.5 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors">
                                      <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z"/></svg>
                                    </button>
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">Download MP3</div>
                                  </div>
                                )}

                                {/* Download Original */}
                                <div className="relative group">
                                  <button onClick={() => handleDownload(item.data, 'original')} className="p-1.5 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z"/></svg>
                                  </button>
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">Download Original</div>
                                </div>

                                {/* Delete */}
                                <div className="relative group">
                                  <button onClick={() => handleDelete(item.data.id)} className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>
                                  </button>
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">Delete</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                }

                // Default (no-audio): mantener tabla previa
                return (
                  <div className="overflow-x-auto">
                    <table className="w-full table-fixed">
                      <thead className="bg-gray-100 border-b-2 border-gray-300">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-32">THUMBNAIL</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-40">CLIENT</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-40">AGENCY</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-48">PRODUCT</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-32">VERSION</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-24">TIME</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-32">TYPE</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-36">DATE-CREATE</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-24">ACTIONS</th>
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
                                    <span className="ml-2 text-sm text-gray-500">({item.data.broadcasts_count || 0} commercials)</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center space-x-2">
                                  {/* Botón Editar */}
                                  <div className="relative group">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditDirectory(item.data);
                                      }}
                                      className="p-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
                                        <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h357l-80 80H200v560h560v-278l80-80v358q0 33-23.5 56.5T760-120H200Zm280-360ZM360-360v-170l367-367q12-12 27-18t30-6q16 0 30.5 6t26.5 18l56 57q11 12 17 26.5t6 29.5q0 15-5.5 29.5T897-728L530-360H360Zm481-424-56-56 56 56ZM440-440h56l232-232-28-28-29-28-231 231v57Zm260-260-29-28 29 28 28 28-28-28Z"/>
                                      </svg>
                                    </button>
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                      Edit Directory
                                    </div>
                                  </div>
                                  {/* Botón Eliminar */}
                                  <div className="relative group">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteDirectory(item.data.id);
                                      }}
                                      className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
                                        <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
                                      </svg>
                                    </button>
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                      Delete Directory
                                    </div>
                                  </div>
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
                              {/* Type (from CSV vtype mapping). Status is not shown in Full view */}
                              <td className="px-4 py-3 text-sm">
                                <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                                  {getTypeLabel(item.data.pizarra)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {/* Show pizarra.fecha in readable format: 12 oct 2024 */}
                                {item.data.pizarra?.fecha ? (() => {
                                  try {
                                    const date = new Date(item.data.pizarra.fecha);
                                    return date.toLocaleDateString('es-MX', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric'
                                    });
                                  } catch {
                                    return item.data.pizarra.fecha;
                                  }
                                })() : '-'}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <div className="flex justify-end space-x-1">
                            <div className="relative group">
                              <button
                                onClick={() => setEditingComercial(item.data)}
                                className="p-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
                                  <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h357l-80 80H200v560h560v-278l80-80v358q0 33-23.5 56.5T760-120H200Zm280-360ZM360-360v-170l367-367q12-12 27-18t30-6q16 0 30.5 6t26.5 18l56 57q11 12 17 26.5t6 29.5q0 15-5.5 29.5T897-728L530-360H360Zm481-424-56-56 56 56ZM440-440h56l232-232-28-28-29-28-231 231v57Zm260-260-29-28 29 28 28 28-28-28Z"/>
                                </svg>
                              </button>
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                Edit
                              </div>
                            </div>
                            {item.data.estado_transcodificacion === 'COMPLETADO' && (
                              <div className="relative group">
                                <button 
                                  onClick={() => handlePlay(item.data)}
                                  className="p-1.5 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
                                    <path d="M320-200v-560l440 280-440 280Z"/>
                                  </svg>
                                </button>
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                  Play
                                </div>
                              </div>
                            )}
                            <div className="relative group">
                              <button 
                                onClick={() => setSharingComercial(item.data)}
                                className="p-1.5 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
                                  <path d="M720-80q-50 0-85-35t-35-85q0-7 1-14.5t3-13.5L322-392q-17 15-38 23.5t-44 8.5q-50 0-85-35t-35-85q0-50 35-85t85-35q23 0 44 8.5t38 23.5l282-164q-2-6-3-13.5t-1-14.5q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35q-23 0-44-8.5T638-672L356-508q2 6 3 13.5t1 14.5q0 7-1 14.5t-3 13.5l282 164q17-15 38-23.5t44-8.5q50 0 85 35t35 85q0 50-35 85t-85 35Z"/>
                                </svg>
                              </button>
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                Share
                              </div>
                            </div>
                            {item.data.estado_transcodificacion === 'COMPLETADO' && (
                              <div className="relative group">
                                {item.data.modulo_info?.tipo === 'audio' ? (
                                  <>
                                    <button 
                                      onClick={async () => {
                                        try {
                                          await axios.post(`/api/audios/${item.data.id}/reprocess/`);
                                        alert('✓ Audio reprocess queued');
                                        } catch (e) { alert('⚠️ Error starting reprocess'); }
                                      }}
                                      className="p-1.5 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
                                        <path d="M480-800q-83 0-156 31.5T197-682q-55 55-86.5 128T79-398h86q0-130 92.5-222.5T480-713v-87Zm0 640q83 0 156-31.5T763-278q55-55 86.5-128T881-562h-86q0 130-92.5 222.5T480-247v87Zm0-480q-66 0-113 47t-47 113q0 66 47 113t113 47q66 0 113-47t47-113q0-66-47-113t-113-47Z"/>
                                      </svg>
                                    </button>
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                      Reprocess MP3
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    {/* Botón Encode para videos (FFmpeg presets) */}
                                    <button 
                                      onClick={() => setEncodingComercial(item.data)}
                                      className="p-1.5 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
                                        <path d="M480-800q-83 0-156 31.5T197-682q-55 55-86.5 128T79-398h86q0-130 92.5-222.5T480-713v-87Zm0 640q83 0 156-31.5T763-278q55-55 86.5-128T881-562h-86q0 130-92.5 222.5T480-247v87Zm0-480q-66 0-113 47t-47 113q0 66 47 113t113 47q66 0 113-47t47-113q0-66-47-113t-113-47Z"/>
                                      </svg>
                                    </button>
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                      Encode
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                            {/* H.264 download removed: restrict downloads to Original or explicit Encodes */}
                            {item.data.estado_transcodificacion === 'COMPLETADO' && item.data.modulo_info?.tipo === 'audio' && (item.data.ruta_mp3 || (item.data.ruta_h264 && item.data.ruta_h264.endsWith('.mp3'))) && (
                              <div className="relative group">
                                <button 
                                  onClick={() => handleDownload(item.data, 'mp3')}
                                  className="p-1.5 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
                                    <path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z"/>
                                  </svg>
                                </button>
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                  Download MP3
                                </div>
                              </div>
                            )}
                            <div className="relative group">
                              <button 
                                onClick={() => handleDownload(item.data, 'original')}
                                className="p-1.5 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
                                  <path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z"/>
                                </svg>
                              </button>
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                Download Original
                              </div>
                            </div>
                            <div className="relative group">
                              <button
                                onClick={() => handleDelete(item.data.id)}
                                className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
                                  <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
                                </svg>
                              </button>
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                Delete
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          ) : (
            // Vista Grid con Thumbnails
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-10 gap-4">
                {comercialesFiltrados.map(comercial => {
                  return (
                  <div 
                    key={comercial.id}
                    className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-xl transition-all duration-200 overflow-hidden group"
                  >
                    {/* Thumbnail */}
                    <div className="relative bg-gray-900 aspect-video flex items-center justify-center">
                      {(() => {
                        const isAudio = !!(comercial?.modulo_info?.tipo === 'audio' || comercial?.ruta_mp3 || (comercial?.ruta_h264 && comercial?.ruta_h264.endsWith?.('.mp3')));
                        if (isAudio) {
                          const audioSrc = getMediaUrl(comercial.ruta_mp3 || (comercial.ruta_h264 && comercial.ruta_h264.endsWith('.mp3') ? comercial.ruta_h264 : ''));
                          return (
                            <div className="w-full h-full flex items-center justify-center relative">
                              <img
                                src="/icons/audifono.png?v=20251027-final"
                                alt="Audio"
                                className="w-14 h-14 opacity-90 object-contain"
                                onError={(e) => {
                                  const el = e.currentTarget;
                                  const step = el.dataset.fallbackStep || '0';
                                  if (step === '0') { el.dataset.fallbackStep = '1'; el.src = getApiUrl('/icons/audifono.png?v=20251027-final'); return; }
                                  if (step === '1') { el.dataset.fallbackStep = '2'; el.src = '/icons/audio.png?v=20251027-final'; return; }
                                  if (step === '2') { el.dataset.fallbackStep = '3'; el.src = getApiUrl('/icons/audio.png?v=20251027-final'); return; }
                                  el.style.display = 'none';
                                }}
                              />
                              {/* Reproducción al hover */}
                              {audioSrc ? (
                                <audio
                                  src={audioSrc}
                                  preload="none"
                                  className="hidden"
                                  onMouseEnter={(e) => {
                                    try { e.currentTarget.play(); } catch(_) {}
                                  }}
                                  onMouseLeave={(e) => {
                                    try { e.currentTarget.pause(); e.currentTarget.currentTime = 0; } catch(_) {}
                                  }}
                                />
                              ) : null}
                              {/* Overlay de estado al pasar el mouse */}
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all" />
                            </div>
                          );
                        }

                        if (comercial.thumbnail_url) {
                          return (
                            <img 
                              src={comercial.thumbnail_url}
                              alt={comercial.pizarra?.producto || 'Thumbnail'}
                              className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => setEditingComercial(comercial)}
                            />
                          );
                        }

                        if (comercial.estado_transcodificacion === 'COMPLETADO' && comercial.ruta_proxy) {
                          return (
                            <video 
                              className="w-full h-full object-cover"
                              preload="metadata"
                              onMouseEnter={(e) => e.target.play()}
                              onMouseLeave={(e) => { e.target.pause(); e.target.currentTime = 0; }}
                            >
                              <source src={getMediaUrl(comercial.ruta_proxy)} type="video/mp4" />
                            </video>
                          );
                        }

                        return (
                          <div className="text-gray-500 text-center p-4">
                            <div className="text-3xl mb-2">🎬</div>
                            <div className="text-xs">
                              {comercial.estado_transcodificacion === 'PROCESANDO' ? 'Processing...' : 
                               comercial.estado_transcodificacion === 'PENDIENTE' ? 'In queue...' : 
                               'Error'}
                            </div>
                          </div>
                        );
                      })()}
                      
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
                        {comercial.pizarra?.producto || 'Untitled'}
                      </h3>
                      <p className="text-xs text-gray-600 truncate mb-1">
                        {comercial.pizarra?.cliente || comercial.repositorio_nombre}
                      </p>
                      <p className="text-xs text-gray-500 truncate mb-2">
                        {comercial.pizarra?.agencia || '-'}
                      </p>
                      
                      {/* Actions */}
                      <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                        <div className="flex space-x-1">
                          <div className="relative group">
                            <button
                              onClick={() => setEditingComercial(comercial)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor">
                                <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h357l-80 80H200v560h560v-278l80-80v358q0 33-23.5 56.5T760-120H200Zm280-360ZM360-360v-170l367-367q12-12 27-18t30-6q16 0 30.5 6t26.5 18l56 57q11 12 17 26.5t6 29.5q0 15-5.5 29.5T897-728L530-360H360Zm481-424-56-56 56 56ZM440-440h56l232-232-28-28-29-28-231 231v57Zm260-260-29-28 29 28 28 28-28-28Z"/>
                              </svg>
                            </button>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                              Edit
                            </div>
                          </div>
                          {comercial.estado_transcodificacion === 'COMPLETADO' && (
                            <div className="relative group">
                              <button 
                                onClick={() => handlePlay(comercial)}
                                className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors" 
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor">
                                  <path d="M320-200v-560l440 280-440 280Z"/>
                                </svg>
                              </button>
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                Play
                              </div>
                            </div>
                          )}
                          <div className="relative group">
                            <button 
                              onClick={() => setSharingComercial(comercial)}
                              className="p-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors" 
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor">
                                <path d="M720-80q-50 0-85-35t-35-85q0-7 1-14.5t3-13.5L322-392q-17 15-38 23.5t-44 8.5q-50 0-85-35t-35-85q0-50 35-85t85-35q23 0 44 8.5t38 23.5l282-164q-2-6-3-13.5t-1-14.5q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35q-23 0-44-8.5T638-672L356-508q2 6 3 13.5t1 14.5q0 7-1 14.5t-3 13.5l282 164q17-15 38-23.5t44-8.5q50 0 85 35t35 85q0 50-35 85t-85 35Z"/>
                              </svg>
                            </button>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                              Share
                            </div>
                          </div>
                          {comercial.estado_transcodificacion === 'COMPLETADO' && (
                            <div className="relative group">
                              {comercial.modulo_info?.tipo === 'audio' ? (
                                <>
                                  <button 
                                    onClick={async () => {
                                      try {
                                        await axios.post(`/api/audios/${comercial.id}/reprocess/`);
                                        alert('✓ Audio reprocess queued');
                                      } catch (e) { alert('⚠️ Error starting reprocess'); }
                                    }}
                                    className="p-1 text-yellow-600 hover:bg-yellow-50 rounded transition-colors" 
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor">
                                      <path d="M480-800q-83 0-156 31.5T197-682q-55 55-86.5 128T79-398h86q0-130 92.5-222.5T480-713v-87Zm0 640q83 0 156-31.5T763-278q55-55 86.5-128T881-562h-86q0 130-92.5 222.5T480-247v87Zm0-480q-66 0-113 47t-47 113q0 66 47 113t113 47q66 0 113-47t47-113q0-66-47-113t-113-47Z"/>
                                    </svg>
                                  </button>
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                    Reprocess MP3
                                  </div>
                                </>
                              ) : (
                                <>
                                  {/* Botón Transcode para videos (transcodificación estándar) */}
                                  <button 
                                    onClick={async () => {
                                      try {
                                        await axios.post(`/api/broadcasts/${comercial.id}/reprocess/`);
                                        alert('✓ Transcodificación encolada');
                                        fetchComerciales();
                                      } catch (e) { 
                                        alert('⚠️ Error starting transcode'); 
                                        console.error(e);
                                      }
                                    }}
                                    className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors" 
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor">
                                      <path d="M480-800q-83 0-156 31.5T197-682q-55 55-86.5 128T79-398h86q0-130 92.5-222.5T480-713v-87Zm0 640q83 0 156-31.5T763-278q55-55 86.5-128T881-562h-86q0 130-92.5 222.5T480-247v87Zm0-480q-66 0-113 47t-47 113q0 66 47 113t113 47q66 0 113-47t47-113q0-66-47-113t-113-47Z"/>
                                    </svg>
                                  </button>
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                    Transcode
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                          {/* H.264 download removed: restrict downloads to Original or explicit Encodes */}
                          {comercial.estado_transcodificacion === 'COMPLETADO' && comercial.modulo_info?.tipo === 'audio' && (comercial.ruta_mp3 || (comercial.ruta_h264 && comercial.ruta_h264.endsWith('.mp3'))) && (
                            <div className="relative group">
                              <button 
                                onClick={() => handleDownload(comercial, 'mp3')}
                                className="p-1 text-orange-600 hover:bg-orange-50 rounded transition-colors" 
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor">
                                  <path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z"/>
                                </svg>
                              </button>
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                Download MP3
                              </div>
                            </div>
                          )}
                          <div className="relative group">
                            <button 
                              onClick={() => handleDownload(comercial, 'original')}
                              className="p-1 text-purple-600 hover:bg-purple-50 rounded transition-colors" 
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor">
                                <path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z"/>
                              </svg>
                            </button>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                              Download Original
                            </div>
                          </div>
                        </div>
                        <div className="relative group">
                          <button
                            onClick={() => handleDelete(comercial.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor">
                              <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
                            </svg>
                          </button>
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                            Delete
                          </div>
                        </div>
                      </div>
                      
                      {/* Date (prioritize pizarra.fecha) */}
                      <div className="text-xs text-gray-400 mt-2">
                        {(() => {
                          const metadataDate = comercial.pizarra?.fecha;
                          if (metadataDate && metadataDate.trim()) {
                            return new Date(metadataDate).toLocaleDateString('es-MX');
                          }
                          return new Date(comercial.fecha_subida).toLocaleDateString('es-MX');
                        })()}
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

      {/* Audio Encoding Modal */}
      {encodingAudio && (
        <AudioEncodingModal
          audio={encodingAudio}
          onClose={() => setEncodingAudio(null)}
          onSuccess={() => {
            setEncodingAudio(null);
            // Opcional: refrescar lista luego
            // fetchComerciales();
          }}
        />
      )}

      {/* Processing Notification - Flotante */}
      <ProcessingNotification comerciales={comerciales} />

      {/* Version History Modal */}
      {showVersionHistory && (
        <VersionHistoryModal
          onClose={() => setShowVersionHistory(false)}
        />
      )}
    </div>
  );
}

export default ComercialesManager;
