import { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';

function CreateDirectoryModal({ repositorioId, moduloId, repositorioName, moduloName, editingDirectory, onClose, onSuccess }) {
  const { t } = useLanguage();
  const [nameFolder, setNameFolder] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingDirectory) {
      // Backend field is 'nombre'
      setNameFolder(editingDirectory.nombre || editingDirectory.name || '');
    } else {
      setNameFolder('');
    }
  }, [editingDirectory]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!nameFolder.trim()) {
      setError(t ? 'El name del folder no puede estar vacío' : 'Directory name cannot be empty');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = {
        nombre: nameFolder.trim().toUpperCase(),
        repositorio: repositorioId,
        modulo: moduloId || null,
        parent: null // raíz por ahora
      };

      console.log('📁 Creando folder con data:', data);

      if (editingDirectory) {
        // Actualizar directorio existente
        await axios.put(`http://localhost:8000/api/directorios/${editingDirectory.id}/`, data);
      } else {
        // Crear nuevo directorio
        await axios.post('http://localhost:8000/api/directorios/', data);
      }
      
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error guardar directorio:', err);
      if (err.response?.data) {
        const errorMsg = err.response.data.nombre?.[0] || 
                        err.response.data.non_field_errors?.[0] || 
                        (t ? 'Error al guardar el directorio' : 'Error saving directory');
        setError(errorMsg);
      } else {
        setError(t ? 'Error al guardar el directorio. Intenta de nuevo.' : 'Error saving directory. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white px-6 py-4 flex justify-between items-center rounded-t-lg">
          <h2 className="text-xl font-semibold flex items-center space-x-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            <span>{editingDirectory ? 'Edit Folder' : (t ? t('actions.createDirectory') : 'Create Directory')}</span>
          </h2>
          <button 
            onClick={onClose}
            className="text-white hover:text-gray-200 text-2xl font-bold"
            disabled={loading}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t ? 'Repository:' : 'Repository:'}
            </label>
            <div className="bg-gray-100 px-4 py-2 rounded-lg border border-gray-300">
              <span className="text-gray-800 font-medium">{repositorioName}</span>
            </div>
          </div>

          {moduloName && (
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Module:
              </label>
              <div className="bg-purple-100 px-4 py-2 rounded-lg border border-purple-300">
                <span className="text-purple-800 font-medium">{moduloName}</span>
              </div>
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t ? 'Directory Name:' : 'Directory Name:'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nameFolder}
              onChange={(e) => {
                setNameFolder(e.target.value);
                setError('');
              }}
              placeholder={t ? 'e.g: Campaign 2025, TV Commercials, etc.' : 'e.g: Campaign 2025, TV Commercials, etc.'}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent uppercase"
              disabled={loading}
              autoFocus
            />
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
              <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-colors"
              disabled={loading}
            >
              {t ? 'Cancel' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              disabled={loading || !nameFolder.trim()}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t ? 'Creando...' : 'Creating...'}
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t ? 'Create Folder' : 'Create Directory'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateDirectoryModal;
