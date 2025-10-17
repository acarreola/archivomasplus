import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:8000/api';

export default function ShareModal({ comercial, onClose }) {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [copied, setCopied] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    titulo: '',
    password: '',
    date_expiracion: '',
    permitir_descarga: true,
    activo: true
  });

  useEffect(() => {
    loadLinks();
  }, [comercial.id]);

  const loadLinks = async () => {
    try {
      const response = await axios.get(`${API_BASE}/shared-links/by-comercial/${comercial.id}/`);
      setLinks(response.data);
    } catch (error) {
      console.error('Error loading links:', error);
    }
  };

  const handleCreateLink = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        comercial: comercial.id,
        titulo: formData.titulo || `${comercial.pizarra?.producto || 'Comercial'} - Share`,
        password: formData.password || null,
        date_expiracion: formData.date_expiracion || null,
        permitir_descarga: formData.permitir_descarga,
        activo: formData.activo
      };

      await axios.post(`${API_BASE}/shared-links/`, payload);
      
      // Reset form
      setFormData({
        titulo: '',
        password: '',
        date_expiracion: '',
        permitir_descarga: true,
        activo: true
      });
      
      setShowCreateForm(false);
      await loadLinks();
    } catch (error) {
      console.error('Error creating link:', error);
      alert('Error crear el link compartido');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = (url) => {
    const fullUrl = `${window.location.origin}${url}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(url);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleToggleActive = async (link) => {
    try {
      await axios.patch(`${API_BASE}/shared-links/${link.id}/`, {
        activo: !link.activo
      });
      await loadLinks();
    } catch (error) {
      console.error('Error updating link:', error);
    }
  };

  const handleDeleteLink = async (linkId) => {
    if (!confirm('Are you sure de eliminar este link?')) return;
    
    try {
      await axios.delete(`${API_BASE}/shared-links/${linkId}/`);
      await loadLinks();
    } catch (error) {
      console.error('Error deleting link:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Sin expiración';
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-blue-700 px-6 py-4 flex items-center justify-between border-b-2 border-blue-800">
          <div>
            <h2 className="text-2xl font-bold text-white">Compartir Comercial</h2>
            <p className="text-blue-200 text-sm mt-1">
              {comercial.pizarra?.cliente} - {comercial.pizarra?.producto}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-300 transition-colors text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-800">
          {/* Create New Link Button */}
          {!showCreateForm && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full mb-6 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <span className="text-lg font-bold">+</span>
              Create New Link Compartido
            </button>
          )}

          {/* Create Form */}
          {showCreateForm && (
            <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-4">New Link</h3>
              <form onSubmit={handleCreateLink} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Título (opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.titulo}
                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                    placeholder={`${comercial.pizarra?.producto || 'Comercial'} - Share`}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Password (opcional)
                    </label>
                    <input
                      type="text"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Dejar vacío para acceso libre"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Date de Expiración (opcional)
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.date_expiracion}
                      onChange={(e) => setFormData({ ...formData, date_expiracion: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.permitir_descarga}
                      onChange={(e) => setFormData({ ...formData, permitir_descarga: e.target.checked })}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm">Permitir descarga</span>
                  </label>

                  <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.activo}
                      onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm">Link activo</span>
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                  >
                    {loading ? 'Creando...' : 'Create Link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Links List */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white mb-4">
              Links Compartidos ({links.length})
            </h3>

            {links.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <p>No hay links compartidos para este comercial</p>
                <p className="text-sm mt-2">Crea uno para compartir con clientes o colaboradores</p>
              </div>
            ) : (
              links.map((link) => (
                <div
                  key={link.id}
                  className={`bg-gray-800 rounded-lg p-4 border ${
                    link.activo ? 'border-gray-700' : 'border-red-900 bg-red-900 bg-opacity-20'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-white text-lg">{link.titulo}</h4>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          {link.vistas} vistas
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {link.reproducciones} plays
                        </span>
                        {link.password && (
                          <span className="flex items-center gap-1 text-yellow-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Con password
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Expira: {formatDate(link.date_expiracion)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {link.esta_vigente ? (
                        <span className="px-2 py-1 bg-green-500 bg-opacity-20 text-green-400 text-xs font-semibold rounded">
                          ACTIVO
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-red-500 bg-opacity-20 text-red-400 text-xs font-semibold rounded">
                          INACTIVO
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Link URL */}
                  <div className="flex items-center gap-2 bg-gray-900 rounded-lg p-3 mb-3">
                    <input
                      type="text"
                      value={`${window.location.origin}${link.url}`}
                      readOnly
                      className="flex-1 bg-transparent text-blue-400 text-sm focus:outline-none"
                    />
                    <button
                      onClick={() => handleCopyLink(link.url)}
                      className="px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded transition-colors"
                    >
                      {copied === link.url ? '✓ Copiado' : 'Copiar'}
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleActive(link)}
                      className={`flex-1 py-2 px-4 rounded text-sm font-semibold transition-colors ${
                        link.activo
                          ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {link.activo ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      onClick={() => handleDeleteLink(link.id)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-800 px-6 py-4 border-t border-gray-700">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
