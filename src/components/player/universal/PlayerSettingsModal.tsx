'use client';

import React, { useState } from 'react';
import {
  Settings,
  ChevronRight,
  ArrowLeft,
  Volume2,
  Subtitles,
  Gauge,
  Sliders,
  Check,
  Zap,
  FastForward,
} from 'lucide-react';
import {
  PlayerQualityLevel,
  PlayerAudioTrack,
  PlayerSubtitleTrack,
  PlayerPreferences,
} from '@/lib/player/types';

interface PlayerSettingsModalProps {
  qualities: PlayerQualityLevel[];
  activeQuality: string;
  onSelectQuality: (id: string) => void;
  audioTracks: PlayerAudioTrack[];
  activeAudioId: string;
  onSelectAudio: (id: string) => void;
  subtitles: PlayerSubtitleTrack[];
  activeSubtitleId: string;
  onSelectSubtitle: (id: string) => void;
  speed: number;
  onSelectSpeed: (speed: number) => void;
  preferences: PlayerPreferences;
  onUpdatePreferences: (prefs: Partial<PlayerPreferences>) => void;
  onClose: () => void;
}

type SettingsSection = 'main' | 'quality' | 'audio' | 'subtitles' | 'speed';

const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

export function PlayerSettingsModal({
  qualities,
  activeQuality,
  onSelectQuality,
  audioTracks,
  activeAudioId,
  onSelectAudio,
  subtitles,
  activeSubtitleId,
  onSelectSubtitle,
  speed,
  onSelectSpeed,
  preferences,
  onUpdatePreferences,
  onClose,
}: PlayerSettingsModalProps) {
  const [section, setSection] = useState<SettingsSection>('main');

  return (
    <div
      className="absolute bottom-16 right-4 sm:right-10 z-50 w-72 max-w-[90vw] rounded-2xl bg-[#090d16]/95 backdrop-blur-2xl border border-white/15 p-2 shadow-2xl text-white animate-in fade-in zoom-in-95 duration-150"
      onClick={(e) => e.stopPropagation()}
    >
      {/* ── Main Settings Panel ── */}
      {section === 'main' && (
        <div className="space-y-1">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 mb-1">
            <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5 text-blue-400" />
              Player Settings
            </span>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded transition cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Quality Navigation */}
          {qualities.length > 0 && (
            <button
              onClick={() => setSection('quality')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-blue-400" />
                <span>Quality</span>
              </div>
              <div className="flex items-center gap-1 text-slate-400">
                <span className="capitalize">{activeQuality}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </button>
          )}

          {/* Audio Navigation */}
          {audioTracks.length > 0 && (
            <button
              onClick={() => setSection('audio')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Volume2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Audio</span>
              </div>
              <div className="flex items-center gap-1 text-slate-400">
                <span className="truncate max-w-[100px]">
                  {audioTracks.find((t) => t.id === activeAudioId)?.label || 'Default'}
                </span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </button>
          )}

          {/* Subtitles Navigation */}
          {subtitles.length > 0 && (
            <button
              onClick={() => setSection('subtitles')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Subtitles className="w-3.5 h-3.5 text-blue-400" />
                <span>Subtitles</span>
              </div>
              <div className="flex items-center gap-1 text-slate-400">
                <span className="truncate max-w-[100px]">
                  {subtitles.find((t) => t.id === activeSubtitleId)?.label || 'Off'}
                </span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </button>
          )}

          {/* Speed Navigation */}
          <button
            onClick={() => setSection('speed')}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Gauge className="w-3.5 h-3.5 text-blue-400" />
              <span>Speed</span>
            </div>
            <div className="flex items-center gap-1 text-slate-400">
              <span>{speed}x</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </button>

          <div className="pt-2 border-t border-white/10 space-y-1">
            {/* Auto Next Toggle */}
            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-blue-400" />
                <span>Auto Next Episode</span>
              </div>
              <input
                type="checkbox"
                checked={preferences.autoNext}
                onChange={(e) => onUpdatePreferences({ autoNext: e.target.checked })}
                className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
              />
            </div>

            {/* Auto Skip Intro Toggle */}
            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300">
              <div className="flex items-center gap-2">
                <FastForward className="w-3.5 h-3.5 text-amber-400" />
                <span>Auto Skip Intro</span>
              </div>
              <input
                type="checkbox"
                checked={preferences.autoSkipIntro}
                onChange={(e) => onUpdatePreferences({ autoSkipIntro: e.target.checked })}
                className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Sub-menus: Speed ── */}
      {section === 'speed' && (
        <div className="space-y-1">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-1">
            <button
              onClick={() => setSection('main')}
              className="flex items-center gap-1 text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Playback Speed
            </span>
          </div>

          <div className="flex flex-col gap-1 max-h-56 overflow-y-auto">
            {SPEED_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  onSelectSpeed(opt);
                  setSection('main');
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  speed === opt
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span>{opt === 1 ? '1x (Normal)' : `${opt}x`}</span>
                {speed === opt && <Check className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Sub-menus: Quality ── */}
      {section === 'quality' && (
        <div className="space-y-1">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-1">
            <button
              onClick={() => setSection('main')}
              className="flex items-center gap-1 text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Video Quality
            </span>
          </div>

          <div className="flex flex-col gap-1 max-h-56 overflow-y-auto">
            {qualities.map((q) => (
              <button
                key={q.id}
                onClick={() => {
                  onSelectQuality(q.id);
                  setSection('main');
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeQuality === q.id || (activeQuality === q.label && q.id !== 'auto')
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span>{q.label}</span>
                {(activeQuality === q.id || activeQuality === q.label) && <Check className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Sub-menus: Audio ── */}
      {section === 'audio' && (
        <div className="space-y-1">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-1">
            <button
              onClick={() => setSection('main')}
              className="flex items-center gap-1 text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Audio
            </span>
          </div>

          <div className="flex flex-col gap-1 max-h-56 overflow-y-auto">
            {audioTracks.map((t) => (
              <button
                key={t.id}
                disabled={t.available === false}
                onClick={() => {
                  if (t.available !== false) {
                    onSelectAudio(t.id);
                    setSection('main');
                  }
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  t.available === false
                    ? 'opacity-40 cursor-not-allowed text-slate-500'
                    : activeAudioId === t.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span>{t.label}</span>
                {activeAudioId === t.id && <Check className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Sub-menus: Subtitles ── */}
      {section === 'subtitles' && (
        <div className="space-y-1">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-1">
            <button
              onClick={() => setSection('main')}
              className="flex items-center gap-1 text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Subtitles
            </span>
          </div>

          <div className="flex flex-col gap-1 max-h-56 overflow-y-auto">
            {subtitles.map((st) => (
              <button
                key={st.id}
                onClick={() => {
                  onSelectSubtitle(st.id);
                  setSection('main');
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeSubtitleId === st.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span>{st.label}</span>
                {activeSubtitleId === st.id && <Check className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
