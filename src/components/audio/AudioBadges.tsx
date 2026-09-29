'use client';
import { Volume2, CheckCircle2 } from 'lucide-react';
import { ContentAudioInfo } from '@/lib/audio';
import { AudioTrack } from '@/lib/audio/types';

interface AudioBadgesProps {
  audioInfo?: ContentAudioInfo | null;
  episodeTracks?: AudioTrack[];
  selectedTrack?: string;
  onSelectTrack?: (trackId: string) => void;
  className?: string;
  compact?: boolean;
}

export function AudioBadges({
  audioInfo,
  episodeTracks,
  selectedTrack = 'original',
  onSelectTrack,
  className = '',
  compact = false,
}: AudioBadgesProps) {
  // Normalize tracks from either episodeTracks or audioInfo
  const tracks: Array<{
    id: string;
    label: string;
    isOriginal?: boolean;
    available?: boolean;
  }> = episodeTracks && episodeTracks.length > 0
    ? episodeTracks.map((t) => ({
        id: t.id,
        label: t.label,
        isOriginal: t.isOriginal,
        available: t.available,
      }))
    : audioInfo?.availableAudioTracks?.map((t) => ({
        id: t.id,
        label: t.label,
        isOriginal: t.isOriginal,
        available: t.verified,
      })) || [];

  if (tracks.length === 0) return null;

  const isInteractive = Boolean(onSelectTrack);

  if (compact) {
    return (
      <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
        {tracks.map((track) => {
          const isAvailable = track.available !== false;
          const isSelected =
            selectedTrack === track.id ||
            (selectedTrack === 'sub' && track.id === 'original') ||
            (selectedTrack === 'original' && track.id === 'sub') ||
            (selectedTrack === 'hindi' && track.id === 'dub-hi') ||
            (selectedTrack === 'dub-hi' && track.id === 'hindi') ||
            (selectedTrack === 'english' && track.id === 'dub-en') ||
            (selectedTrack === 'dub-en' && track.id === 'english');

          return (
            <span
              key={track.id}
              onClick={() => isInteractive && isAvailable && onSelectTrack?.(track.id)}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                !isAvailable
                  ? 'opacity-35 line-through bg-slate-200/50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-600 border border-slate-300/30 dark:border-slate-800 cursor-not-allowed select-none'
                  : isSelected
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60'
              } ${isInteractive && isAvailable ? 'cursor-pointer hover:border-blue-500/50' : ''}`}
              title={!isAvailable ? `${track.label} (Dub Unavailable)` : undefined}
            >
              {track.label}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider select-none">
        <Volume2 className="w-3.5 h-3.5 text-accent-blue" />
        <span>Available Audio</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {tracks.map((track) => {
          const isAvailable = track.available !== false;
          const isSelected =
            selectedTrack === track.id ||
            (selectedTrack === 'sub' && track.id === 'original') ||
            (selectedTrack === 'original' && track.id === 'sub') ||
            (selectedTrack === 'hindi' && track.id === 'dub-hi') ||
            (selectedTrack === 'dub-hi' && track.id === 'hindi') ||
            (selectedTrack === 'english' && track.id === 'dub-en') ||
            (selectedTrack === 'dub-en' && track.id === 'english');

          return (
            <button
              key={track.id}
              type="button"
              disabled={!isInteractive || !isAvailable}
              onClick={() => isAvailable && onSelectTrack?.(track.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 border ${
                !isAvailable
                  ? 'opacity-35 line-through bg-slate-100/50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-600 border-slate-200/50 dark:border-slate-800/50 cursor-not-allowed pointer-events-none select-none'
                  : isSelected
                  ? 'bg-blue-600 text-white border-blue-500 shadow-sm shadow-blue-600/20'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              } ${isInteractive && isAvailable ? 'cursor-pointer hover:scale-[1.02]' : 'cursor-default'}`}
              title={
                !isAvailable
                  ? `${track.label} (Dub Unavailable)`
                  : track.isOriginal
                  ? 'Original authentic audio language'
                  : `Verified ${track.label} audio stream`
              }
            >
              <span>{track.label}</span>
              {isSelected && <CheckCircle2 className="w-3 h-3 text-white/90" />}
            </button>
          );
        })}
      </div>

      {audioInfo?.providerCapabilities?.note && (
        <p className="text-[11px] text-slate-500 dark:text-slate-500 leading-tight">
          {audioInfo.providerCapabilities.note}
        </p>
      )}
    </div>
  );
}
