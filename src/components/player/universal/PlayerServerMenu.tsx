'use client';

import React from 'react';
import { Server, Check, Clock, AlertCircle } from 'lucide-react';
import { ProviderAdapter } from '@/types/media';
import { ProviderTelemetry } from '@/lib/providers';

interface PlayerServerMenuProps {
  availableServers: ProviderAdapter[];
  activeServerId: string;
  onSelectServer: (serverId: string) => void;
  onClose: () => void;
}

export function PlayerServerMenu({
  availableServers,
  activeServerId,
  onSelectServer,
  onClose,
}: PlayerServerMenuProps) {
  return (
    <div
      className="absolute bottom-16 right-4 sm:right-28 z-50 w-72 max-w-[90vw] rounded-2xl bg-[#090d16]/95 backdrop-blur-2xl border border-white/15 p-2 shadow-2xl text-white animate-in fade-in zoom-in-95 duration-150"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 mb-1">
        <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Server className="w-3.5 h-3.5 text-blue-400" />
          Streaming Servers ({availableServers.length})
        </span>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded transition cursor-pointer"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-col gap-1 max-h-64 overflow-y-auto py-1">
        {availableServers.map((server) => {
          const isSelected = activeServerId === server.id;
          const health = ProviderTelemetry.getHealth(server.id);
          const inCooldown = ProviderTelemetry.isInCooldown(server.id);

          return (
            <button
              key={server.id}
              onClick={() => {
                onSelectServer(server.id);
                onClose();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-200 hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {/* Health Dot */}
                {inCooldown ? (
                  <span title="In Cooldown" className="shrink-0 flex items-center">
                    <Clock className="w-3 h-3 text-red-400" />
                  </span>
                ) : health.status === 'DEGRADED' ? (
                  <span title="Degraded Connection" className="shrink-0 flex items-center">
                    <AlertCircle className="w-3 h-3 text-amber-400" />
                  </span>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Healthy Server" />
                )}

                <div className="truncate flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 truncate">
                    <span>{server.badge}</span>
                    <span className="truncate">{server.name}</span>
                    {server.supportsHindiDub && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                        HI
                      </span>
                    )}
                    {server.supportsEnglishDub && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-blue-500/20 text-blue-300 font-bold">
                        EN
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                    {server.quality.split('/')[0].trim()}
                    {health.avgLatencyMs ? ` • ${health.avgLatencyMs}ms` : ' • Ultra HD'}
                  </div>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-1.5">
                {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
