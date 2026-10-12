'use client';

import React, { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Volume1,
  Maximize2,
  Minimize2,
  Tv,
  Settings,
  Server,
  Volume,
  Subtitles,
  Sliders,
  PictureInPicture2,
} from 'lucide-react';
import { PlayerTimeline, formatPlayerTime } from './PlayerTimeline';
import {
  PlayerQualityLevel,
  PlayerAudioTrack,
  PlayerSubtitleTrack,
  PlayerSkipTimestamps,
  PlayerPreferences,
  SubtitleStyleSettings,
} from '@/lib/player/types';
import { ProviderAdapter } from '@/types/media';
import { PlayerAudioMenu } from './PlayerAudioMenu';
import { PlayerSubtitleMenu } from './PlayerSubtitleMenu';
import { PlayerServerMenu } from './PlayerServerMenu';
import { PlayerSettingsModal } from './PlayerSettingsModal';

interface PlayerControlsProps {
  playing: boolean;
  onTogglePlay: () => void;
  onSeekRelative: (seconds: number) => void;
  onSeekTo: (seconds: number) => void;
  currentTime: number;
  duration: number;
  bufferedPercent: number;
  skipTimestamps?: PlayerSkipTimestamps;
  volume: number;
  muted: boolean;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  activeQuality: string;
  qualities: PlayerQualityLevel[];
  onSelectQuality: (qId: string) => void;
  activeAudioId: string;
  audioTracks: PlayerAudioTrack[];
  onSelectAudio: (trackId: string) => void;
  activeSubtitleId: string;
  subtitles: PlayerSubtitleTrack[];
  onSelectSubtitle: (subId: string) => void;
  subtitleStyles: SubtitleStyleSettings;
  onUpdateSubtitleStyles: (styles: Partial<SubtitleStyleSettings>) => void;
  availableServers: ProviderAdapter[];
  activeServerId: string;
  onSelectServer: (serverId: string) => void;
  playbackSpeed: number;
  onSelectSpeed: (speed: number) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isTheaterMode: boolean;
  onToggleTheaterMode: () => void;
  onTogglePip?: () => void;
  preferences: PlayerPreferences;
  onUpdatePreferences: (prefs: Partial<PlayerPreferences>) => void;
  visible: boolean;
  accentColor?: string;
}

export function PlayerControls({
  playing,
  onTogglePlay,
  onSeekRelative,
  onSeekTo,
  currentTime,
  duration,
  bufferedPercent,
  skipTimestamps,
  volume,
  muted,
  onVolumeChange,
  onToggleMute,
  activeQuality,
  qualities,
  onSelectQuality,
  activeAudioId,
  audioTracks,
  onSelectAudio,
  activeSubtitleId,
  subtitles,
  onSelectSubtitle,
  subtitleStyles,
  onUpdateSubtitleStyles,
  availableServers,
  activeServerId,
  onSelectServer,
  playbackSpeed,
  onSelectSpeed,
  isFullscreen,
  onToggleFullscreen,
  isTheaterMode,
  onToggleTheaterMode,
  onTogglePip,
  preferences,
  onUpdatePreferences,
  visible,
  accentColor = '#3b82f6',
}: PlayerControlsProps) {
  const [activeMenu, setActiveMenu] = useState<'none' | 'audio' | 'subtitle' | 'server' | 'settings'>('none');

  const closeMenu = () => setActiveMenu('none');

  // Compute Volume Icon
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  // Active audio label badge
  const activeAudioTrack = audioTracks.find((t) => t.id === activeAudioId);
  const audioBadge = activeAudioTrack?.label
    ? activeAudioTrack.label.split('(')[0].trim()
    : 'Audio';

  return (
    <div
      className={`absolute bottom-0 inset-x-0 z-30 px-3 sm:px-6 pt-10 pb-3 bg-gradient-to-t from-black/95 via-black/60 to-transparent transition-opacity duration-300 pointer-events-auto ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      onClick={(e) => {
        // Prevent clicks on control bar from pausing/unpausing the video
        e.stopPropagation();
      }}
    >
      {/* 1. Timeline Scrubber */}
      <div className="w-full mb-1">
        <PlayerTimeline
          currentTime={currentTime}
          duration={duration}
          bufferedPercent={bufferedPercent}
          skipTimestamps={skipTimestamps}
          onSeek={onSeekTo}
          accentColor={accentColor}
        />
      </div>

      {/* 2. Control Row */}
      <div className="flex items-center justify-between gap-2 text-white">
        {/* Left Side: Play/Pause, Replay/Forward, Volume Slider, Time Display */}
        <div className="flex items-center gap-1 sm:gap-2.5 min-w-0">
          {/* Play/Pause */}
          <button
            onClick={onTogglePlay}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl hover:bg-white/15 active:scale-95 transition flex items-center justify-center cursor-pointer text-white"
            title={playing ? 'Pause (Space)' : 'Play (Space)'}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
          </button>

          {/* Quick -10s / +10s */}
          <button
            onClick={() => onSeekRelative(-10)}
            className="hidden xs:flex w-8 h-8 rounded-xl hover:bg-white/15 active:scale-95 transition items-center justify-center cursor-pointer text-white/80 hover:text-white"
            title="Replay 10 Seconds"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => onSeekRelative(10)}
            className="hidden xs:flex w-8 h-8 rounded-xl hover:bg-white/15 active:scale-95 transition items-center justify-center cursor-pointer text-white/80 hover:text-white"
            title="Forward 10 Seconds"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Volume Control */}
          <div className="flex items-center group/volume relative">
            <button
              onClick={onToggleMute}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl hover:bg-white/15 active:scale-95 transition flex items-center justify-center cursor-pointer text-white"
              title={muted ? 'Unmute (M)' : 'Mute (M)'}
            >
              <VolumeIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Expandable Slider */}
            <div className="w-0 group-hover/volume:w-16 sm:group-hover/volume:w-20 transition-all duration-200 overflow-hidden flex items-center">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={muted ? 0 : volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="w-14 sm:w-18 h-1 accent-blue-500 bg-white/30 rounded-lg cursor-pointer ml-1"
                aria-label="Volume Slider"
              />
            </div>
          </div>

          {/* Time Display */}
          <div className="text-[11px] sm:text-xs font-semibold text-slate-300 ml-1 select-none whitespace-nowrap">
            <span>{formatPlayerTime(currentTime)}</span>
            <span className="text-slate-500 mx-1">/</span>
            <span>{formatPlayerTime(duration)}</span>
          </div>
        </div>

        {/* Right Side: Audio, Subtitles, Quality, Server, Speed, PiP, Theater, Fullscreen */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Audio Language Button (Scoped strictly to Fullscreen mode so it never duplicates the under-player LuminaServerDeck) */}
          {isFullscreen && audioTracks.length > 0 && (
            <button
              onClick={() => setActiveMenu(activeMenu === 'audio' ? 'none' : 'audio')}
              className={`px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer border ${
                activeMenu === 'audio'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/10'
              }`}
              title="Select Audio Language"
            >
              <Volume className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline truncate max-w-[85px]">{audioBadge}</span>
            </button>
          )}

          {/* Subtitles Button */}
          {subtitles.length > 0 && (
            <button
              onClick={() => setActiveMenu(activeMenu === 'subtitle' ? 'none' : 'subtitle')}
              className={`px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer border ${
                activeMenu === 'subtitle'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                  : activeSubtitleId !== 'off'
                  ? 'bg-white/20 text-white border-white/25'
                  : 'bg-white/10 hover:bg-white/20 text-slate-300 border-white/10'
              }`}
              title="Subtitles / Captions"
            >
              <Subtitles className="w-3.5 h-3.5" />
              <span className="hidden md:inline">CC</span>
            </button>
          )}

          {/* Streaming Server Switcher */}
          {availableServers.length > 0 && (
            <button
              onClick={() => setActiveMenu(activeMenu === 'server' ? 'none' : 'server')}
              className={`px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer border ${
                activeMenu === 'server'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/10'
              }`}
              title="Select Streaming Server"
            >
              <Server className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Server</span>
            </button>
          )}

          {/* Picture in Picture */}
          {onTogglePip && (
            <button
              onClick={onTogglePip}
              className="hidden sm:flex w-8 h-8 rounded-xl hover:bg-white/15 active:scale-95 transition items-center justify-center cursor-pointer text-slate-300 hover:text-white"
              title="Picture in Picture"
            >
              <PictureInPicture2 className="w-4 h-4" />
            </button>
          )}

          {/* Theater / Cinema Mode */}
          <button
            onClick={onToggleTheaterMode}
            className={`hidden sm:flex w-8 h-8 rounded-xl hover:bg-white/15 active:scale-95 transition items-center justify-center cursor-pointer ${
              isTheaterMode ? 'text-blue-400' : 'text-slate-300 hover:text-white'
            }`}
            title={isTheaterMode ? 'Exit Theater Mode (T)' : 'Theater Mode (T)'}
          >
            <Tv className="w-4 h-4" />
          </button>

          {/* Settings Menu Button */}
          <button
            onClick={() => setActiveMenu(activeMenu === 'settings' ? 'none' : 'settings')}
            className={`w-8 h-8 rounded-xl hover:bg-white/15 active:scale-95 transition flex items-center justify-center cursor-pointer ${
              activeMenu === 'settings' ? 'text-blue-400 bg-white/20' : 'text-slate-300 hover:text-white'
            }`}
            title="Player Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={onToggleFullscreen}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl hover:bg-white/15 active:scale-95 transition flex items-center justify-center cursor-pointer text-white ml-0.5"
            title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
        </div>
      </div>

      {/* ── Active Menus ── */}
      {activeMenu === 'audio' && (
        <PlayerAudioMenu
          tracks={audioTracks}
          activeTrackId={activeAudioId}
          onSelectTrack={onSelectAudio}
          onClose={closeMenu}
        />
      )}

      {activeMenu === 'subtitle' && (
        <PlayerSubtitleMenu
          tracks={subtitles}
          activeTrackId={activeSubtitleId}
          subtitleStyles={subtitleStyles}
          onSelectTrack={onSelectSubtitle}
          onUpdateStyles={onUpdateSubtitleStyles}
          onClose={closeMenu}
        />
      )}

      {activeMenu === 'server' && (
        <PlayerServerMenu
          availableServers={availableServers}
          activeServerId={activeServerId}
          onSelectServer={onSelectServer}
          onClose={closeMenu}
        />
      )}

      {activeMenu === 'settings' && (
        <PlayerSettingsModal
          qualities={qualities}
          activeQuality={activeQuality}
          onSelectQuality={onSelectQuality}
          audioTracks={audioTracks}
          activeAudioId={activeAudioId}
          onSelectAudio={onSelectAudio}
          subtitles={subtitles}
          activeSubtitleId={activeSubtitleId}
          onSelectSubtitle={onSelectSubtitle}
          speed={playbackSpeed}
          onSelectSpeed={onSelectSpeed}
          preferences={preferences}
          onUpdatePreferences={onUpdatePreferences}
          onClose={closeMenu}
        />
      )}
    </div>
  );
}
