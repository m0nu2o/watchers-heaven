import { useEffect, useRef, useCallback } from 'react';
import { useWatchPartyStore } from '@/stores/watch-party-store';
import { supabase } from '@/lib/supabase/client';
import { calculateLatencyCompensation, computeSyncStatus, shouldCorrectDrift } from '@/lib/watch-party/sync';
import { PlayerHandle, RealtimePartyPayload, WatchPartyMember, BroadcastKickPayload } from '@/types/watch-party';
import { useRouter } from 'next/navigation';

const SYNC_INTERVAL_MS = 5000; // 5 seconds

export function useWatchParty(roomCode: string, playerRef: React.RefObject<PlayerHandle | null>) {
  const store = useWatchPartyStore();
  const router = useRouter();
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Ensure Auth Session
  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        store.setUserId(session.user.id);
      } else {
        let guestId = typeof window !== 'undefined' ? localStorage.getItem('lumina-guest-id') : null;
        if (!guestId) {
          guestId = crypto.randomUUID();
          if (typeof window !== 'undefined') localStorage.setItem('lumina-guest-id', guestId);
        }
        try {
          const { data } = await supabase.auth.signInAnonymously();
          if (data?.user?.id) {
            store.setUserId(data.user.id);
            return;
          }
        } catch {
          // Anonymous sign-ins disabled on Supabase, fallback cleanly to guestId
        }
        store.setUserId(guestId);
      }
    };
    initAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Fetch Initial Party State & Setup Realtime
  useEffect(() => {
    if (!store.userId || !roomCode) return;

    let channel: ReturnType<typeof supabase.channel>;

    const initParty = async () => {
      store.setConnectionStatus('connecting');
      try {
        const response = await fetch(`/api/party/${roomCode}`);
        if (!response.ok) {
          throw new Error('Failed to fetch party');
        }
        const party = await response.json();
        
        store.setParty(party);
        store.setIsHost(party.host_user_id === store.userId);
        store.setPlaying(party.playing);
        
        // Initial sync
        if (playerRef.current && party.current_time > 0) {
          playerRef.current.seekTo(party.current_time);
        }

        // Cleanup any existing channel for this topic (fixes StrictMode re-mount errors)
        const topic = `party:${party.id}`;
        const existingChannels = supabase.getChannels().filter((c) => c.topic === topic);
        for (const c of existingChannels) {
          await supabase.removeChannel(c);
        }

        // Setup Realtime with Presence
        channel = supabase
          .channel(topic, {
            config: {
              presence: {
                key: store.userId || undefined,
              },
            },
          })
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'watch_parties',
              filter: `id=eq.${party.id}`,
            },
            (payload) => {
              store.handleRealtimeUpdate(payload as unknown as RealtimePartyPayload);
              
              // Apply playback state immediately if not host
              if (store.userId !== party.host_user_id && playerRef.current) {
                const newParty = payload.new as { playing: boolean };
                if (newParty.playing && !playerRef.current.isPlaying()) {
                  playerRef.current.play();
                } else if (!newParty.playing && playerRef.current.isPlaying()) {
                  playerRef.current.pause();
                }
              }
            }
          )
          .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            const count = Object.keys(state).length;
            
            // Enforce max 10 users limit (if we are a guest and the room is full)
            if (count > 10 && store.userId !== party.host_user_id) {
              supabase.removeChannel(channel);
              store.setError('Room is full (max 10 people)');
              store.setConnectionStatus('disconnected');
              return;
            }
            
            store.setViewerCount(count);

            // Build members list
            let guestCounter = 1;
            const newMembers: WatchPartyMember[] = [];
            
            // Host is always first if present
            if (state[party.host_user_id]) {
              newMembers.push({
                userId: party.host_user_id,
                name: 'Host',
                role: 'host'
              });
            }

            for (const key of Object.keys(state)) {
              if (key === party.host_user_id) continue;
              newMembers.push({
                userId: key,
                name: `Guest ${guestCounter++}`,
                role: 'guest'
              });
            }
            store.setMembers(newMembers);
          })
          .on('broadcast', { event: 'kick' }, (payload) => {
            const data = payload.payload as BroadcastKickPayload;
            if (data.targetUserId === store.userId) {
              supabase.removeChannel(channel);
              store.setError('You have been kicked by the host.');
              store.setConnectionStatus('disconnected');
            }
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              store.setConnectionStatus('connected');
              await channel.track({ user: store.userId });
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
              store.setConnectionStatus('disconnected');
            }
          });

      } catch (err) {
        store.setError((err as Error).message);
        store.setConnectionStatus('disconnected');
      }
    };

    initParty();

    return () => {
      if (channel) supabase.removeChannel(channel);
      store.reset();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, store.userId, playerRef]);

  // 3. Sync/Drift Interval
  useEffect(() => {
    if (!store.party || !playerRef.current) return;

    const runSync = async () => {
      const player = playerRef.current;
      const party = store.party;
      if (!player || !party) return;

      const currentLocalTime = player.getCurrentTime();

      if (store.isHost) {
        // Host heartbeat: Update DB with current time
        try {
          await fetch(`/api/party/${roomCode}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playing: player.isPlaying(),
              currentTime: currentLocalTime,
            }),
          });
        } catch (e) {
          console.error('Heartbeat failed', e);
        }
      } else {
        // Guest drift check
        if (party.playing) {
          const expectedTime = calculateLatencyCompensation(
            party.current_time,
            party.updated_at
          );
          
          store.setSyncStatus(computeSyncStatus(currentLocalTime, expectedTime));

          if (shouldCorrectDrift(currentLocalTime, expectedTime)) {
            console.log(`Drift detected: local ${currentLocalTime}, expected ${expectedTime}. Correcting...`);
            player.seekTo(expectedTime);
          }
        }
      }
    };

    syncIntervalRef.current = setInterval(runSync, SYNC_INTERVAL_MS);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.party, store.isHost, roomCode, playerRef]);

  // 4. Callbacks for Player
  const handlePlay = useCallback(() => {
    if (store.isHost && playerRef.current) {
       fetch(`/api/party/${roomCode}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playing: true,
          currentTime: playerRef.current.getCurrentTime(),
        }),
      }).catch(console.error);
    }
  }, [store.isHost, roomCode, playerRef]);

  const handlePause = useCallback(() => {
    if (store.isHost && playerRef.current) {
       fetch(`/api/party/${roomCode}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playing: false,
          currentTime: playerRef.current.getCurrentTime(),
        }),
      }).catch(console.error);
    }
  }, [store.isHost, roomCode, playerRef]);

  const handleSeek = useCallback((time: number) => {
    if (store.isHost) {
       fetch(`/api/party/${roomCode}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playing: store.playing, // Keep current playing state
          currentTime: time,
        }),
      }).catch(console.error);
    }
  }, [store.isHost, roomCode, store.playing]);

  const kickUser = useCallback((targetUserId: string) => {
    if (!store.isHost || !store.party) return;
    
    supabase.channel(`party:${store.party.id}`).send({
      type: 'broadcast',
      event: 'kick',
      payload: { targetUserId } as BroadcastKickPayload
    });
  }, [store.isHost, store.party]);

  return {
    handlePlay,
    handlePause,
    handleSeek,
    kickUser
  };
}
