'use client';

import React from 'react';
import { AlertCircle, RefreshCw, Volume2 } from 'lucide-react';

interface PlayerErrorOverlayProps {
  error: string;
  onTryNextServer: () => void;
  onSwitchToSub?: () => void;
  onRetry: () => void;
  isDubActive?: boolean;
}

export function PlayerErrorOverlay({
  error,
  onTryNextServer,
  onSwitchToSub,
  onRetry,
  isDubActive,
}: PlayerErrorOverlayProps) {
  return (
    <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#0e121e]/95 border border-white/15 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center">
          <AlertCircle className="w-7 h-7" />
        </div>

        <div>
          <h3 className="text-base sm:text-lg font-black text-white">Playback Interrupted</h3>
          <p className="text-xs text-slate-400 font-medium mt-1 leading-relaxed">
            {error || 'The current stream encountered a network issue or is temporarily unavailable.'}
          </p>
        </div>

        <div className="flex flex-col gap-2 w-full pt-2">
          {/* Try Next Server */}
          <button
            onClick={onTryNextServer}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/40 transition-transform active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Next Server</span>
          </button>

          {/* Switch to Original / SUB if Dub failed */}
          {isDubActive && onSwitchToSub && (
            <button
              onClick={onSwitchToSub}
              className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Switch to Original / SUB</span>
            </button>
          )}

          {/* Retry Connection */}
          <button
            onClick={onRetry}
            className="text-xs text-slate-500 hover:text-slate-300 py-1 transition cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      </div>
    </div>
  );
}
