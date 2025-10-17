// frontend/src/UploadForm.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function UploadForm({ onUploadSuccess }) {
  const [repositorios, setRepositorios] = useState([]);
  const [formData, setFormData] = useState({
    repositorio: '',
    producto: '',
    version: '',
    duracion: '',
    archivo_original: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    // Cargar repositorios activos
    axios.get('http://localhost:8000/api/repositorios/')
      .then(res => {
        const activos = res.data.filter(r => r.activo);
        setRepositorios(activos);
        if (activos.length > 0) {
          setFormData(prev => ({ ...prev, repositorio: activos[0].id }));
        }
      })
      .catch(err => console.error('Error al cargar repositorios:', err));
  }, []);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.archivo_original || !formData.repositorio) {
      setError('You must select a repository and a video file.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    setUploadProgress(0);

    const data = new FormData();
    data.append('repositorio', formData.repositorio);
    data.append('archivo_original', formData.archivo_original);
    
    // Crear objeto pizarra con los metadatos
    const pizarra = {
      producto: formData.producto || 'Sin especificar',
      version: formData.version || 'v1',
      duracion: formData.duracion || '00:00:00'
    };
    data.append('pizarra', JSON.stringify(pizarra));

    try {
      await axios.post('http://localhost:8000/api/broadcasts/', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });
      
      // Reset form
      setFormData({
        repositorio: repositorios.length > 0 ? repositorios[0].id : '',
        producto: '',
        version: '',
        duracion: '',
        archivo_original: null,
      });
      setUploadProgress(0);
      
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (err) {
      console.error('Error al subir el archivo:', err.response?.data);
      setError(err.response?.data?.detail || 'Error al subir el archivo. Revisa la consola para más detalles.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow mb-6">
      <h3 className="text-xl font-semibold mb-4">Subir Nuevo Comercial</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Selector de Repositorio */}
          <div>
            <label htmlFor="repositorio" className="block text-sm font-medium text-gray-700 mb-1">
              Repositorio *
            </label>
            <select 
              id="repositorio" 
              name="repositorio" 
              value={formData.repositorio} 
              onChange={handleChange} 
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
              required
            >
              <option value="">Select a repository</option>
              {repositorios.map(r => (
                <option key={r.id} value={r.id}>
                  {r.folio} - {r.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Producto */}
          <div>
            <label htmlFor="producto" className="block text-sm font-medium text-gray-700 mb-1">
              Producto
            </label>
            <input 
              type="text" 
              id="producto" 
              name="producto" 
              value={formData.producto} 
              onChange={handleChange} 
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
              placeholder="Ej: Coca-Cola Zero"
            />
          </div>

          {/* Versión */}
          <div>
            <label htmlFor="version" className="block text-sm font-medium text-gray-700 mb-1">
              Versión
            </label>
            <input 
              type="text" 
              id="version" 
              name="version" 
              value={formData.version} 
              onChange={handleChange} 
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
              placeholder="Ej: v1, 30seg, final"
            />
          </div>

          {/* Duración */}
          <div>
            <label htmlFor="duracion" className="block text-sm font-medium text-gray-700 mb-1">
              Duración
            </label>
            <input 
              type="text" 
              id="duracion" 
              name="duracion" 
              value={formData.duracion} 
              onChange={handleChange} 
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
              placeholder="Ej: 00:00:30"
            />
          </div>
        </div>

        {/* Archivo de Video */}
        <div>
          <label htmlFor="archivo_original" className="block text-sm font-medium text-gray-700 mb-1">
            Archivo de Video *
          </label>
          <input 
            type="file" 
            id="archivo_original" 
            name="archivo_original" 
            onChange={handleChange} 
            accept="video/*"
            className="block w-full text-sm text-gray-500 
              file:mr-4 file:py-2 file:px-4 
              file:rounded-md file:border-0 
              file:text-sm file:font-semibold 
              file:bg-indigo-50 file:text-indigo-600 
              hover:file:bg-indigo-100 cursor-pointer"
            required 
          />
        </div>

        {/* Barra de progreso */}
        {isSubmitting && uploadProgress > 0 && (
          <div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-1 text-center">{uploadProgress}% subido</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Botón de envío */}
        <div className="pt-2">
          <button 
            type="submit" 
            disabled={isSubmitting || repositorios.length === 0} 
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
          >
            {isSubmitting ? 'Subiendo...' : 'Subir Comercial'}
          </button>
        </div>
      </form>
    </div>
  );
}