import { PlayerPreferences } from './types';

const STORAGE_KEY = 'lumina-player-preferences-v1';

export const DEFAULT_PLAYER_PREFERENCES: PlayerPreferences = {
  preferredAudio: 'sub',
  preferredSubtitle: 'off',
  preferredQuality: 'auto',
  speed: 1.0,
  volume: 0.9,
  muted: false,
  autoPlay: true,
  autoNext: true,
  autoSkipIntro: false,
  theaterMode: false,
  subtitleStyles: {
    fontSize: 'medium',
    color: '#ffffff',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    textShadow: true,
  },
};

export const PlayerPreferencesStore = {
  get(): PlayerPreferences {
    if (typeof window === 'undefined') return DEFAULT_PLAYER_PREFERENCES;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return DEFAULT_PLAYER_PREFERENCES;
      return { ...DEFAULT_PLAYER_PREFERENCES, ...JSON.parse(stored) };
    } catch {
      return DEFAULT_PLAYER_PREFERENCES;
    }
  },

  set(prefs: Partial<PlayerPreferences>): PlayerPreferences {
    if (typeof window === 'undefined') return DEFAULT_PLAYER_PREFERENCES;
    try {
      const current = PlayerPreferencesStore.get();
      const updated = { ...current, ...prefs };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    } catch {
      return DEFAULT_PLAYER_PREFERENCES;
    }
  },
};
