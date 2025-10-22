import { useState } from 'react';
import axios from '../utils/axios';
import VideoPlayer from './VideoPlayer';

const PRESETS = {
  'apple-tv': {
    name: 'Apple TV',
    formato: 'mp4',
    codec: 'h264',
    resolution: '1920x1080',
    fps: '30',
    bitrate_video: '8000k',
    bitrate_audio: '256k',
    aspect_ratio: '16:9'
  },
  'apple-tv2': {
    name: 'Apple TV2',
    formato: 'mp4',
    codec: 'h264',
    resolution: '1280x720',
    fps: '30',
    bitrate_video: '5000k',
    bitrate_audio: '192k',
    aspect_ratio: '16:9'
  },
  'iphone-6': {
    name: 'iPhone 6',
    formato: 'mp4',
    codec: 'h264',
    resolution: '1334x750',
    fps: '30',
    bitrate_video: '4000k',
    bitrate_audio: '192k',
    aspect_ratio: '16:9'
  },
  'ipad-pro': {
    name: 'iPad Pro',
    formato: 'mp4',
    codec: 'h264',
    resolution: '2732x2048',
    fps: '30',
    bitrate_video: '10000k',
    bitrate_audio: '256k',
    aspect_ratio: '4:3'
  },
  'android-1080p': {
    name: 'Android 1080p',
    formato: 'mp4',
    codec: 'h264',
    resolution: '1920x1080',
    fps: '30',
    bitrate_video: '6000k',
    bitrate_audio: '192k',
    aspect_ratio: '16:9'
  },
  'web-hd': {
    name: 'Web HD',
    formato: 'mp4',
    codec: 'h264',
    resolution: '1280x720',
    fps: '25',
    bitrate_video: '3000k',
    bitrate_audio: '128k',
    aspect_ratio: '16:9'
  },
  'web-sd': {
    name: 'Web SD',
    formato: 'mp4',
    codec: 'h264',
    resolution: '640x480',
    fps: '25',
    bitrate_video: '1500k',
    bitrate_audio: '128k',
    aspect_ratio: '4:3'
  },
  'custom': {
    name: 'Custom',
    formato: 'mp4',
    codec: 'h264',
    resolution: '1920x1080',
    fps: '30',
    bitrate_video: '5000k',
    bitrate_audio: '192k',
    aspect_ratio: '16:9'
  }
};

const FORMATOS = ['mp4', 'mov', 'avi', 'mkv', 'webm'];
const CODECS = ['h264', 'h265', 'vp9', 'prores'];
const RESOLUCIONES = [
  '3840x2160', // 4K
  '2560x1440', // 2K
  '1920x1080', // Full HD
  '1280x720',  // HD
  '854x480',   // SD
  '640x480',   // VGA
  'custom'
];
const FPS_OPTIONS = ['23.976', '24', '25', '29.97', '30', '50', '60'];
const ASPECT_RATIOS = ['16:9', '4:3', '21:9', '1:1'];

export default function EncodingModal({ comercial, onClose, onSuccess }) {
  const [activeTab, setActiveTab] = useState('presets');
  const [selectedPreset, setSelectedPreset] = useState('apple-tv');
  const [customSettings, setCustomSettings] = useState(PRESETS['apple-tv']);
  const [isEncoding, setIsEncoding] = useState(false);
  const [error, setError] = useState('');
  const [customResolution, setCustomResolution] = useState({ width: 1920, height: 1080 });

  const handlePresetChange = (presetKey) => {
    setSelectedPreset(presetKey);
    setCustomSettings(PRESETS[presetKey]);
  };

  const handleSettingChange = (key, value) => {
    setCustomSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleEncode = async () => {
    setIsEncoding(true);
    setError('');

    try {
      const settings = activeTab === 'presets' 
        ? PRESETS[selectedPreset]
        : customSettings;

      // Preparar resolución
      let resolution = settings.resolution;
      if (resolution === 'custom') {
        resolution = `${customResolution.width}x${customResolution.height}`;
      }

      const encodingData = {
        comercial_id: comercial.id,
        preset: activeTab === 'presets' ? selectedPreset : 'custom',
        formato: settings.formato,
        codec: settings.codec,
        resolution: resolution,
        fps: settings.fps,
        bitrate_video: settings.bitrate_video,
        bitrate_audio: settings.bitrate_audio,
        aspect_ratio: settings.aspect_ratio
      };

      await axios.post('http://localhost:8000/api/broadcasts/encode/', encodingData);

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error('Error codificar:', err);
      setError('Error iniciar la codificación. Please intenta de nuevo.');
    } finally {
      setIsEncoding(false);
    }
  };

  if (!comercial) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">ENCODING</h2>
          <button 
            onClick={onClose}
            className="text-white hover:text-gray-200 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-300">
          <button
            onClick={() => setActiveTab('presets')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === 'presets' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Presets
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === 'custom' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Custom
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
            {/* Video Preview */}
            <div className="lg:col-span-1">
              <div className="bg-black rounded-lg overflow-hidden mb-4" style={{ aspectRatio: '16/9' }}>
                {comercial.ruta_proxy ? (
                  <VideoPlayer
                    src={`http://localhost:8000/media/${comercial.ruta_proxy}`}
                    poster={comercial.thumbnail ? `http://localhost:8000/media/${comercial.thumbnail}` : undefined}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white">
                    Video no disponible
                  </div>
                )}
              </div>

              {/* File Info */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                <div>
                  <span className="font-semibold">Client:</span> {comercial.pizarra?.cliente || 'N/A'}
                </div>
                <div>
                  <span className="font-semibold">Product:</span> {comercial.pizarra?.producto || 'N/A'}
                </div>
                <div>
                  <span className="font-semibold">Original:</span> {comercial.name_original || 'N/A'}
                </div>
              </div>
            </div>

            {/* Settings Panel */}
            <div className="lg:col-span-2">
              {activeTab === 'presets' ? (
                /* Presets Tab */
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Select Preset</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(PRESETS).map(([key, preset]) => (
                      <button
                        key={key}
                        onClick={() => handlePresetChange(key)}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                          selectedPreset === key
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-300 bg-white hover:border-blue-400'
                        }`}
                      >
                        <div className="font-semibold text-gray-800">{preset.name}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          {preset.resolution} • {preset.fps}fps • {preset.codec.toUpperCase()}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Preview of selected preset */}
                  <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-3">Preset Details</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Format:</span>
                        <span className="ml-2 font-medium">{PRESETS[selectedPreset].formato.toUpperCase()}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Codec:</span>
                        <span className="ml-2 font-medium">{PRESETS[selectedPreset].codec.toUpperCase()}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Resolution:</span>
                        <span className="ml-2 font-medium">{PRESETS[selectedPreset].resolution}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">FPS:</span>
                        <span className="ml-2 font-medium">{PRESETS[selectedPreset].fps}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Video Bitrate:</span>
                        <span className="ml-2 font-medium">{PRESETS[selectedPreset].bitrate_video}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Audio Bitrate:</span>
                        <span className="ml-2 font-medium">{PRESETS[selectedPreset].bitrate_audio}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Custom Tab */
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Custom Settings</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Format */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Format:</label>
                      <select
                        value={customSettings.formato}
                        onChange={(e) => handleSettingChange('formato', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {FORMATOS.map(fmt => (
                          <option key={fmt} value={fmt}>{fmt.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>

                    {/* Codec */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Codec:</label>
                      <select
                        value={customSettings.codec}
                        onChange={(e) => handleSettingChange('codec', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {CODECS.map(codec => (
                          <option key={codec} value={codec}>{codec.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>

                    {/* Resolution */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Resolution:</label>
                      <select
                        value={customSettings.resolution}
                        onChange={(e) => handleSettingChange('resolution', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {RESOLUCIONES.map(res => (
                          <option key={res} value={res}>{res === 'custom' ? 'Custom' : res}</option>
                        ))}
                      </select>
                    </div>

                    {/* Custom Resolution Inputs */}
                    {customSettings.resolution === 'custom' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Width:</label>
                          <input
                            type="number"
                            value={customResolution.width}
                            onChange={(e) => setCustomResolution(prev => ({ ...prev, width: parseInt(e.target.value) }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Height:</label>
                          <input
                            type="number"
                            value={customResolution.height}
                            onChange={(e) => setCustomResolution(prev => ({ ...prev, height: parseInt(e.target.value) }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </>
                    )}

                    {/* FPS */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">FPS:</label>
                      <select
                        value={customSettings.fps}
                        onChange={(e) => handleSettingChange('fps', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {FPS_OPTIONS.map(fps => (
                          <option key={fps} value={fps}>{fps}</option>
                        ))}
                      </select>
                    </div>

                    {/* Aspect Ratio */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Aspect Ratio:</label>
                      <select
                        value={customSettings.aspect_ratio}
                        onChange={(e) => handleSettingChange('aspect_ratio', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {ASPECT_RATIOS.map(ratio => (
                          <option key={ratio} value={ratio}>{ratio}</option>
                        ))}
                      </select>
                    </div>

                    {/* Video Bitrate */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Video Bitrate:</label>
                      <input
                        type="text"
                        value={customSettings.bitrate_video}
                        onChange={(e) => handleSettingChange('bitrate_video', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="5000k"
                      />
                    </div>

                    {/* Audio Bitrate */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Audio Bitrate:</label>
                      <input
                        type="text"
                        value={customSettings.bitrate_audio}
                        onChange={(e) => handleSettingChange('bitrate_audio', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="192k"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t">
          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}
          <div className="flex-1"></div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600 font-medium"
            >
              CANCEL
            </button>
            <button
              onClick={handleEncode}
              disabled={isEncoding}
              className="bg-blue-600 text-white px-8 py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-300 font-medium"
            >
              {isEncoding ? 'ENCODING...' : 'EXPORT'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
