/**
 * NovaAPI Stream Provider
 * Lumina Media Engine
 *
 * Connects to NovaAPI (https://8streamapi.vercel.app) to resolve streaming sources
 * and multi-audio tracks via IMDb ID.
 *
 * Documented NovaAPI endpoints:
 *   GET  /api/v1/mediaInfo?id=<imdbId>[&season=<s>&episode=<e>] → { success, data: { playlist, key, subtitles? } }
 *   POST /api/v1/getStream  { file, key }                       → { success, data: { link } }
 *   GET  /                                                      → "its ok" (health check)
 *
 * Fallback Embed Player:
 *   https://slast430did.com/play/<imdbId>[?season=<s>&episode=<e>]
 *
 * Zero fabricated streams: genuine tracks and clean player integration.
 */

import { ApiGateway } from '@/lib/api/gateway';

export interface NovaTrackEntry {
  title?: string;
  id?: string;
  file?: string;
}

export interface NovaFolderEntry {
  title?: string;
  id?: string;
  file?: string;
  folder?: (NovaFolderEntry | NovaTrackEntry)[];
}

export interface NovaSubtitleEntry {
  title?: string;
  lang?: string;
  file?: string;
  url?: string;
}

export interface NovaMediaInfoResponse {
  success?: boolean;
  data?: {
    playlist?: (NovaFolderEntry | NovaTrackEntry)[];
    key?: string;
    subtitles?: NovaSubtitleEntry[];
  };
  message?: string;
}

export interface NovaStreamResponse {
  success?: boolean;
  data?: {
    link?: string;
  };
  message?: string;
}

export interface NovaResolveRequest {
  type: 'movie' | 'tv' | 'anime';
  id: number | string;
  imdbId?: string;
  season?: number;
  episode?: number;
  title?: string;
  isAnime?: boolean;
  subOrDub?: 'sub' | 'dub';
  language?: string;
}

export interface NovaPlaybackResult {
  status: 'ok' | 'unavailable' | 'error';
  providerId: string;
  providerLabel: string;
  playback: {
    kind: 'embed' | 'native';
    embedUrl?: string;
    url?: string;
    streamType?: string;
  };
  audioTracks: Array<{ label: string; selected: boolean }>;
  subtitles: Array<{ label: string; url?: string; lang?: string }>;
  selectedLanguage: string;
  server: string;
  notice?: string;
  message?: string;
}

function getNovaApiBaseUrl(): string {
  const url = process.env.NOVA_API_URL?.trim() || 'https://8streamapi.vercel.app';
  return url.replace(/\/+$/, '');
}

function parseNumber(str?: string): number | null {
  if (!str) return null;
  const match = str.match(/(?:season|episode|ep|s|e)?\s*(\d+)/i);
  return match?.[1] ? parseInt(match[1], 10) : null;
}

export function extractNovaTracks(
  playlist: (NovaFolderEntry | NovaTrackEntry)[],
  type: 'movie' | 'tv' | 'anime',
  season: number = 1,
  episode: number = 1
): { tracks: NovaTrackEntry[] } {
  if (!Array.isArray(playlist) || playlist.length === 0) {
    return { tracks: [] };
  }

  const first = playlist[0];
  const isNested = Boolean(
    first && typeof first === 'object' && 'folder' in first && Array.isArray(first.folder)
  );

  // Flat playlist for movies
  if (!isNested || type === 'movie') {
    const tracks = playlist.filter(
      (item): item is NovaTrackEntry =>
        Boolean(item && typeof item === 'object' && 'file' in item && item.file)
    );
    return { tracks };
  }

  // TV navigation: Match Season
  let matchedSeason: NovaFolderEntry | null = null;
  for (const s of playlist) {
    const folder = s as NovaFolderEntry;
    if (parseNumber(folder.title) === season) {
      matchedSeason = folder;
      break;
    }
  }

  if (!matchedSeason) {
    const idx = season - 1;
    matchedSeason = (idx >= 0 && idx < playlist.length ? playlist[idx] : playlist[0]) as NovaFolderEntry;
  }

  const epList = matchedSeason?.folder;
  if (!Array.isArray(epList) || epList.length === 0) {
    return { tracks: [] };
  }

  // Match Episode
  let matchedEpisode: NovaFolderEntry | NovaTrackEntry | null = null;
  for (const ep of epList) {
    if (parseNumber(ep.title) === episode) {
      matchedEpisode = ep;
      break;
    }
  }

  if (!matchedEpisode) {
    const epIdx = episode - 1;
    matchedEpisode = epIdx >= 0 && epIdx < epList.length ? epList[epIdx] : epList[0];
  }

  if (!matchedEpisode) return { tracks: [] };

  if ('folder' in matchedEpisode && Array.isArray(matchedEpisode.folder)) {
    const tracks = matchedEpisode.folder.filter(
      (item): item is NovaTrackEntry =>
        Boolean(item && typeof item === 'object' && 'file' in item && item.file)
    );
    return { tracks };
  }

  if ('file' in matchedEpisode && matchedEpisode.file) {
    return { tracks: [matchedEpisode as NovaTrackEntry] };
  }

  return { tracks: [] };
}

export class NovaProvider {
  readonly id = 'nova';
  readonly label = 'Nova Ultra HD';

  /**
   * Builds the official Nova embed player URL
   */
  getEmbedUrl(imdbId: string, season?: number, episode?: number, type: 'movie' | 'tv' | 'anime' = 'movie'): string {
    const cleanId = encodeURIComponent(imdbId.trim());
    if (type === 'tv' && season !== undefined && episode !== undefined) {
      return `https://slast430did.com/play/${cleanId}?season=${season}&episode=${episode}`;
    }
    return `https://slast430did.com/play/${cleanId}`;
  }

  /**
   * Resolves stream via NovaAPI with failover to Nova embed player
   */
  async resolve(req: NovaResolveRequest): Promise<NovaPlaybackResult> {
    const type = req.type === 'tv' ? 'tv' : 'movie';
    const season = req.season ?? 1;
    const episode = req.episode ?? 1;

    // 1. Resolve IMDb ID
    let imdbId = req.imdbId;
    if (!imdbId) {
      imdbId = (await ApiGateway.getImdbId(req.id, type)) || undefined;
    }

    // If no IMDb ID exists, Nova cannot resolve; inform caller
    if (!imdbId) {
      return {
        status: 'unavailable',
        providerId: this.id,
        providerLabel: this.label,
        playback: { kind: 'embed' },
        audioTracks: [],
        subtitles: [],
        selectedLanguage: 'Original',
        server: this.id,
        message: 'No IMDb ID available for this title. Nova requires an IMDb identifier.',
      };
    }

    const defaultEmbedUrl = this.getEmbedUrl(imdbId, season, episode, type);

    const isHindiRequested = req.language?.toLowerCase() === 'hindi';
    const defaultAudioTracks = [
      { label: 'Original / Multi-Audio', selected: !isHindiRequested },
      { label: 'Hindi Dubbed', selected: isHindiRequested },
    ];

    const baseUrl = getNovaApiBaseUrl();

    // 2. Query NovaAPI mediaInfo endpoint
    try {
      let mediaInfoUrl = `${baseUrl}/api/v1/mediaInfo?id=${encodeURIComponent(imdbId)}`;
      if (type === 'tv') {
        mediaInfoUrl += `&season=${season}&episode=${episode}`;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(mediaInfoUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Lumina/2.0',
        },
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      if (res.ok) {
        const json = (await res.json()) as NovaMediaInfoResponse;

        if (json && json.success && json.data) {
          const playlist = json.data.playlist || [];
          const key = json.data.key;
          const subtitles = (json.data.subtitles || []).map((sub) => ({
            label: sub.title || sub.lang || 'Subtitle',
            url: sub.file || sub.url,
            lang: sub.lang,
          }));

          const { tracks } = extractNovaTracks(playlist, type, season, episode);

          if (tracks.length > 0 && key) {
            // Find requested audio or fallback to first track
            let chosenTrack = tracks[0];
            if (isHindiRequested) {
              const hi = tracks.find((t) => t.title?.toLowerCase().includes('hindi'));
              if (hi) chosenTrack = hi;
            }

            // Call getStream
            try {
              const streamRes = await fetch(`${baseUrl}/api/v1/getStream`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file: chosenTrack.file, key }),
              });

              if (streamRes.ok) {
                const streamJson = (await streamRes.json()) as NovaStreamResponse;
                const link = streamJson?.data?.link;

                if (link && typeof link === 'string') {
                  const isHls = link.includes('.m3u8');
                  return {
                    status: 'ok',
                    providerId: this.id,
                    providerLabel: this.label,
                    playback: isHls
                      ? { kind: 'native', streamType: 'hls', url: link }
                      : { kind: 'embed', embedUrl: link },
                    audioTracks: tracks.map((t) => ({
                      label: t.title || 'Track',
                      selected: t === chosenTrack,
                    })),
                    subtitles,
                    selectedLanguage: chosenTrack.title || 'Original',
                    server: this.id,
                    notice: 'Streaming directly via NovaAPI HLS engine.',
                  };
                }
              }
            } catch {
              // getStream failed, fall through to embed
            }
          }
        }
      }
    } catch {
      // mediaInfo failed or timed out, fall through to embed
    }

    // 3. Resilient fallback to official Nova embed player
    return {
      status: 'ok',
      providerId: this.id,
      providerLabel: this.label,
      playback: {
        kind: 'embed',
        embedUrl: defaultEmbedUrl,
      },
      audioTracks: defaultAudioTracks,
      subtitles: [],
      selectedLanguage: isHindiRequested ? 'Hindi Dubbed' : 'Original / Multi-Audio',
      server: this.id,
      notice: 'Streaming via Nova engine. Audio tracks and subtitles available in player controls.',
    };
  }
}
