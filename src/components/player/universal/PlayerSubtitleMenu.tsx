'use client';

import React, { useState } from 'react';
import { Check, Subtitles, SlidersHorizontal, ChevronRight, ArrowLeft } from 'lucide-react';
import { PlayerSubtitleTrack, SubtitleStyleSettings } from '@/lib/player/types';

interface PlayerSubtitleMenuProps {
  tracks: PlayerSubtitleTrack[];
  activeTrackId: string;
  subtitleStyles: SubtitleStyleSettings;
  onSelectTrack: (trackId: string) => void;
  onUpdateStyles: (styles: Partial<SubtitleStyleSettings>) => void;
  onClose: () => void;
}

export function PlayerSubtitleMenu({
  tracks,
  activeTrackId,
  subtitleStyles,
  onSelectTrack,
  onUpdateStyles,
  onClose,
}: PlayerSubtitleMenuProps) {
  const [view, setView] = useState<'tracks' | 'customization'>('tracks');

  return (
    <div
      className="absolute bottom-16 right-4 sm:right-16 z-50 w-72 max-w-[90vw] rounded-2xl bg-[#090d16]/95 backdrop-blur-2xl border border-white/15 p-2 shadow-2xl text-white animate-in fade-in zoom-in-95 duration-150"
      onClick={(e) => e.stopPropagation()}
    >
      {view === 'tracks' ? (
        <>
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 mb-1">
            <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Subtitles className="w-3.5 h-3.5 text-blue-400" />
              Subtitles / Captions
            </span>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded transition cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-col gap-1 max-h-56 overflow-y-auto py-1">
            {tracks.map((track) => {
              const isSelected = activeTrackId === track.id;
              return (
                <button
                  key={track.id}
                  onClick={() => {
                    onSelectTrack(track.id);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-slate-200 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="truncate">{track.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Subtitle Appearance Settings Button */}
          <div className="pt-1 mt-1 border-t border-white/10">
            <button
              onClick={() => setView('customization')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
                <span>Subtitle Appearance</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      ) : (
        /* Subtitle Styling Customization */
        <div className="space-y-2.5 p-1">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <button
              onClick={() => setView('tracks')}
              className="flex items-center gap-1 text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Appearance
            </span>
          </div>

          {/* Font Size */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Font Size
            </span>
            <div className="grid grid-cols-3 gap-1 bg-white/5 p-1 rounded-xl">
              {(['small', 'medium', 'large'] as const).map((sz) => (
                <button
                  key={sz}
                  onClick={() => onUpdateStyles({ fontSize: sz })}
                  className={`py-1 rounded-lg text-xs font-bold capitalize transition cursor-pointer ${
                    subtitleStyles.fontSize === sz
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Color
            </span>
            <div className="flex items-center gap-2">
              {[
                { label: 'White', color: '#ffffff' },
                { label: 'Yellow', color: '#facc15' },
                { label: 'Cyan', color: '#38bdf8' },
              ].map((c) => (
                <button
                  key={c.color}
                  onClick={() => onUpdateStyles({ color: c.color })}
                  className={`flex-1 py-1 rounded-lg text-xs font-bold transition border cursor-pointer ${
                    subtitleStyles.color === c.color
                      ? 'border-blue-500 bg-white/15 text-white'
                      : 'border-transparent bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Background */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Background Opacity
            </span>
            <div className="grid grid-cols-3 gap-1 bg-white/5 p-1 rounded-xl">
              {[
                { label: 'None', bg: 'transparent' },
                { label: 'Glass', bg: 'rgba(0, 0, 0, 0.6)' },
                { label: 'Solid', bg: 'rgba(0, 0, 0, 0.95)' },
              ].map((bgOption) => (
                <button
                  key={bgOption.label}
                  onClick={() => onUpdateStyles({ backgroundColor: bgOption.bg })}
                  className={`py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    subtitleStyles.backgroundColor === bgOption.bg
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {bgOption.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
