'use client';

import { useParams, useRouter } from 'next/navigation';
import { useRef, useState, useEffect } from 'react';
import { useWatchParty } from '@/hooks/use-watch-party';
import { useWatchPartyStore } from '@/stores/watch-party-store';
import { ApiGateway } from '@/lib/api/gateway';
import { ProviderRegistry } from '@/lib/providers';
import { PlayerHandle } from '@/types/watch-party';
import { Link2, Crown, LogOut, Loader, AlertCircle, Users, Play, Pause, X, UserMinus } from 'lucide-react';

export default function PartyRoomPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) || 'en';
  const roomCode = params.roomCode as string;

  const playerRef = useRef<PlayerHandle>(null);
  const [showMembers, setShowMembers] = useState(false);
  
  const { handlePlay, handlePause, handleSeek, kickUser } = useWatchParty(roomCode, playerRef);
  const store = useWatchPartyStore();

  const [copied, setCopied] = useState(false);

  const copyInviteLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = () => {
    // Optionally alert the user or confirm
    router.push(`/${locale}`);
  };

  // Loading state
  if (store.connectionStatus === 'connecting' && !store.party) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
        <Loader className="w-8 h-8 animate-spin text-accent-blue" />
        <p className="font-semibold">Joining Watch Party...</p>
      </div>
    );
  }

  // Error state
  if (store.error) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4 p-6">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <h2 className="text-xl font-bold">Failed to Join Party</h2>
        <p className="text-slate-400 text-center max-w-sm">{store.error}</p>
        <button 
          onClick={() => router.push(`/${locale}`)}
          className="mt-4 px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition"
        >
          Go Home
        </button>
      </div>
    );
  }

  // If connected but party is null, something went wrong
  if (!store.party) {
    return null; 
  }

  // Determine sync status color and text
  const syncColorMap = {
    'synced': 'bg-green-500',
    'syncing': 'bg-yellow-500',
    'out-of-sync': 'bg-red-500'
  };

  const syncTextMap = {
    'synced': 'Synced',
    'syncing': 'Syncing...',
    'out-of-sync': 'Out of Sync'
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100 font-sans">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 z-10">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-sm font-bold text-white max-w-[200px] md:max-w-xs truncate">
              {store.party.movie_title}
            </h1>
            <p className="text-[10px] text-slate-400">
              {store.party.media_type === 'tv' 
                ? `S${store.party.season} E${store.party.episode}`
                : 'Movie'}
            </p>
          </div>
          
          <div className="hidden sm:flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-xs text-slate-400">Room Code:</span>
            <span className="text-xs font-mono font-bold tracking-wider">{roomCode}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowMembers(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 transition rounded-lg text-xs font-bold"
          >
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span>{store.viewerCount}/10</span>
          </button>

          {store.isHost && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-yellow-500/20 text-yellow-500 rounded-lg text-[10px] font-bold uppercase tracking-wider">
              <Crown className="w-3 h-3" />
              <span className="hidden sm:inline">Host</span>
            </div>
          )}

          {!store.isHost && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 rounded-lg text-[10px] font-bold uppercase tracking-wider">
              <div className={`w-2 h-2 rounded-full ${syncColorMap[store.syncStatus]}`} />
              <span className="hidden sm:inline">{syncTextMap[store.syncStatus]}</span>
            </div>
          )}

          <button
            onClick={copyInviteLink}
            className="flex items-center gap-2 px-3 py-1.5 bg-accent-blue hover:bg-blue-600 rounded-xl text-xs font-bold transition shadow-md"
          >
            <Link2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{copied ? 'Copied!' : 'Invite'}</span>
          </button>

          <button
            onClick={handleLeave}
            className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-xs font-bold transition"
            title="Leave Party"
          >
            <LogOut className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            <span className="hidden sm:inline">Leave</span>
          </button>
        </div>
      </div>

      {/* Main Video Area */}
      <div className="flex-1 relative bg-black">
        <iframe
          src={
            store.party
              ? ProviderRegistry.resolvePlaybackUrl(store.party.provider || 'vidfast', {
                  mediaType: (store.party.media_type as 'movie' | 'tv' | 'anime') || 'movie',
                  tmdbId: store.party.movie_id,
                  season: store.party.season ?? undefined,
                  episode: store.party.episode ?? undefined,
                })
              : ''
          }
          className="w-full h-full min-h-[75vh]"
          allowFullScreen
          allow="autoplay *; fullscreen *; picture-in-picture *; encrypted-media *"
          title="Lumina Watch Party Player"
          style={{ border: 'none' }}
        />
        
        {/* Disconnection Warning Overlay */}
        {store.connectionStatus === 'reconnecting' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-yellow-500/90 text-black px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 shadow-xl animate-pulse">
            <Loader className="w-3 h-3 animate-spin" />
            Reconnecting to party...
          </div>
        )}
        {/* Host Control Panel */}
        {store.isHost && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-900/95 backdrop-blur-md border border-slate-700/50 rounded-2xl p-2.5 z-40 shadow-2xl animate-fade-in">
            <div className="px-3 flex items-center gap-2 border-r border-slate-700/50">
              <Crown className="w-4 h-4 text-yellow-500" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Host</span>
            </div>
            <button
              onClick={() => playerRef.current?.play()}
              className="p-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white transition-transform hover:scale-105"
              title="Force Play"
            >
              <Play className="w-5 h-5 fill-white" />
            </button>
            <button
              onClick={() => playerRef.current?.pause()}
              className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-white transition-transform hover:scale-105"
              title="Force Pause"
            >
              <Pause className="w-5 h-5 fill-white" />
            </button>
          </div>
        )}
        
        {/* Members Modal */}
        {showMembers && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  Party Members ({store.viewerCount}/10)
                </h3>
                <button onClick={() => setShowMembers(false)} className="text-slate-400 hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-2 max-h-64 overflow-y-auto">
                {store.members.length === 0 ? (
                  <p className="text-center text-slate-500 text-sm py-8">Waiting for others to join...</p>
                ) : (
                  store.members.map(member => (
                    <div key={member.userId} className="flex items-center justify-between p-3 hover:bg-slate-800/50 rounded-xl transition">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${member.role === 'host' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-slate-800 text-slate-300'}`}>
                          {member.role === 'host' ? <Crown className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                        </div>
                        <span className={`text-sm font-semibold ${member.userId === store.userId ? 'text-blue-400' : 'text-slate-200'}`}>
                          {member.name} {member.userId === store.userId ? '(You)' : ''}
                        </span>
                      </div>
                      
                      {store.isHost && member.role !== 'host' && (
                        <button
                          onClick={() => kickUser(member.userId)}
                          className="flex items-center gap-1.5 px-2 py-1.5 text-[10px] uppercase font-bold tracking-wider text-red-500 hover:bg-red-500/10 rounded-lg transition"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                          Kick
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
