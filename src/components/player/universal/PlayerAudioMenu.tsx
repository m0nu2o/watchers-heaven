'use client';

import React from 'react';
import { Check, Volume2, Lock } from 'lucide-react';
import { PlayerAudioTrack } from '@/lib/player/types';

interface PlayerAudioMenuProps {
  tracks: PlayerAudioTrack[];
  activeTrackId: string;
  onSelectTrack: (trackId: string) => void;
  onClose: () => void;
}

export function PlayerAudioMenu({
  tracks,
  activeTrackId,
  onSelectTrack,
  onClose,
}: PlayerAudioMenuProps) {
  return (
    <div
      className="absolute bottom-16 right-4 sm:right-12 z-50 w-64 max-w-[90vw] rounded-2xl bg-[#090d16]/95 backdrop-blur-2xl border border-white/15 p-2 shadow-2xl text-white animate-in fade-in zoom-in-95 duration-150"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 mb-1">
        <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Volume2 className="w-3.5 h-3.5 text-blue-400" />
          Audio Language
        </span>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded transition cursor-pointer"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-col gap-1 max-h-60 overflow-y-auto py-1">
        {tracks.length === 0 ? (
          <div className="px-3 py-2 text-xs text-slate-400 italic">No audio tracks detected</div>
        ) : (
          tracks.map((track) => {
            const isSelected = activeTrackId === track.id;
            const isAvailable = track.available !== false;

            return (
              <button
                key={track.id}
                disabled={!isAvailable}
                onClick={() => {
                  if (isAvailable) {
                    onSelectTrack(track.id);
                    onClose();
                  }
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                  !isAvailable
                    ? 'opacity-40 cursor-not-allowed bg-black/20 text-slate-500'
                    : isSelected
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-200 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span>{track.label}</span>
                  {track.isOriginal && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/20 text-slate-200 uppercase font-extrabold">
                      Original
                    </span>
                  )}
                </div>

                <div>
                  {!isAvailable ? (
                    <span className="flex items-center gap-0.5 text-[9px] text-amber-400 font-bold uppercase">
                      <Lock className="w-2.5 h-2.5" /> N/A
                    </span>
                  ) : isSelected ? (
                    <Check className="w-3.5 h-3.5 text-white" />
                  ) : null}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
