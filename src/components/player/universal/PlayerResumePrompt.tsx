'use client';

import React from 'react';
import { Play, RotateCcw, X } from 'lucide-react';
import { formatPlayerTime } from './PlayerTimeline';

interface PlayerResumePromptProps {
  timestamp: number;
  onResume: () => void;
  onRestart: () => void;
  onDismiss: () => void;
}

export function PlayerResumePrompt({
  timestamp,
  onResume,
  onRestart,
  onDismiss,
}: PlayerResumePromptProps) {
  return (
    <div className="absolute inset-0 z-40 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="relative bg-[#0c101c]/95 border border-white/15 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center flex flex-col items-center gap-4">
        {/* Dismiss Button */}
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-14 h-14 rounded-full bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center">
          <Play className="w-6 h-6 ml-0.5 fill-blue-400" />
        </div>

        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">
            Playback Progress Found
          </span>
          <h3 className="text-base sm:text-lg font-black text-white mt-0.5">
            Resume from {formatPlayerTime(timestamp)}?
          </h3>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            You were watching this title earlier.
          </p>
        </div>

        <div className="flex flex-col gap-2 w-full pt-1">
          <button
            onClick={onResume}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/40 transition-transform active:scale-95 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Resume from {formatPlayerTime(timestamp)}</span>
          </button>

          <button
            onClick={onRestart}
            className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Start from Beginning</span>
          </button>
        </div>
      </div>
    </div>
  );
}
