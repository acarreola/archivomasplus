import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';

const AudioWavePlayer = ({ url, height = 96, waveColor = '#60a5fa', progressColor = '#2563eb' }) => {
  const containerRef = useRef(null);
  const wavesurferRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create wavesurfer instance
    const ws = WaveSurfer.create({
      container: containerRef.current,
      height,
      waveColor,
      progressColor,
      cursorColor: '#93c5fd',
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      normalize: true,
      responsive: true,
    });

    wavesurferRef.current = ws;

    ws.on('ready', () => {
      setIsReady(true);
      setDuration(ws.getDuration());
    });

    ws.on('audioprocess', () => {
      setCurrentTime(ws.getCurrentTime());
    });

    ws.on('finish', () => setIsPlaying(false));

    ws.load(url);

    return () => {
      try { ws.destroy(); } catch (_) {}
    };
  }, [url, height, waveColor, progressColor]);

  const togglePlay = () => {
    if (!wavesurferRef.current) return;
    wavesurferRef.current.playPause();
    setIsPlaying(prev => !prev);
  };

  const formatTime = (sec) => {
    if (!sec && sec !== 0) return '0:00';
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    const m = Math.floor(sec / 60).toString();
    return `${m}:${s}`;
  };

  return (
    <div className="w-full">
      <div ref={containerRef} className="w-full"></div>
      <div className="mt-3 flex items-center justify-between text-sm text-gray-700">
        <button
          onClick={togglePlay}
          disabled={!isReady}
          className={`px-3 py-1.5 rounded font-semibold text-white ${isPlaying ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <div className="font-mono">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>
    </div>
  );
};

export default AudioWavePlayer;
