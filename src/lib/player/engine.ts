import { NormalizedPlaybackSource, PlaybackStreamType, PlayerState } from './types';
import { PlayerAdapter, PlayerAdapterCallbacks } from './adapters/base';
import { HlsAdapter } from './adapters/hls-adapter';
import { DirectAdapter } from './adapters/direct-adapter';
import { EmbedAdapter } from './adapters/embed-adapter';

export class UniversalPlayerEngine {
  private activeAdapter: PlayerAdapter | null = null;
  private currentSource: NormalizedPlaybackSource | null = null;

  static detectStreamType(url: string, explicitDirectHls = false): PlaybackStreamType {
    if (!url) return 'embed';
    const clean = url.toLowerCase().split('?')[0];

    if (explicitDirectHls || clean.endsWith('.m3u8') || url.includes('.m3u8')) {
      return 'hls';
    }
    if (clean.endsWith('.mpd') || url.includes('.mpd')) {
      return 'dash';
    }
    if (clean.endsWith('.mp4') || clean.endsWith('.webm') || clean.endsWith('.mkv')) {
      return 'direct';
    }
    return 'embed';
  }

  createAdapter(type: PlaybackStreamType): PlayerAdapter {
    switch (type) {
      case 'hls':
        return new HlsAdapter();
      case 'direct':
        return new DirectAdapter();
      case 'embed':
      default:
        return new EmbedAdapter();
    }
  }

  async loadSource(
    container: HTMLElement,
    mediaElement: HTMLVideoElement | HTMLIFrameElement,
    source: NormalizedPlaybackSource,
    callbacks: PlayerAdapterCallbacks,
    initialTime = 0
  ): Promise<PlayerAdapter> {
    if (this.activeAdapter) {
      this.activeAdapter.destroy();
      this.activeAdapter = null;
    }

    this.currentSource = source;
    const adapter = this.createAdapter(source.type);
    this.activeAdapter = adapter;

    await adapter.initialize(container, mediaElement, source, callbacks, initialTime);
    return adapter;
  }

  getAdapter(): PlayerAdapter | null {
    return this.activeAdapter;
  }

  getSource(): NormalizedPlaybackSource | null {
    return this.currentSource;
  }

  destroy(): void {
    if (this.activeAdapter) {
      this.activeAdapter.destroy();
      this.activeAdapter = null;
    }
    this.currentSource = null;
  }
}
