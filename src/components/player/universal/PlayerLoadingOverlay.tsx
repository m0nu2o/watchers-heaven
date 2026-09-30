'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface PlayerLoadingOverlayProps {
  statusMessage?: string | null;
}

export function PlayerLoadingOverlay({ statusMessage }: PlayerLoadingOverlayProps) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-150">
      <div className="flex flex-col items-center gap-2.5 px-5 py-3.5 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 text-white shadow-2xl">
        <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
        <span className="text-xs font-semibold tracking-wide text-slate-200">
          {statusMessage || 'Loading stream...'}
        </span>
      </div>
    </div>
  );
}
