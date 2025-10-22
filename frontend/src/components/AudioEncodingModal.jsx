import { useState } from 'react';
import axios from '../utils/axios';

const AUDIO_PRESETS = [
  { id: 'mp3-320', name: 'MP3 320 kbps', audio_codec: 'libmp3lame', audio_bitrate: '320k', sample_rate: 44100, channels: 2, container: 'mp3' },
  { id: 'aac-256', name: 'AAC 256 kbps (m4a)', audio_codec: 'aac', audio_bitrate: '256k', sample_rate: 44100, channels: 2, container: 'm4a' },
  { id: 'aac-128', name: 'AAC 128 kbps (m4a)', audio_codec: 'aac', audio_bitrate: '128k', sample_rate: 44100, channels: 2, container: 'm4a' },
  { id: 'flac', name: 'FLAC (Lossless)', audio_codec: 'flac', sample_rate: 48000, channels: 2, container: 'flac' },
  { id: 'wav-pcm', name: 'WAV PCM 16-bit', audio_codec: 'pcm_s16le', sample_rate: 48000, channels: 2, container: 'wav' },
  { id: 'ac3-192', name: 'AC3 192 kbps', audio_codec: 'ac3', audio_bitrate: '192k', sample_rate: 48000, channels: 2, container: 'ac3' },
];

export default function AudioEncodingModal({ audio, onClose, onSuccess }) {
  const [selectedPresetId, setSelectedPresetId] = useState(AUDIO_PRESETS[0].id);
  const [customMode, setCustomMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [custom, setCustom] = useState({
    audio_codec: 'aac',
    audio_bitrate: '192k',
    sample_rate: 44100,
    channels: 2,
    container: 'm4a',
  });

  const selectedPreset = AUDIO_PRESETS.find(p => p.id === selectedPresetId);

  const handleStart = async () => {
    setIsSubmitting(true);
    const settings = customMode ? custom : selectedPreset;
    try {
      await axios.post('/api/audios/encode/', {
        audio_id: audio.id,
        settings,
        preset_id: customMode ? 'custom' : selectedPreset.id,
      });
      alert('✓ Audio encoding encolado');
      onSuccess && onSuccess();
      onClose();
    } catch (e) {
      alert('⚠️ Error al iniciar encoding');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-3xl overflow-hidden">
        <div className="bg-blue-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-white text-xl font-bold">Codificar Audio</h2>
          <button onClick={onClose} className="text-white text-2xl leading-none">×</button>
        </div>
        <div className="p-6 space-y-6">
          {!customMode ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {AUDIO_PRESETS.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPresetId(p.id)}
                  className={`text-left p-4 rounded-lg border-2 transition ${selectedPresetId === p.id ? 'border-blue-500 bg-blue-900 bg-opacity-30' : 'border-gray-700 bg-gray-800 hover:border-gray-600'}`}
                >
                  <div className="text-white font-semibold">{p.name}</div>
                  <div className="text-gray-400 text-xs mt-1">{p.audio_codec.toUpperCase()} • {p.audio_bitrate || 'Lossless'} • {p.sample_rate || 44100} Hz • {p.channels} ch</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Codec</label>
                <select value={custom.audio_codec} onChange={e=>setCustom({...custom, audio_codec:e.target.value})} className="w-full bg-gray-800 text-white border border-gray-700 rounded px-3 py-2">
                  <option value="aac">AAC</option>
                  <option value="libmp3lame">MP3</option>
                  <option value="ac3">AC3</option>
                  <option value="eac3">E-AC3</option>
                  <option value="flac">FLAC</option>
                  <option value="alac">ALAC</option>
                  <option value="pcm_s16le">PCM (WAV)</option>
                  <option value="libopus">Opus</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Bitrate</label>
                <select value={custom.audio_bitrate} onChange={e=>setCustom({...custom, audio_bitrate:e.target.value})} className="w-full bg-gray-800 text-white border border-gray-700 rounded px-3 py-2">
                  <option value="64k">64 kbps</option>
                  <option value="96k">96 kbps</option>
                  <option value="128k">128 kbps</option>
                  <option value="192k">192 kbps</option>
                  <option value="256k">256 kbps</option>
                  <option value="320k">320 kbps</option>
                </select>
                <div className="text-xs text-gray-500 mt-1">No aplica para FLAC/PCM/ALAC</div>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Sample Rate</label>
                <select value={custom.sample_rate} onChange={e=>setCustom({...custom, sample_rate:Number(e.target.value)})} className="w-full bg-gray-800 text-white border border-gray-700 rounded px-3 py-2">
                  <option value={44100}>44.1 kHz</option>
                  <option value={48000}>48 kHz</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Channels</label>
                <select value={custom.channels} onChange={e=>setCustom({...custom, channels:Number(e.target.value)})} className="w-full bg-gray-800 text-white border border-gray-700 rounded px-3 py-2">
                  <option value={1}>Mono</option>
                  <option value={2}>Stereo</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Container</label>
                <select value={custom.container} onChange={e=>setCustom({...custom, container:e.target.value})} className="w-full bg-gray-800 text-white border border-gray-700 rounded px-3 py-2">
                  <option value="m4a">M4A</option>
                  <option value="mp3">MP3</option>
                  <option value="wav">WAV</option>
                  <option value="flac">FLAC</option>
                  <option value="ac3">AC3</option>
                  <option value="eac3">E-AC3</option>
                  <option value="opus">OPUS</option>
                </select>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <button onClick={()=>setCustomMode(!customMode)} className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm">
              {customMode ? 'Usar presets' : 'Modo personalizado'}
            </button>
            <div className="space-x-2">
              <button onClick={onClose} className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-500 text-white text-sm">Cancel</button>
              <button onClick={handleStart} disabled={isSubmitting} className="px-6 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-50">
                {isSubmitting ? 'Encolando…' : 'Iniciar codificación'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
