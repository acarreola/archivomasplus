import { useEffect, useRef } from 'react';
import videojs from 'video.js';

export default function VideoPlayer({ src, poster, onPlay, className = '', showSafeAction = false, showSafeTitle = false }) {
  const videoRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    // Inicializar player solo una vez
    if (!playerRef.current && videoRef.current) {
      const videoElement = videoRef.current;

      const player = videojs(videoElement, {
        controls: true,
        responsive: true,
        fluid: true,
        aspectRatio: '16:9',
        preload: 'auto',
        playbackRates: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
        controlBar: {
          volumePanel: {
            inline: false,
            vertical: true
          },
          children: [
            'playToggle',
            'volumePanel',
            'currentTimeDisplay',
            'timeDivider',
            'durationDisplay',
            'progressControl',
            'playbackRateMenuButton',
            'pictureInPictureToggle',
            'fullscreenToggle'
          ]
        },
        userActions: {
          hotkeys: true
        }
      });

      // Evento de play
      if (onPlay) {
        player.on('play', onPlay);
      }

      playerRef.current = player;
    }

    // Actualizar source cuando cambie
    if (playerRef.current && src) {
      playerRef.current.src({
        type: 'video/mp4',
        src: src
      });
      
      if (poster) {
        playerRef.current.poster(poster);
      }
    }
  }, [src, poster, onPlay]);

  // Cleanup al desmontar
  useEffect(() => {
    const player = playerRef.current;

    return () => {
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  return (
    <div className={`video-js-wrapper relative aspect-video ${className}`} data-vjs-player>
      <video
        ref={videoRef}
        className="video-js vjs-big-play-centered w-full h-full"
        playsInline
      />
      {/* Overlays de Safety - siempre visibles cuando showSafeAction/showSafeTitle son true */}
      {showSafeAction && (
        <div className="safe-rect safe-action" aria-label="Action Safe" />
      )}
      {showSafeTitle && (
        <div className="safe-rect safe-title" aria-label="Title Safe" />
      )}
    </div>
  );
}
