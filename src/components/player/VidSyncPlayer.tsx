'use client';

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { PlayerHandle } from '@/types/watch-party';
import { ApiGateway } from '@/lib/api/gateway';
import { Loader } from 'lucide-react';

export interface VidSyncPlayerProps {
  id: string | number;
  type: 'movie' | 'tv';
  season?: number;
  episode?: number;
  accentColor?: string;
  startAt?: number;
  onPlay?: () => void;
  onPause?: () => void;
  onSeek?: (time: number) => void;
}

export const VidSyncPlayer = forwardRef<PlayerHandle, VidSyncPlayerProps>(({
  id, type, season, episode, accentColor = '007bff', startAt = 0,
  onPlay, onPause, onSeek
}, ref) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlayingState, setIsPlayingState] = useState(false);
  const [currentTimeState, setCurrentTimeState] = useState(startAt);

  // Expose PlayerHandle methods to the parent
  useImperativeHandle(ref, () => ({
    play: () => {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage({ type: 'VIDSYNC_PLAYER_COMMAND', action: 'play' }, '*');
      }
    },
    pause: () => {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage({ type: 'VIDSYNC_PLAYER_COMMAND', action: 'pause' }, '*');
      }
    },
    seekTo: (time: number) => {
      if (iframeRef.current?.contentWindow) {
        // Speculative: try sending seekTo command
        iframeRef.current.contentWindow.postMessage({ type: 'VIDSYNC_PLAYER_COMMAND', action: 'seek', time }, '*');
        iframeRef.current.contentWindow.postMessage({ type: 'VIDSYNC_PLAYER_COMMAND', action: 'seekTo', time }, '*');
      }
    },
    getCurrentTime: () => currentTimeState,
    isPlaying: () => isPlayingState,
  }), [currentTimeState, isPlayingState]);

  // Handle incoming messages from the VidSync iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      let eventData: Record<string, unknown> | null = null;
      if (typeof event.data === 'string') {
        try {
          eventData = JSON.parse(event.data);
        } catch { /* ignore */ }
      } else if (typeof event.data === 'object' && event.data !== null) {
        eventData = event.data as Record<string, unknown>;
      }

      if (!eventData) return;

      if (eventData.type === 'VIDSYNC_PLAYER_EVENT' && eventData.data) {
        const data = eventData.data as Record<string, unknown>;
        
        if (typeof data.currentTime === 'number') {
          setCurrentTimeState(data.currentTime);
        }
        
        if (typeof data.playing === 'boolean') {
          setIsPlayingState(data.playing);
        }

        const ev = data.event as string;
        if (ev === 'play' && onPlay) onPlay();
        if (ev === 'pause' && onPause) onPause();
        if (ev === 'seeked' && onSeek && typeof data.currentTime === 'number') onSeek(data.currentTime);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onPlay, onPause, onSeek]);

  const embedUrl = ApiGateway.getVidFastUrl(id, type, season, episode, {
    autoPlay: true,
    startAt,
    theme: accentColor,
  });

  return (
    <div className="w-full h-full relative bg-black">
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <Loader className="w-8 h-8 text-white animate-spin opacity-50" />
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={embedUrl}
        className="w-full h-full border-0 absolute inset-0 z-20"
        allowFullScreen
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        referrerPolicy="no-referrer"
        title="Lumina Sync Player"
        onLoad={() => setIsLoaded(true)}
      />
    </div>
  );
});

VidSyncPlayer.displayName = 'VidSyncPlayer';
