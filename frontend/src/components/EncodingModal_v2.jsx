import { useState, useEffect } from 'react';
import axios from '../utils/axios';

// Presets profesionales basados en FFWorks
const ENCODING_PRESETS = {
  broadcast: [
    {
      id: 'prores-422hq',
      name: 'ProRes 422 HQ',
      descripcion: 'Alta calidad para edición broadcast',
      formato: 'mov',
      codec: 'prores_ks',
      profile: '3', // HQ
      resolution: 'original',
      fps: 'original',
      audio_codec: 'pcm_s16le',
      audio_bitrate: '1411k'
    },
    {
      id: 'prores-422',
      name: 'ProRes 422',
      descripcion: 'Calidad estándar para broadcast',
      formato: 'mov',
      codec: 'prores_ks',
      profile: '2', // Standard
      resolution: 'original',
      fps: 'original',
      audio_codec: 'pcm_s16le',
      audio_bitrate: '1411k'
    },
    {
      id: 'dnxhd-185',
      name: 'DNxHD 185',
      descripcion: 'Avid DNxHD 1920x1080 185Mbps',
      formato: 'mov',
      codec: 'dnxhd',
      bitrate_video: '185M',
      resolution: '1920x1080',
      fps: '25',
      audio_codec: 'pcm_s16le',
      audio_bitrate: '1411k'
    }
  ],
  web: [
    {
      id: 'h264-high',
      name: 'H.264 High Quality',
      descripcion: 'Alta calidad para web y redes sociales',
      formato: 'mp4',
      codec: 'libx264',
      preset: 'slow',
      crf: '18',
      resolution: '1920x1080',
      fps: '30',
      audio_codec: 'aac',
      audio_bitrate: '192k',
      profile: 'high',
      level: '4.2'
    },
    {
      id: 'h264-medium',
      name: 'H.264 Medium',
      descripcion: 'Balance calidad/tamaño para web',
      formato: 'mp4',
      codec: 'libx264',
      preset: 'medium',
      crf: '23',
      resolution: '1920x1080',
      fps: '30',
      audio_codec: 'aac',
      audio_bitrate: '128k',
      profile: 'main',
      level: '4.0'
    },
    {
      id: 'h265-high',
      name: 'H.265 High Efficiency',
      descripcion: 'HEVC para streaming moderno',
      formato: 'mp4',
      codec: 'libx265',
      preset: 'medium',
      crf: '24',
      resolution: '1920x1080',
      fps: '30',
      audio_codec: 'aac',
      audio_bitrate: '128k'
    },
    {
      id: 'vp9-web',
      name: 'VP9 Web',
      descripcion: 'Google VP9 para YouTube/streaming',
      formato: 'webm',
      codec: 'libvpx-vp9',
      crf: '30',
      bitrate_video: '0', // VBR
      resolution: '1920x1080',
      fps: '30',
      audio_codec: 'libopus',
      audio_bitrate: '128k'
    }
  ],
  mobile: [
    {
      id: 'iphone-optimized',
      name: 'iPhone Optimized',
      descripcion: 'Optimizado para dispositivos Apple',
      formato: 'mp4',
      codec: 'libx264',
      preset: 'medium',
      crf: '23',
      resolution: '1920x1080',
      fps: '30',
      audio_codec: 'aac',
      audio_bitrate: '128k',
      profile: 'high',
      pixel_format: 'yuv420p'
    },
    {
      id: 'android-optimized',
      name: 'Android Optimized',
      descripcion: 'Compatible con dispositivos Android',
      formato: 'mp4',
      codec: 'libx264',
      preset: 'medium',
      crf: '23',
      resolution: '1920x1080',
      fps: '30',
      audio_codec: 'aac',
      audio_bitrate: '128k',
      profile: 'baseline',
      level: '3.1'
    },
    {
      id: 'mobile-hd',
      name: 'Mobile HD',
      descripcion: 'HD optimizado para móviles',
      formato: 'mp4',
      codec: 'libx264',
      preset: 'fast',
      crf: '26',
      resolution: '1280x720',
      fps: '30',
      audio_codec: 'aac',
      audio_bitrate: '96k',
      profile: 'main'
    }
  ],
  social: [
    {
      id: 'instagram-feed',
      name: 'Instagram Feed',
      descripcion: 'Cuadrado 1:1 para Instagram',
      formato: 'mp4',
      codec: 'libx264',
      preset: 'medium',
      crf: '23',
      resolution: '1080x1080',
      fps: '30',
      audio_codec: 'aac',
      audio_bitrate: '128k',
      profile: 'main'
    },
    {
      id: 'instagram-story',
      name: 'Instagram Story',
      descripcion: 'Vertical 9:16 para historias',
      formato: 'mp4',
      codec: 'libx264',
      preset: 'medium',
      crf: '23',
      resolution: '1080x1920',
      fps: '30',
      audio_codec: 'aac',
      audio_bitrate: '128k',
      profile: 'main'
    },
    {
      id: 'youtube-4k',
      name: 'YouTube 4K',
      descripcion: 'Ultra HD para YouTube',
      formato: 'mp4',
      codec: 'libx264',
      preset: 'slow',
      crf: '18',
      resolution: '3840x2160',
      fps: '30',
      audio_codec: 'aac',
      audio_bitrate: '192k',
      profile: 'high'
    },
    {
      id: 'facebook-hd',
      name: 'Facebook HD',
      descripcion: 'Optimizado para Facebook',
      formato: 'mp4',
      codec: 'libx264',
      preset: 'medium',
      crf: '23',
      resolution: '1920x1080',
      fps: '30',
      audio_codec: 'aac',
      audio_bitrate: '128k',
      profile: 'main'
    }
  ]
};

const RESOLUCIONES_CUSTOM = [
  { label: '4K UHD (3840x2160)', value: '3840x2160' },
  { label: 'QHD (2560x1440)', value: '2560x1440' },
  { label: 'Full HD (1920x1080)', value: '1920x1080' },
  { label: 'HD (1280x720)', value: '1280x720' },
  { label: 'SD (854x480)', value: '854x480' },
  { label: 'Instagram Square (1080x1080)', value: '1080x1080' },
  { label: 'Instagram Story (1080x1920)', value: '1080x1920' },
  { label: 'Mantener Original', value: 'original' },
  { label: 'Personalizado', value: 'custom' }
];

const FPS_OPTIONS = [
  { label: 'Mantener Original', value: 'original' },
  { label: '23.976 fps (Film)', value: '23.976' },
  { label: '24 fps', value: '24' },
  { label: '25 fps (PAL)', value: '25' },
  { label: '29.97 fps (NTSC)', value: '29.97' },
  { label: '30 fps', value: '30' },
  { label: '50 fps', value: '50' },
  { label: '60 fps', value: '60' }
];

function EncodingModal({ comercial, onClose, onSuccess }) {
  const [activeCategory, setActiveCategory] = useState('web');
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [customMode, setCustomMode] = useState(false);
  const [encoding, setEncoding] = useState(false);
  const [currentComercial, setCurrentComercial] = useState(comercial);
  const [pollingInterval, setPollingInterval] = useState(null);
  
  // Custom settings
  const [customSettings, setCustomSettings] = useState({
    formato: 'mp4',
    codec: 'libx264',
    resolution: '1920x1080',
    customWidth: '',
    customHeight: '',
    fps: '30',
    crf: '23',
    preset: 'medium',
    bitrate_video: '',
    audio_codec: 'aac',
    audio_bitrate: '128k',
    profile: 'main',
    pixel_format: 'yuv420p'
  });

  // Función para refrescar datos del comercial
  const refreshComercial = async () => {
    try {
      const response = await axios.get(`/api/broadcasts/${comercial.id}/`);
      setCurrentComercial(response.data);
    } catch (error) {
      console.error('Error refrescar comercial:', error);
    }
  };

  // Polling cuando está codificando
  useEffect(() => {
    if (encoding) {
      // Verificar cada 5 segundos
      const interval = setInterval(refreshComercial, 5000);
      setPollingInterval(interval);
      
      return () => {
        if (interval) clearInterval(interval);
      };
    } else {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    }
  }, [encoding]);

  // Limpiar polling al desmontar
  useEffect(() => {
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [pollingInterval]);

  const handlePresetSelect = (preset) => {
    setSelectedPreset(preset);
    setCustomMode(false);
  };

  const handleCustomToggle = () => {
    setCustomMode(!customMode);
    setSelectedPreset(null);
  };

  const handleEncode = async () => {
    if (!selectedPreset && !customMode) {
      alert('Please select un preset o activa el modo personalizado');
      return;
    }

    const previousEncodedCount = currentComercial.encoded_files?.length || 0;
    setEncoding(true);

    try {
      const settings = customMode ? customSettings : selectedPreset;
      
      const response = await axios.post('/api/broadcasts/encode/', {
        broadcast_id: comercial.id,  // Corregido: era comercial_id
        settings: settings,
        preset_id: selectedPreset?.id || 'custom'
      });

      // Iniciar polling para detectar cuando termine
      const checkInterval = setInterval(async () => {
        const updatedResponse = await axios.get(`/api/broadcasts/${comercial.id}/`);
        const newEncodedCount = updatedResponse.data.encoded_files?.length || 0;
        
        if (newEncodedCount > previousEncodedCount) {
          clearInterval(checkInterval);
          setEncoding(false);
          
          // Obtener el file más reciente
          const latestFile = updatedResponse.data.encoded_files[updatedResponse.data.encoded_files.length - 1];
          
          // Actualizar el comercial con los nuevos files
          setCurrentComercial(updatedResponse.data);
          
          // Mostrar notificación
          alert(`✅ ¡Codificación completada!\n\nFile: ${latestFile.filename}\nTamaño: ${latestFile.file_size_mb} MB\n\nLa descarga iniciará automáticamente...`);
          
          // Iniciar descarga automática
          setTimeout(async () => {
            try {
              const downloadUrl = `http://localhost:8000/media/${latestFile.path}`;
              
              // Descargar usando fetch y blob
              const response = await fetch(downloadUrl);
              const blob = await response.blob();
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = latestFile.filename;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);
              
              console.log('✅ Descarga iniciada:', latestFile.filename);
              
              // Esperar 3 segundos y eliminar el file del servidor
              setTimeout(async () => {
                try {
                  await axios.post('/api/broadcasts/delete-encoded/', {
                    broadcast_id: comercial.id,  // Corregido: era comercial_id
                    filename: latestFile.filename
                  });
                  
                  // Refrescar el comercial para actualizar la lista
                  const finalResponse = await axios.get(`/api/broadcasts/${comercial.id}/`);
                  setCurrentComercial(finalResponse.data);
                  
                  console.log('🗑️ File eliminado del servidor después de la descarga');
                } catch (error) {
                  console.error('Error eliminar file:', error);
                }
              }, 3000);
            } catch (error) {
              console.error('Error descargar file:', error);
              alert('⚠️ Hubo un error al iniciar la descarga automática. Usa el botón de descarga manual.');
            }
          }, 500);
          
          onSuccess();
        }
      }, 3000); // Verificar cada 3 segundos

      // Timeout de 5 minutos
      setTimeout(() => {
        clearInterval(checkInterval);
        if (encoding) {
          setEncoding(false);
          alert('⏱️ La codificación está tomando más tiempo del esperado. Puedes cerrar este modal y el proceso continuará en segundo plano.');
        }
      }, 300000);

      alert('🎬 Codificación iniciada. Se te notificará cuando termine...');
      
    } catch (error) {
      console.error('Error iniciar codificación:', error);
      alert('Error iniciar la codificación: ' + (error.response?.data?.error || error.message));
      setEncoding(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-blue-700 px-6 py-4 flex justify-between items-center border-b-2 border-blue-800">
          <div>
            <h2 className="text-2xl font-bold text-white">Codificador Profesional</h2>
            <p className="text-blue-200 text-sm mt-1">Powered by FFmpeg</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-300 transition-colors text-xl font-bold"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Video Preview */}
          <div className="w-1/3 bg-gray-800 p-6 border-r border-gray-700 overflow-y-auto">
            <h3 className="text-white font-semibold mb-4 text-lg">Video Original</h3>
            
            {/* Video Preview */}
            <div className="bg-black rounded-lg overflow-hidden mb-4 aspect-video">
              {currentComercial.thumbnail_url ? (
                <img 
                  src={currentComercial.thumbnail_url}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-gray-500 text-sm">Sin vista previa</div>
                </div>
              )}
            </div>

            {/* File Info */}
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-400 font-semibold">File:</span>
                <p className="text-white font-medium truncate">{currentComercial.name_original}</p>
              </div>
              
              {currentComercial.pizarra?.producto && (
                <div>
                  <span className="text-gray-400 font-semibold">Product:</span>
                  <p className="text-white font-medium">{currentComercial.pizarra.producto}</p>
                </div>
              )}
              
              {currentComercial.pizarra?.duracion && (
                <div>
                  <span className="text-gray-400 font-semibold">Duration:</span>
                  <p className="text-white font-medium">{currentComercial.pizarra.duracion}</p>
                </div>
              )}
              
              <div>
                <span className="text-gray-400 font-semibold">Estado:</span>
                <p className="text-green-400 font-medium">{currentComercial.estado_transcodificacion}</p>
              </div>
            </div>

            {/* Files Codificados */}
            {currentComercial.encoded_files && currentComercial.encoded_files.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-700">
                <h4 className="text-white font-semibold mb-3 flex items-center">
                  <span className="mr-2">📦</span>
                  Files Codificados ({currentComercial.encoded_files.length})
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {currentComercial.encoded_files.map((file, index) => (
                    <div key={index} className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="text-white font-medium text-xs truncate">{file.filename}</p>
                          <p className="text-gray-400 text-xs mt-1">
                            {file.preset_id} • {file.codec} • {file.resolution}
                          </p>
                        </div>
                        <span className="text-green-400 text-xs font-semibold ml-2">
                          {file.file_size_mb} MB
                        </span>
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            // Descargar usando fetch y blob
                            const downloadUrl = `http://localhost:8000/media/${file.path}`;
                            const response = await fetch(downloadUrl);
                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = file.filename;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            window.URL.revokeObjectURL(url);
                            
                            console.log('✅ Descarga manual iniciada:', file.filename);
                            
                            // Delete file después de 3 segundos
                            setTimeout(async () => {
                              try {
                                await axios.post('/api/broadcasts/delete-encoded/', {
                                  broadcast_id: currentComercial.id,  // Corregido: era comercial_id
                                  filename: file.filename
                                });
                                
                                // Refrescar el comercial
                                const refreshResponse = await axios.get(`/api/broadcasts/${currentComercial.id}/`);
                                setCurrentComercial(refreshResponse.data);
                                
                                console.log(`🗑️ File ${file.filename} eliminado del servidor`);
                              } catch (error) {
                                console.error('Error eliminar file:', error);
                              }
                            }, 3000);
                          } catch (error) {
                            console.error('Error descargar:', error);
                            alert('⚠️ Error descargar el file. Intenta de nuevo.');
                          }
                        }}
                        className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-1.5 px-3 rounded transition-colors text-center cursor-pointer"
                      >
                        Descargar y Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Encoding Options */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Category Tabs */}
            <div className="bg-gray-800 border-b border-gray-700 px-6 py-3">
              <div className="flex space-x-2">
                {Object.keys(ENCODING_PRESETS).map(category => (
                  <button
                    key={category}
                    onClick={() => {
                      setActiveCategory(category);
                      setSelectedPreset(null);
                      setCustomMode(false);
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      activeCategory === category
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {category === 'broadcast' && 'BROADCAST'}
                    {category === 'web' && 'WEB'}
                    {category === 'mobile' && 'MOBILE'}
                    {category === 'social' && 'SOCIAL MEDIA'}
                  </button>
                ))}
                <button
                  onClick={handleCustomToggle}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    customMode
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  PERSONALIZADO
                </button>
              </div>
            </div>

            {/* Presets Grid */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-850">
              {!customMode ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ENCODING_PRESETS[activeCategory].map(preset => (
                    <div
                      key={preset.id}
                      onClick={() => handlePresetSelect(preset)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedPreset?.id === preset.id
                          ? 'border-blue-500 bg-blue-900 bg-opacity-30'
                          : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                      }`}
                    >
                      <h4 className="text-white font-bold text-lg mb-2">{preset.name}</h4>
                      <p className="text-gray-400 text-sm mb-3">{preset.descripcion}</p>
                      
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between text-gray-500">
                          <span>Codec:</span>
                          <span className="text-white font-medium">{preset.codec}</span>
                        </div>
                        <div className="flex justify-between text-gray-500">
                          <span>Resolución:</span>
                          <span className="text-white font-medium">{preset.resolution}</span>
                        </div>
                        <div className="flex justify-between text-gray-500">
                          <span>FPS:</span>
                          <span className="text-white font-medium">{preset.fps}</span>
                        </div>
                        <div className="flex justify-between text-gray-500">
                          <span>Audio:</span>
                          <span className="text-white font-medium">{preset.audio_codec} @ {preset.audio_bitrate}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Custom Settings Form
                <div className="max-w-4xl mx-auto space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    {/* Format */}
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Format de Contenedor
                      </label>
                      <select
                        value={customSettings.formato}
                        onChange={(e) => setCustomSettings({...customSettings, formato: e.target.value})}
                        className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="mp4">MP4 (H.264/H.265)</option>
                        <option value="mov">MOV (QuickTime)</option>
                        <option value="mkv">MKV (Matroska)</option>
                        <option value="webm">WebM (VP8/VP9)</option>
                        <option value="avi">AVI</option>
                      </select>
                    </div>

                    {/* Codec de Video */}
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Codec de Video
                      </label>
                      <select
                        value={customSettings.codec}
                        onChange={(e) => setCustomSettings({...customSettings, codec: e.target.value})}
                        className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="libx264">H.264 (AVC)</option>
                        <option value="libx265">H.265 (HEVC)</option>
                        <option value="libvpx-vp9">VP9</option>
                        <option value="prores_ks">ProRes</option>
                        <option value="dnxhd">DNxHD</option>
                      </select>
                    </div>

                    {/* Resolución */}
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Resolución
                      </label>
                      <select
                        value={customSettings.resolution}
                        onChange={(e) => setCustomSettings({...customSettings, resolution: e.target.value})}
                        className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {RESOLUCIONES_CUSTOM.map(res => (
                          <option key={res.value} value={res.value}>{res.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* FPS */}
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Frame Rate
                      </label>
                      <select
                        value={customSettings.fps}
                        onChange={(e) => setCustomSettings({...customSettings, fps: e.target.value})}
                        className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {FPS_OPTIONS.map(fps => (
                          <option key={fps.value} value={fps.value}>{fps.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* CRF / Quality */}
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Calidad (CRF) <span className="text-gray-400 text-xs">menor = mejor calidad</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="51"
                        value={customSettings.crf}
                        onChange={(e) => setCustomSettings({...customSettings, crf: e.target.value})}
                        className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="mt-1 text-xs text-gray-400">
                        Recomendado: 18-23 (alta calidad), 23-28 (web)
                      </div>
                    </div>

                    {/* Preset */}
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Preset de Velocidad
                      </label>
                      <select
                        value={customSettings.preset}
                        onChange={(e) => setCustomSettings({...customSettings, preset: e.target.value})}
                        className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="ultrafast">Ultra Rápido (menor calidad)</option>
                        <option value="superfast">Super Rápido</option>
                        <option value="veryfast">Muy Rápido</option>
                        <option value="faster">Más Rápido</option>
                        <option value="fast">Rápido</option>
                        <option value="medium">Medio (recomendado)</option>
                        <option value="slow">Lento (mejor compresión)</option>
                        <option value="slower">Más Lento</option>
                        <option value="veryslow">Muy Lento (máxima calidad)</option>
                      </select>
                    </div>

                    {/* Audio Codec */}
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Codec de Audio
                      </label>
                      <select
                        value={customSettings.audio_codec}
                        onChange={(e) => setCustomSettings({...customSettings, audio_codec: e.target.value})}
                        className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="aac">AAC</option>
                        <option value="mp3">MP3</option>
                        <option value="libopus">Opus</option>
                        <option value="pcm_s16le">PCM (sin compresión)</option>
                        <option value="ac3">AC3 (Dolby Digital)</option>
                      </select>
                    </div>

                    {/* Audio Bitrate */}
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Bitrate de Audio
                      </label>
                      <select
                        value={customSettings.audio_bitrate}
                        onChange={(e) => setCustomSettings({...customSettings, audio_bitrate: e.target.value})}
                        className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="64k">64 kbps</option>
                        <option value="96k">96 kbps</option>
                        <option value="128k">128 kbps</option>
                        <option value="192k">192 kbps</option>
                        <option value="256k">256 kbps</option>
                        <option value="320k">320 kbps</option>
                      </select>
                    </div>
                  </div>

                  {/* Advanced Options */}
                  <div className="border-t border-gray-700 pt-6">
                    <h4 className="text-white font-semibold mb-4">Opciones Avanzadas</h4>
                    <div className="grid grid-cols-2 gap-6">
                      {/* Profile */}
                      <div>
                        <label className="block text-sm font-semibold text-white mb-2">
                          Profile (H.264)
                        </label>
                        <select
                          value={customSettings.profile}
                          onChange={(e) => setCustomSettings({...customSettings, profile: e.target.value})}
                          className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="baseline">Baseline (máxima compatibilidad)</option>
                          <option value="main">Main (recomendado)</option>
                          <option value="high">High (mejor compresión)</option>
                        </select>
                      </div>

                      {/* Pixel Format */}
                      <div>
                        <label className="block text-sm font-semibold text-white mb-2">
                          Format de Píxel
                        </label>
                        <select
                          value={customSettings.pixel_format}
                          onChange={(e) => setCustomSettings({...customSettings, pixel_format: e.target.value})}
                          className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="yuv420p">YUV 4:2:0 (compatibilidad)</option>
                          <option value="yuv422p">YUV 4:2:2 (broadcast)</option>
                          <option value="yuv444p">YUV 4:4:4 (alta calidad)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer - Action Buttons */}
            <div className="bg-gray-800 border-t-2 border-gray-700 px-6 py-4">
              <div className="flex justify-between items-center">
                <div className="text-gray-300 text-sm font-medium">
                  {selectedPreset && (
                    <span>Preset selectdo: <strong className="text-white">{selectedPreset.name}</strong></span>
                  )}
                  {customMode && (
                    <span>Modo personalizado activo</span>
                  )}
                  {!selectedPreset && !customMode && (
                    <span>Select un preset o modo personalizado</span>
                  )}
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={onClose}
                    className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEncode}
                    disabled={encoding || (!selectedPreset && !customMode)}
                    className={`px-8 py-2 rounded-lg font-bold transition-all ${
                      encoding || (!selectedPreset && !customMode)
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg'
                    }`}
                  >
                    {encoding ? (
                      <span className="flex items-center space-x-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                        <span>Codificando...</span>
                      </span>
                    ) : (
                      'INICIAR CODIFICACIÓN'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EncodingModal;
