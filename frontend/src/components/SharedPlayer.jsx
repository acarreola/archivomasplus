import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import VideoPlayer from './VideoPlayer';

const API_BASE = 'http://localhost:8000/api';

export default function SharedPlayer() {
  const { linkId } = useParams();
  const [linkData, setLinkData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [hasPlayed, setHasPlayed] = useState(false);

  useEffect(() => {
    loadSharedLink();
  }, [linkId]);

  const loadSharedLink = async (pwd = null) => {
    setLoading(true);
    setError(null);

    try {
      const url = `${API_BASE}/shared/${linkId}/`;
      const params = pwd ? { password: pwd } : {};
      
      const response = await axios.get(url, { params });
      setLinkData(response.data);
      setRequiresPassword(false);
    } catch (err) {
      if (err.response?.data?.requires_password) {
        setRequiresPassword(true);
      } else {
        setError(err.response?.data?.error || 'Error cargar el contenido compartido');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    loadSharedLink(password);
  };

  const handlePlay = async () => {
    if (!hasPlayed) {
      try {
        await axios.post(`${API_BASE}/shared/${linkId}/`, {
          action: 'play',
          password: password || undefined
        });
        setHasPlayed(true);
      } catch (err) {
        console.error('Error registering play:', err);
      }
    }
  };

  const handleDownload = (type = 'proxy') => {
    const url = type === 'original' 
      ? linkData.comercial_data.video_url.replace('proxy', 'originals')
      : linkData.comercial_data.video_url;
    
    const filename = `${linkData.comercial_data.pizarra?.producto || 'comercial'}_${type}.mp4`;
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white text-xl">Cargando...</p>
        </div>
      </div>
    );
  }

  if (requiresPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg shadow-2xl p-8 max-w-md w-full border border-gray-700">
          <div className="text-center mb-6">
            <svg className="w-16 h-16 text-blue-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h1 className="text-2xl font-bold text-white">Contenido Protegido</h1>
            <p className="text-gray-400 mt-2">Este contenido requiere una password para acceder</p>
          </div>
          
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa el password"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                autoFocus
              />
            </div>
            
            {error && (
              <div className="bg-red-500 bg-opacity-20 border border-red-500 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
            
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-all duration-200"
            >
              Acceder
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg shadow-2xl p-8 max-w-md w-full border border-red-900">
          <div className="text-center">
            <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h1 className="text-2xl font-bold text-white mb-2">Error</h1>
            <p className="text-gray-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!linkData) return null;

  const { comercial_data } = linkData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Header */}
      <div className="bg-gray-800 bg-opacity-90 backdrop-blur-sm border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {linkData.titulo || 'Contenido Compartido'}
            </h1>
            {comercial_data.pizarra && (
              <p className="text-gray-400 mt-1">
                {comercial_data.pizarra.cliente} - {comercial_data.pizarra.producto}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Compartido desde</p>
            <p className="font-semibold text-blue-400">{comercial_data.repositorio_name}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Video Player */}
        <div className="bg-gray-800 rounded-lg shadow-2xl overflow-hidden border border-gray-700 mb-6">
          <VideoPlayer
            src={comercial_data.video_url}
            poster={comercial_data.thumbnail_url}
            onPlay={handlePlay}
          />
        </div>

        {/* Metadata & Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Metadata */}
          <div className="lg:col-span-2 bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4">Commercial Information</h2>
            <div className="grid grid-cols-2 gap-4">
              {comercial_data.pizarra && Object.entries(comercial_data.pizarra).map(([key, value]) => (
                value && (
                  <div key={key}>
                    <p className="text-sm text-gray-400 uppercase">{key}</p>
                    <p className="text-white font-medium">{value}</p>
                  </div>
                )
              ))}
            </div>
          </div>

          {/* Actions */}
          {linkData.permitir_descarga && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-bold text-white mb-4">Descargar</h2>
              <div className="space-y-3">
                <button
                  onClick={() => handleDownload('proxy')}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Descargar Proxy
                </button>
                
                <p className="text-xs text-gray-500 text-center">
                  Format optimizado para web
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center text-gray-500 text-sm">
          <p>
            Compartido el {new Date(linkData.date_creacion).toLocaleDateString('es-MX', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
          <p className="mt-2 text-xs">
            Powered by <span className="text-blue-400 font-semibold">file+</span>
          </p>
        </div>
      </div>
    </div>
  );
}
