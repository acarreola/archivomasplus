// frontend/src/components/RepositoriosManager.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // Importar Link
import axios from '../utils/axios';
import RepoUsuariosModal from './RepoUsuariosModal';

export default function RepositoriosManager() {
  const [repositorios, setRepositorios] = useState([]);
  const [users, setUsers] = useState([]);
  const [modulos, setModulos] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingRepo, setEditingRepo] = useState(null);
    // Modal para asignar usuarios a repositorio
    const [showUsuariosModal, setShowUsuariosModal] = useState(false);
    const [selectedRepoForUsers, setSelectedRepoForUsers] = useState(null);
  // Preview vinculación (dry-run)
  const [showPreview, setShowPreview] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewRepoId, setPreviewRepoId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    folio: '',
    position: 0,
    clave: '',
    activo: true,
    users_asignados: [],
    modulos_ids: []
  });
  const [error, setError] = useState('');
  // Estado de soporte/estatus
  const [showStatus, setShowStatus] = useState(false);
  const [statusRepo, setStatusRepo] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusData, setStatusData] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [pendingDetails, setPendingDetails] = useState({
    sin_archivo: { loading: false, items: [] },
    archivo_no_existe: { loading: false, items: [] },
    listo_para_iniciar: { loading: false, items: [] },
  });

  const handleDeleteAllBroadcasts = async () => {
    if (!window.confirm(
      '⚠️ ADVERTENCIA: Esta acción eliminará PERMANENTEMENTE TODO el contenido del sistema:\n\n' +
      '• Broadcasts (incluye Reel)\n' +
      '• Audios\n' +
      '• Imágenes\n' +
      '• Storage (documentos/otros)\n' +
      '• Todos los Directorios\n' +
      '• Y TODOS los archivos físicos:\n' +
      '  - Archivos originales (sources/)\n' +
      '  - Thumbnails (thumbnails/)\n' +
      '  - Pizarras (pizarra/)\n' +
      '  - Archivos procesados/soporte (support/)\n' +
      '  - Encodings personalizados (encoded/ y encoded_audio/)\n\n' +
      '❌ ESTA ACCIÓN NO SE PUEDE DESHACER ❌\n\n' +
      '¿Estás completamente seguro de continuar?'
    )) {
      return;
    }

    // Segunda confirmación
    if (!window.confirm('⚠️ ÚLTIMA CONFIRMACIÓN: ¿Realmente deseas eliminar TODO el contenido del sistema?')) {
      return;
    }

    try {
      // Intentar primero el endpoint nuevo universal
      let response;
      try {
        response = await axios.post('http://localhost:8000/api/admin/purge-all/');
      } catch (e) {
        // Fallback al viejo si existiera
        response = await axios.post('http://localhost:8000/api/broadcasts/delete_all/');
      }
      
      // Mostrar detalles de la eliminación
      if (response.data.details) {
        alert(
          `✅ Eliminación completada:\n\n` +
          `📊 Broadcasts: ${response.data.details.broadcasts}\n` +
          `🎵 Audios: ${response.data.details.audios}\n` +
          `�️ Imágenes: ${response.data.details.images}\n` +
          `💾 Storage: ${response.data.details.storage_files}\n` +
          `�📁 Directorios: ${response.data.details.directorios}\n` +
          `�️ Archivos físicos aprox: ${response.data.details.archivos_aproximados}\n` +
          (response.data.details.errores > 0 ? `⚠️ Errores: ${response.data.details.errores}` : '')
        );
      } else {
        alert(response.data.message);
      }
      
      fetchRepositorios(); // Refrescar datos
    } catch (err) {
      console.error('Error deleting all content:', err);
      // Mostrar detalle de 405 (método no permitido) si aplica
      if (err.response?.status === 405) {
        alert('❌ Error: Método no permitido (405). Verifica que el endpoint soporte POST y que la URL sea correcta.');
      } else {
        alert('❌ Error al eliminar todo: ' + (err.response?.data?.error || err.message));
      }
    }
  };

  const handleOpenUsuariosModal = (repo) => {
    setSelectedRepoForUsers(repo);
    setShowUsuariosModal(true);
  };

  const handleCloseUsuariosModal = () => {
    setShowUsuariosModal(false);
    setSelectedRepoForUsers(null);
  };

  useEffect(() => {
    fetchRepositorios();
    fetchUsers();
    fetchModulos();
  }, []);

  // Auto-refresh del estado cuando está procesando
  useEffect(() => {
    if (!autoRefresh || !statusRepo) return;
    const interval = setInterval(() => {
      fetchStatus(statusRepo.id);
    }, 5000); // cada 5 segundos
    return () => clearInterval(interval);
  }, [autoRefresh, statusRepo]);

  const fetchRepositorios = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/repositorios/');
      setRepositorios(response.data);
    } catch (err) {
      console.error('Error fetching repositorios:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/users/');
      setUsers(response.data);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchModulos = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/modulos/');
      setModulos(response.data);
    } catch (err) {
      console.error('Error fetching módulos:', err);
    }
  };

  const handleOpenModal = (repo = null) => {
    if (repo) {
      setEditingRepo(repo);
      setFormData({
        name: repo.nombre || repo.name || '',
        folio: repo.folio || '',
        position: typeof repo.position === 'number' ? repo.position : 0,
        clave: repo.clave || '',
        activo: typeof repo.activo === 'boolean' ? repo.activo : true,
        users_asignados: repo.users_asignados || [],
        modulos_ids: repo.modulos_detalle?.map(m => m.id) || []
      });
    } else {
      setEditingRepo(null);
      setFormData({
        name: '',
        folio: '',
        position: 0,
        clave: '',
        activo: true,
        users_asignados: [],
        modulos_ids: []
      });
    }
    setShowModal(true);
    setError('');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRepo(null);
    setFormData({
      name: '',
      folio: '',
      position: 0,
      clave: '',
      activo: true,
      users_asignados: [],
      modulos_ids: []
    });
    setError('');
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    // Normalize number fields
    const nextValue = type === 'checkbox' ? checked : value;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'position' ? (nextValue === '' ? '' : Number(nextValue)) : nextValue
    }));
  };

  const handleExportCSV = async (repositorioId) => {
    try {
      const response = await axios.get(`http://localhost:8000/api/csv/export-broadcasts/?repositorio=${repositorioId}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `broadcasts_${repositorioId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error exporting CSV:', err);
      alert('Error al exportar CSV');
    }
  };

  const handleImportCSV = async (repositorioId, file) => {
    const formData = new FormData();
    formData.append('csv_file', file);
    formData.append('repositorio_id', repositorioId);

    try {
      const response = await axios.post('http://localhost:8000/api/csv/import-broadcasts/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const data = response.data;
      const summary = data.status_summary || {};
      
      let message = `✅ CSV importado exitosamente!\n\n`;
      message += `📊 Resumen:\n`;
      message += `  • Creados: ${data.created}\n`;
      message += `  • Actualizados: ${data.updated}\n`;
      message += `  • Total procesado: ${data.total_processed}\n\n`;
      message += `📈 Estados:\n`;
      message += `  • Completados: ${summary.completado || 0}\n`;
      message += `  • Procesando: ${summary.procesando || 0}\n`;
      message += `  • Pendientes: ${summary.pendiente || 0}\n`;
      message += `  • Errores: ${summary.error || 0}\n`;
      message += `  • Solo Metadata: ${summary.metadata_only || 0}\n`;
      
      if (data.warnings && data.warnings.length > 0) {
        message += `\n⚠️ Avisos (${data.warnings.length}):\n`;
        const maxWarnings = 5;
        data.warnings.slice(0, maxWarnings).forEach(w => {
          message += `  • ${w}\n`;
        });
        if (data.warnings.length > maxWarnings) {
          message += `  ... y ${data.warnings.length - maxWarnings} más\n`;
        }
      }
      
      if (data.errors && data.errors.length > 0) {
        message += `\n❌ Errores (${data.errors.length}):\n`;
        const maxErrors = 3;
        data.errors.slice(0, maxErrors).forEach(e => {
          message += `  • ${e}\n`;
        });
        if (data.errors.length > maxErrors) {
          message += `  ... y ${data.errors.length - maxErrors} más\n`;
        }
      }
      
      alert(message);
      // Opcional: recargar la lista de broadcasts si es necesario
    } catch (err) {
      console.error('Error importing CSV:', err);
      alert('Error al importar CSV: ' + (err.response?.data?.error || err.message));
    }
  };

  const triggerFileInput = (repositorioId) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        handleImportCSV(repositorioId, file);
      }
    };
    input.click();
  };

  const handleMatchSourceFiles = async (repositorioId) => {
    if (!window.confirm('¿Vincular archivos de /media/sources/ con broadcasts sin archivo?\n\nEsto buscará archivos que coincidan con los nombres de los broadcasts importados.')) {
      return;
    }

    try {
      const response = await axios.post('http://localhost:8000/api/broadcasts/match_source_files/', {
        repositorio_id: repositorioId
      });

      const { matched, not_matched, errors, available_files_count } = response.data;
      
      alert(
        `✅ Vinculación completada!\n\n` +
        `📁 Archivos disponibles: ${available_files_count}\n` +
        `✓ Vinculados: ${matched}\n` +
        `⚠️ No vinculados: ${not_matched}\n` +
        `❌ Errores: ${errors}`
      );
      
      // Refrescar si es necesario
      if (matched > 0) {
        fetchRepositorios();
      }
    } catch (err) {
      console.error('Error matching source files:', err);
      alert('Error al vincular archivos: ' + (err.response?.data?.error || err.message));
    }
  };

  // ----- ESTADO / SOPORTE -----
  const openStatusModal = async (repo) => {
    setStatusRepo(repo);
    setShowStatus(true);
    setStatusData(null);
    setPendingDetails({
      sin_archivo: { loading: false, items: [] },
      archivo_no_existe: { loading: false, items: [] },
      listo_para_iniciar: { loading: false, items: [] },
    });
    await fetchStatus(repo.id);
  };

  const closeStatusModal = () => {
    setShowStatus(false);
    setStatusRepo(null);
    setStatusData(null);
    setAutoRefresh(false);
  };

  const fetchStatus = async (repoId) => {
    try {
      setStatusLoading(true);
      const resp = await axios.get(`http://localhost:8000/api/broadcasts/transcode_status/?repositorio=${repoId}`);
      setStatusData(resp.data);
      // Auto-activar refresh si hay items procesando
      if (resp.data?.estados?.PROCESANDO > 0) {
        setAutoRefresh(true);
      } else {
        setAutoRefresh(false);
      }
    } catch (err) {
      console.error('Error obteniendo estado:', err);
      setStatusData({ error: err.response?.data?.error || err.message });
    } finally {
      setStatusLoading(false);
    }
  };

  const fetchPendingDetails = async (repoId, reason) => {
    try {
      setPendingDetails(prev => ({ ...prev, [reason]: { ...prev[reason], loading: true } }));
      const resp = await axios.get(`http://localhost:8000/api/broadcasts/pending_details/?repositorio=${repoId}&reason=${reason}&limit=200`);
      setPendingDetails(prev => ({ ...prev, [reason]: { loading: false, items: resp.data?.items || [] } }));
    } catch (err) {
      console.error('Error obteniendo pendientes:', err);
      setPendingDetails(prev => ({ ...prev, [reason]: { loading: false, items: [] } }));
      alert('Error al cargar detalles de pendientes: ' + (err.response?.data?.error || err.message));
    }
  };

  const retryErrors = async (repoId) => {
    if (!window.confirm('¿Reintentar todos los fallidos de este repositorio?')) return;
    try {
      const resp = await axios.post('http://localhost:8000/api/broadcasts/retry_errors/', { repositorio_id: repoId });
      alert(`✅ Se reintentaron ${resp.data.queued} broadcasts.\n⚠️ Omitidos ${resp.data.skipped_no_file} por archivo faltante.\n\n🔄 La transcodificación está en proceso. El panel se actualizará automáticamente cada 5 segundos.`);
      await fetchStatus(repoId);
    } catch (err) {
      console.error('Error reintentando fallidos:', err);
      alert('Error al reintentar: ' + (err.response?.data?.error || err.message));
    }
  };

  const retryOne = async (broadcastId) => {
    try {
      const resp = await axios.post(`http://localhost:8000/api/broadcasts/${broadcastId}/retry/`);
      alert('Reintentado: ' + (resp.data?.id || broadcastId));
      if (statusRepo) await fetchStatus(statusRepo.id);
    } catch (err) {
      console.error('Error reintentando item:', err);
      alert('Error al reintentar: ' + (err.response?.data?.error || err.message));
    }
  };

  const handlePreviewMatch = async (repositorioId) => {
    setShowPreview(true);
    setPreviewLoading(true);
    setPreviewData(null);
    setPreviewRepoId(repositorioId);
    try {
      const response = await axios.post('http://localhost:8000/api/broadcasts/match_source_files/', {
        repositorio_id: repositorioId,
        dry_run: true
      });
      setPreviewData(response.data);
    } catch (err) {
      console.error('Error en preview de vinculación:', err);
      setPreviewData({ error: err.response?.data?.error || err.message });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleApplyMatch = async () => {
    if (!previewRepoId) return;
    try {
      const response = await axios.post('http://localhost:8000/api/broadcasts/match_source_files/', {
        repositorio_id: previewRepoId,
        dry_run: false
      });
      const { matched, not_matched, errors, available_files_count } = response.data;
      alert(
        `✅ Vinculación aplicada!\n\n` +
        `📁 Archivos disponibles: ${available_files_count}\n` +
        `✓ Vinculados: ${matched}\n` +
        `⚠️ No vinculados: ${not_matched}\n` +
        `❌ Errores: ${errors}`
      );
      setShowPreview(false);
      setPreviewRepoId(null);
      setPreviewData(null);
      fetchRepositorios();
    } catch (err) {
      console.error('Error aplicando vinculación:', err);
      alert('Error al aplicar vinculación: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleStartBulkTranscode = async (repositorioId) => {
    if (!window.confirm('¿Iniciar transcodificación masiva?\n\nEsto procesará todos los broadcasts con archivo original que no han sido transcodificados.')) {
      return;
    }

    try {
      const response = await axios.post('http://localhost:8000/api/broadcasts/start_bulk_transcode/', {
        repositorio_id: repositorioId
      });

      const { total_initiated } = response.data;
      
      alert(
        `🎬 Transcodificación iniciada!\n\n` +
        `${total_initiated} broadcasts en proceso.\n\n` +
        `Puedes ver el progreso en la vista de Broadcasts.`
      );
      
    } catch (err) {
      console.error('Error starting bulk transcode:', err);
      alert('Error al iniciar transcodificación: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleUsersChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => parseInt(option.value));
    setFormData(prev => ({
      ...prev,
      users_asignados: selectedOptions
    }));
  };

  const handleModuloToggle = (moduloId) => {
    setFormData(prev => ({
      ...prev,
      modulos_ids: prev.modulos_ids.includes(moduloId)
        ? prev.modulos_ids.filter(id => id !== moduloId)
        : [...prev.modulos_ids, moduloId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate key (exactly 4 uppercase letters) - REQUIRED
    if (!formData.clave || formData.clave.length !== 4 || !/^[A-Z]{4}$/.test(formData.clave)) {
      setError('Key must be exactly 4 uppercase letters (A-Z)');
      return;
    }

    // Validate position required and numeric >= 0
    const pos = Number(formData.position);
    if (Number.isNaN(pos) || pos < 0) {
      setError('Position must be a number greater than or equal to 0.');
      return;
    }

    // Validate at least one module is selected
    if (formData.modulos_ids.length === 0) {
      setError('Must select at least one module for the repository');
      return;
    }

    try {
      // Construct payload explicitly to avoid sending local-only config
      const payload = {
        nombre: formData.name,
        position: formData.position,
        clave: formData.clave,
        activo: formData.activo,
        users_asignados: formData.users_asignados,
        modulos_ids: formData.modulos_ids,
      };
      if (editingRepo) {
        // Update existing repository
        await axios.patch(`http://localhost:8000/api/repositorios/${editingRepo.id}/`, payload);
      } else {
        // Create new repository
        await axios.post('http://localhost:8000/api/repositorios/', payload);
      }
      
      fetchRepositorios();
      handleCloseModal();
    } catch (err) {
      console.error('Error saving repositorio:', err);
      const data = err.response?.data;
      let msg = 'Error saving repository';
      if (data) {
        if (typeof data === 'string') {
          msg = data;
        } else if (data.detail) {
          msg = data.detail;
        } else if (typeof data === 'object') {
          try {
            const parts = Object.entries(data).map(([k, v]) => {
              const vv = Array.isArray(v) ? v.join(', ') : (typeof v === 'string' ? v : JSON.stringify(v));
              return `${k}: ${vv}`;
            });
            if (parts.length) msg = parts.join(' | ');
          } catch (_) {}
        }
      }
      setError(msg);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure to delete this repository? All associated files will be deleted.')) {
      return;
    }

    try {
      await axios.delete(`http://localhost:8000/api/repositorios/${id}/`);
      fetchRepositorios();
    } catch (err) {
      console.error('Error deleting repositorio:', err);
      alert('Error eliminar el repositorio');
    }
  };

  const toggleActivo = async (repo) => {
    try {
      await axios.patch(`http://localhost:8000/api/repositorios/${repo.id}/`, {
        activo: !repo.activo
      });
      fetchRepositorios();
    } catch (err) {
      console.error('Error toggling activo:', err);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4 flex justify-between items-center px-6 pt-4">
        <h2 className="text-2xl font-bold text-gray-800">Repository Management</h2>
        <div className="flex gap-3">
          <button
            onClick={() => handleOpenModal()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="white"><path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/></svg>
            <span>New Repository</span>
          </button>
          <button
            onClick={handleDeleteAllBroadcasts}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="white"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>
            <span>Delete All Broadcasts</span>
          </button>
        </div>
      </div>

      {/* Repositories Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-full">
          <thead className="bg-gray-100 border-b-2 border-gray-300 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase" style={{width: '4%'}}>Position</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase" style={{width: '18%'}}>Name</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase" style={{width: '6%'}}>Key</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase" style={{width: '14%'}}>Folio</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase" style={{width: '8%'}}>Status</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase" style={{width: '15%'}}>Modules</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase" style={{width: '35%'}}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {repositorios.map(repo => (
              <tr key={repo.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-3 text-center">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 text-gray-700 font-bold text-sm">
                    {repo.position ?? 0}
                  </span>
                </td>
                <td className="px-6 py-3 font-medium text-gray-900">
                  <div className="flex flex-col">
                    <span className="text-base font-bold text-indigo-700">{repo.nombre || repo.name}</span>
                    <span className="text-xs text-gray-500">ID: {repo.id}</span>
                  </div>
                </td>
                <td className="px-6 py-3">
                  <code className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">{repo.clave || '-'}</code>
                </td>
                <td className="px-6 py-3">
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-700">{repo.folio}</code>
                </td>
                <td className="px-6 py-3">
                  <button
                    onClick={() => toggleActivo(repo)}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                      repo.activo 
                        ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                    }`}
                  >
                    {repo.activo ? '✓ Active' : '✗ Inactive'}
                  </button>
                </td>
                <td className="px-6 py-3">
                  <div className="flex flex-wrap gap-1">
                    {repo.modulos_detalle && repo.modulos_detalle.length > 0 ? (
                      repo.modulos_detalle.map(modulo => (
                        <span 
                          key={modulo.id}
                          className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium"
                          title={modulo.name}
                        >
                          {modulo.tipo}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-400 italic">No modules</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-3">
                  <div className="flex space-x-1 items-center justify-center flex-wrap gap-1">
                    {/* Content */}
                    <div className="relative group">
                      <Link
                        to={`/repositorio/${repo.id}`}
                        className="inline-flex items-center justify-center p-2 text-indigo-600 hover:text-white hover:bg-indigo-600 rounded-lg border border-indigo-300 transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M320-240h320v-80H320v80Zm0-160h320v-80H320v80ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T720-80H240Zm280-520v-200H240v640h480v-440H520ZM240-800v200-200 640-640Z"/></svg>
                      </Link>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                        Content
                      </div>
                    </div>
                    
                    {/* Download CSV */}
                    <div className="relative group">
                      <button
                        onClick={() => handleExportCSV(repo.id)}
                        className="inline-flex items-center justify-center p-2 text-green-600 hover:text-white hover:bg-green-600 rounded-lg border border-green-300 transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z"/></svg>
                      </button>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                        Download CSV
                      </div>
                    </div>
                    
                    {/* Upload CSV */}
                    <div className="relative group">
                      <button
                        onClick={() => triggerFileInput(repo.id)}
                        className="inline-flex items-center justify-center p-2 text-blue-600 hover:text-white hover:bg-blue-600 rounded-lg border border-blue-300 transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M440-320v-326L336-542l-56-58 200-200 200 200-56 58-104-104v326h-80ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z"/></svg>
                      </button>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                        Upload CSV
                      </div>
                    </div>
                    
                    {/* Users */}
                    <div className="relative group">
                      <button
                          onClick={() => handleOpenUsuariosModal(repo)}
                        className="inline-flex items-center justify-center p-2 text-purple-600 hover:text-white hover:bg-purple-600 rounded-lg border border-purple-300 transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M40-160v-112q0-34 17.5-62.5T104-378q62-31 126-46.5T360-440q66 0 130 15.5T616-378q29 15 46.5 43.5T680-272v112H40Zm720 0v-120q0-44-24.5-84.5T666-434q51 6 96 20.5t84 35.5q36 20 55 44.5t19 53.5v120H760ZM360-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47Zm400-160q0 66-47 113t-113 47q-11 0-28-2.5t-28-5.5q27-32 41.5-71t14.5-81q0-42-14.5-81T544-792q14-5 28-6.5t28-1.5q66 0 113 47t47 113ZM120-240h480v-32q0-11-5.5-20T580-306q-54-27-109-40.5T360-360q-56 0-111 13.5T140-306q-9 5-14.5 14t-5.5 20v32Zm240-320q33 0 56.5-23.5T440-640q0-33-23.5-56.5T360-720q-33 0-56.5 23.5T280-640q0 33 23.5 56.5T360-560Zm0 320Zm0-400Z"/></svg>
                      </button>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                        Assign Users
                      </div>
                    </div>
                    
                    {/* Transcoding */}
                    <div className="relative group">
                      <button
                        onClick={() => handleStartBulkTranscode(repo.id)}
                        className="inline-flex items-center justify-center p-2 text-orange-600 hover:text-white hover:bg-orange-600 rounded-lg border border-orange-300 transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="m380-300 280-180-280-180v360ZM160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm0-80h640v-480H160v480Zm0 0v-480 480Z"/></svg>
                      </button>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                        Transcode
                      </div>
                    </div>

                    {/* Soporte/Estado */}
                    <div className="relative group">
                      <button
                        onClick={() => openStatusModal(repo)}
                        className="inline-flex items-center justify-center p-2 text-cyan-700 hover:text-white hover:bg-cyan-700 rounded-lg border border-cyan-300 transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M480-80q-83 0-156-31.5t-127.5-86Q141-252 110.5-325T79-480q0-83 31.5-156t85.5-127q54-54 127-85.5T480-880q83 0 156 31.5t127 85.5q54 54 85.5 127T880-480q0 81-31.5 154T763-199q-54 54-127 86.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-140q17 0 28.5-11.5T520-340q0-17-11.5-28.5T480-380q-17 0-28.5 11.5T440-340q0 17 11.5 28.5T480-300Zm-40-140h80v-240h-80v240Z"/></svg>
                      </button>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                        Soporte
                      </div>
                    </div>
                    
                    {/* Edit */}
                    <div className="relative group">
                      <button
                        onClick={() => handleOpenModal(repo)}
                        className="inline-flex items-center justify-center p-2 text-blue-700 hover:text-white hover:bg-blue-700 rounded-lg border border-blue-400 transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/></svg>
                      </button>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                        Edit
                      </div>
                    </div>
                    
                    {/* Delete */}
                    <div className="relative group">
                      <button
                        onClick={() => handleDelete(repo.id)}
                        className="inline-flex items-center justify-center p-2 text-red-600 hover:text-white hover:bg-red-600 rounded-lg border border-red-300 transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>
                      </button>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                        Delete
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {repositorios.length === 0 && (
          <div className="text-center py-12 text-gray-500 bg-white">
            <p className="text-xl mb-2">📁</p>
            <p>No repositories created</p>
            <button
              onClick={() => handleOpenModal()}
              className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
            >
              Create first repository
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <img 
                  src={editingRepo ? "/icons/edit.svg" : "/icons/add.svg"} 
                  alt={editingRepo ? "Edit" : "New"} 
                  className="w-7 h-7 brightness-0 invert" 
                />
                <span>{editingRepo ? 'Edit Repositorio' : 'New Repositorio'}</span>
              </h3>
              <button onClick={handleCloseModal} className="text-white hover:text-gray-200 text-2xl">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Block: Repository */}
              <fieldset className="border border-gray-200 rounded-md p-4">
                <legend className="px-2 text-sm font-semibold text-gray-700">Repository</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">* Name:</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={(e)=> setFormData(prev=> ({...prev, name: e.target.value}))}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {/* Folio - Auto-generated */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Folio:</label>
                    <input
                      type="text"
                      value={formData.folio || '(Auto-generated)'}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                    />
                    <p className="text-xs text-gray-500 mt-1">Auto-generated (~15 characters)</p>
                  </div>
                  {/* Position */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">* Position:</label>
                    <input
                      type="number"
                      name="position"
                      value={formData.position}
                      onChange={(e)=> setFormData(prev=> ({...prev, position: e.target.value}))}
                      min={0}
                      required
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">* Status:</label>
                    <select
                      name="activo"
                      value={formData.activo ? 'active' : 'inactive'}
                      onChange={(e)=> setFormData(prev => ({...prev, activo: e.target.value === 'active'}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  {/* Key - 4 UPPERCASE letters */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">* Key (4 letters):</label>
                    <input
                      type="text"
                      name="clave"
                      value={formData.clave}
                      onChange={(e)=> {
                        const val = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0,4);
                        setFormData(prev=>({...prev, clave: val}));
                      }}
                      maxLength={4}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono"
                      placeholder="ABCD"
                    />
                    <p className="text-xs text-gray-500 mt-1">Exactly 4 uppercase letters (A-Z)</p>
                  </div>
                </div>
              </fieldset>

              {/* Block: Configuration */}
              <fieldset className="border border-gray-200 rounded-md p-4">
                <legend className="px-2 text-sm font-semibold text-gray-700">Configuration</legend>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Modules (File Handlers)</div>
                  <div className="border border-gray-200 rounded-md divide-y">
                    {modulos
                      .filter(m => m.activo && ['audio', 'broadcast', 'images', 'reel', 'storage'].includes(m.tipo))
                      .map((modulo) => (
                      <label key={modulo.id} className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50">
                        <div>
                          <div className="text-gray-800">{modulo.nombre || modulo.name}</div>
                          <div className="text-xs text-gray-500">{modulo.descripcion || ''}</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={formData.modulos_ids.includes(modulo.id)}
                          onChange={() => handleModuloToggle(modulo.id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </fieldset>              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">{error}</div>
              )}

              {/* Buttons */}
              <div className="flex justify-end space-x-3">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview vinculación modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-indigo-600 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold">Preview de vinculación desde sources/</h3>
              <button onClick={() => setShowPreview(false)} className="text-white hover:text-gray-200 text-2xl">✕</button>
            </div>
            <div className="p-6">
              {previewLoading && (
                <div className="text-center py-10 text-gray-500">Cargando preview…</div>
              )}
              {!previewLoading && previewData && previewData.error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
                  {previewData.error}
                </div>
              )}
              {!previewLoading && previewData && !previewData.error && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatItem label="Archivos disponibles" value={previewData.available_files_count} color="text-gray-900"/>
                    <StatItem label="Broadcasts sin archivo" value={previewData.total_broadcasts} color="text-gray-900"/>
                    <StatItem label="Coincidencias" value={previewData.matched} color="text-green-700"/>
                    <StatItem label="No encontrados" value={previewData.not_matched} color="text-yellow-700"/>
                  </div>
                  {previewData.matched_list && previewData.matched_list.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">Ejemplos vinculados ({Math.min(previewData.matched_list.length, 50)} mostrados)</h4>
                      <ul className="text-sm text-gray-700 space-y-1 max-h-48 overflow-auto border rounded p-3 bg-gray-50">
                        {previewData.matched_list.map((m, idx) => (
                          <li key={idx} className="flex justify-between">
                            <span className="truncate" title={`${m.id_content || ''} ${m.nombre || ''}`}>#{m.id} • {m.id_content || '—'} • {m.nombre || '—'}</span>
                            <span className="ml-2 text-gray-500" title={m.archivo}>{m.archivo}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {previewData.not_matched_list && previewData.not_matched_list.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">Not found (first 50)</h4>
                      <ul className="text-sm text-gray-700 space-y-1 max-h-48 overflow-auto border rounded p-3 bg-gray-50">
                        {previewData.not_matched_list.map((m, idx) => (
                          <li key={idx} className="flex justify-between">
                            <span className="truncate" title={`${m.id_content || ''} ${m.nombre || ''}`}>#{m.id} • {m.id_content || '—'} • {m.nombre || '—'}</span>
                            <span className="ml-2 text-gray-500">{m.reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              <div className="flex justify-end space-x-3 pt-6">
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  disabled={previewLoading || !previewData || previewData.error}
                  onClick={handleApplyMatch}
                  className={`px-4 py-2 rounded-md text-white ${previewLoading || !previewData || previewData.error ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                  title="Aplicar vinculación"
                >
                  Aplicar vinculación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Soporte / Estado */}
      {showStatus && statusRepo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-cyan-700 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold">Soporte / Estado de Transcodificación — {statusRepo.nombre}</h3>
              <button onClick={closeStatusModal} className="text-white hover:text-gray-200 text-2xl">✕</button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-3 flex-wrap">
                <button onClick={() => fetchStatus(statusRepo.id)} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded border">Actualizar</button>
                <button onClick={() => retryErrors(statusRepo.id)} className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded">Reintentar fallidos</button>
                <div className="flex items-center gap-2 ml-auto">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                      className="w-4 h-4"
                    />
                    Auto-actualizar cada 5 seg
                  </label>
                  {autoRefresh && statusData?.estados?.PROCESANDO > 0 && (
                    <span className="text-xs text-green-700 font-medium animate-pulse">🔄 Actualizando...</span>
                  )}
                </div>
              </div>

              {statusLoading && (
                <div className="text-gray-500">Cargando estado…</div>
              )}
              {!statusLoading && statusData && statusData.error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">{statusData.error}</div>
              )}
              {!statusLoading && statusData && !statusData.error && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <StatItem label="Total" value={statusData.total} />
                    <StatItem label="Completado" value={statusData.estados?.COMPLETADO ?? 0} color="text-green-700" />
                    <StatItem label="Error" value={statusData.estados?.ERROR ?? 0} color="text-red-700" />
                    <StatItem label="Procesando" value={statusData.estados?.PROCESANDO ?? 0} color="text-orange-700" />
                    <StatItem label="Pendiente" value={statusData.estados?.PENDIENTE ?? 0} color="text-yellow-700" />
                  </div>

                  {/* Barra de progreso */}
                  {statusData.total > 0 && (
                    <div className="border rounded p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-800">Progreso de Transcodificación</h4>
                        <div className="text-sm text-gray-600">
                          {statusData.estados?.COMPLETADO ?? 0} / {statusData.total} 
                          {' '}({Math.round(((statusData.estados?.COMPLETADO ?? 0) / statusData.total) * 100)}%)
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden shadow-inner">
                        <div 
                          className="bg-gradient-to-r from-green-500 to-green-600 h-full transition-all duration-500 flex items-center justify-center text-white text-xs font-bold"
                          style={{ width: `${Math.round(((statusData.estados?.COMPLETADO ?? 0) / statusData.total) * 100)}%` }}
                        >
                          {Math.round(((statusData.estados?.COMPLETADO ?? 0) / statusData.total) * 100) > 5 && 
                            `${Math.round(((statusData.estados?.COMPLETADO ?? 0) / statusData.total) * 100)}%`
                          }
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
                        <div className="flex items-center gap-4">
                          {statusData.estados?.PROCESANDO > 0 && (
                            <span className="flex items-center gap-1">
                              <span className="inline-block w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                              {statusData.estados.PROCESANDO} procesando
                            </span>
                          )}
                          {statusData.estados?.ERROR > 0 && (
                            <span className="flex items-center gap-1">
                              <span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span>
                              {statusData.estados.ERROR} fallaron
                            </span>
                          )}
                          {statusData.estados?.PENDIENTE > 0 && (
                            <span className="flex items-center gap-1">
                              <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full"></span>
                              {statusData.estados.PENDIENTE} pendientes
                            </span>
                          )}
                        </div>
                        {statusData.estados?.PROCESANDO > 0 && (
                          <span className="text-orange-700 font-medium">
                            ⏱️ Tiempo estimado: ~{Math.ceil((statusData.estados.PROCESANDO * 30) / 60)} min
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Pendientes por razón */}
                  <div className="border rounded p-4 bg-gray-50">
                    <h4 className="font-semibold text-gray-800 mb-3">Pendientes por razón</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {['Sin archivo original','Archivo no existe','Listo para iniciar'].map((label, idx) => {
                        const key = idx === 0 ? 'sin_archivo' : idx === 1 ? 'archivo_no_existe' : 'listo_para_iniciar';
                        const count = statusData.pendientes_por_razon?.[label] ?? 0;
                        return (
                          <div key={key} className="border bg-white rounded p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm text-gray-600">{label}</div>
                                <div className="text-lg font-semibold">{count}</div>
                              </div>
                              <button
                                disabled={count === 0 || pendingDetails[key].loading}
                                onClick={() => fetchPendingDetails(statusRepo.id, key)}
                                className={`px-3 py-1 rounded text-sm ${count === 0 ? 'bg-gray-200 text-gray-500' : 'bg-cyan-700 text-white hover:bg-cyan-800'}`}
                              >
                                Ver detalles
                              </button>
                            </div>
                            {pendingDetails[key].loading && (
                              <div className="text-xs text-gray-500 mt-2">Cargando…</div>
                            )}
                            {!pendingDetails[key].loading && pendingDetails[key].items?.length > 0 && (
                              <ul className="text-xs text-gray-700 mt-2 space-y-1 max-h-40 overflow-auto">
                                {pendingDetails[key].items.map((it, ix) => (
                                  <li key={ix} className="flex justify-between gap-2">
                                    <span className="truncate" title={it.nombre || ''}>#{it.id} • {it.nombre || '—'}</span>
                                    <span className="text-gray-500 truncate" title={it.archivo || ''}>{it.archivo || ''}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Errores muestras */}
                  <div className="border rounded p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-800">Errores Detallados ({statusData.errores_muestras?.length || 0} muestras)</h4>
                      {statusData.estados?.ERROR > 0 && (
                        <button 
                          onClick={() => retryErrors(statusRepo.id)}
                          className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm"
                        >
                          Reintentar todos
                        </button>
                      )}
                    </div>
                    {(!statusData.errores_muestras || statusData.errores_muestras.length === 0) && (
                      <div className="text-sm text-gray-500 bg-white border rounded p-4 text-center">
                        ✅ Sin errores - Todos los archivos se procesaron correctamente
                      </div>
                    )}
                    {statusData.errores_muestras && statusData.errores_muestras.length > 0 && (
                      <div className="space-y-3">
                        {statusData.errores_muestras.map((e, idx) => {
                          // Extraer razón de error del last_error
                          let razonCorta = 'Error desconocido';
                          if (e.last_error) {
                            if (e.last_error.includes('No such file') || e.last_error.includes('does not exist')) {
                              razonCorta = '📁 Archivo no encontrado en disco';
                            } else if (e.last_error.includes('Invalid data found') || e.last_error.includes('could not find codec')) {
                              razonCorta = '🎞️ Archivo dañado o codec no soportado';
                            } else if (e.last_error.includes('pcm') || e.last_error.includes('audio only') || e.last_error.includes('no video')) {
                              razonCorta = '🎵 Archivo solo tiene audio (sin video)';
                            } else if (e.last_error.includes('Permission denied')) {
                              razonCorta = '🔒 Sin permisos de lectura';
                            } else if (e.last_error.includes('utf-8')) {
                              razonCorta = '⚠️ Error de codificación de caracteres';
                            } else {
                              razonCorta = '❌ Error de FFmpeg';
                            }
                          }
                          
                          return (
                            <div key={idx} className="bg-white border border-red-200 rounded p-3 hover:shadow-md transition-shadow">
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-medium text-gray-900 truncate mb-1" title={e.nombre || ''}>
                                    📄 {e.nombre || '—'}
                                  </div>
                                  <div className="text-xs text-gray-500 truncate mb-2" title={e.archivo || ''}>
                                    📂 {e.archivo || 'Sin archivo'}
                                  </div>
                                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 border border-red-200 rounded-full text-xs font-medium text-red-700">
                                    {razonCorta}
                                  </div>
                                </div>
                                <button 
                                  onClick={() => retryOne(e.id)} 
                                  className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm font-medium whitespace-nowrap flex items-center gap-1"
                                  title="Reintentar este archivo"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="white"><path d="M480-160q-133 0-226.5-93.5T160-480q0-133 93.5-226.5T480-800q85 0 149 34.5T740-671v-129h60v254H546v-60h168q-38-60-97-97t-137-37q-109 0-184.5 75.5T220-480q0 109 75.5 184.5T480-220q83 0 152-47.5T728-393h62q-29 105-115 169t-195 64Z"/></svg>
                                  Reintentar
                                </button>
                              </div>
                              {e.last_error && (
                                <details className="mt-2">
                                  <summary className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer font-medium">
                                    Ver error completo
                                  </summary>
                                  <pre className="mt-2 text-xs text-red-700 bg-red-50 border border-red-100 p-3 rounded whitespace-pre-wrap max-h-60 overflow-auto font-mono">
                                    {e.last_error}
                                  </pre>
                                </details>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="flex justify-end">
                <button onClick={closeStatusModal} className="px-4 py-2 border rounded">Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Modal para asignar usuarios a repositorio */}
        {showUsuariosModal && selectedRepoForUsers && (
          <RepoUsuariosModal
            repositorio={selectedRepoForUsers}
            onClose={handleCloseUsuariosModal}
            onSave={fetchRepositorios}
          />
        )}
    </div>
  );
}

// Componente pequeño para stats visuales
function StatItem({ label, value, color = 'text-gray-900' }) {
  return (
    <div className="border rounded p-3 bg-white">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}
