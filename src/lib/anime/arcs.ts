/**
 * Authoritative Story Arc Metadata Layer for Anime
 * Lumina Media Engine
 *
 * Preserves canonical TMDB / AniList season numbering while providing
 * clean, organized story arc subdivisions inside long-running anime
 * (e.g. One Piece, Naruto, Naruto Shippuden, Bleach, Dragon Ball Z, Hunter x Hunter).
 */

export interface StoryArc {
  id: string;            // Unique identifier
  name: string;          // e.g. "East Blue Arc"
  shortName: string;     // e.g. "East Blue"
  seasonNumber: number;  // Canonical season number it belongs to
  startEpisode: number;  // Starting episode number within this season
  endEpisode: number;    // Ending episode number within this season
  description?: string;
}

export interface AnimeArcConfig {
  tmdbId: number;
  aniListId?: number;
  title: string;
  arcs: StoryArc[];
}

/**
 * Authoritative Arc definitions for prominent long-running series
 */
const ANIME_ARCS_REGISTRY: Record<number, StoryArc[]> = {
  // ── One Piece (TMDB 37854, AniList 21) ──
  37854: [
    // Season 1: East Blue
    { id: 'op-s1-romance-orange', name: 'Romance Dawn & Orange Town Arc', shortName: 'Romance Dawn', seasonNumber: 1, startEpisode: 1, endEpisode: 8 },
    { id: 'op-s1-syrup', name: 'Syrup Village Arc', shortName: 'Syrup Village', seasonNumber: 1, startEpisode: 9, endEpisode: 18 },
    { id: 'op-s1-baratie', name: 'Baratie Arc', shortName: 'Baratie', seasonNumber: 1, startEpisode: 19, endEpisode: 30 },
    { id: 'op-s1-arlong', name: 'Arlong Park Arc', shortName: 'Arlong Park', seasonNumber: 1, startEpisode: 31, endEpisode: 44 },
    { id: 'op-s1-loguetown', name: 'Loguetown & Warship Island Arc', shortName: 'Loguetown', seasonNumber: 1, startEpisode: 45, endEpisode: 61 },

    // Season 2: Entering into the Grand Line
    { id: 'op-s2-reverse-whiskey', name: 'Reverse Mountain & Whiskey Peak', shortName: 'Whiskey Peak', seasonNumber: 2, startEpisode: 62, endEpisode: 67 },
    { id: 'op-s2-little-garden', name: 'Little Garden Arc', shortName: 'Little Garden', seasonNumber: 2, startEpisode: 68, endEpisode: 77 },

    // Season 3: Introducing Chopper
    { id: 'op-s3-drum-island', name: 'Drum Island Arc', shortName: 'Drum Island', seasonNumber: 3, startEpisode: 78, endEpisode: 91 },

    // Season 4: Alabasta
    { id: 'op-s4-alabasta', name: 'Alabasta Kingdom Arc', shortName: 'Alabasta', seasonNumber: 4, startEpisode: 92, endEpisode: 130 },

    // Season 5: Post-Alabasta & Dreams
    { id: 'op-s5-post-alabasta', name: 'Post-Alabasta & Dreams Arc', shortName: 'Post-Alabasta', seasonNumber: 5, startEpisode: 131, endEpisode: 143 },

    // Season 6: Sky Island
    { id: 'op-s6-jaya', name: 'Jaya Arc', shortName: 'Jaya', seasonNumber: 6, startEpisode: 144, endEpisode: 152 },
    { id: 'op-s6-skypiea', name: 'Skypiea Arc', shortName: 'Skypiea', seasonNumber: 6, startEpisode: 153, endEpisode: 195 },

    // Season 7: Escape! Marine Fortress & Foxy
    { id: 'op-s7-g8', name: 'G-8 Marine Fortress Arc', shortName: 'G-8 Navarone', seasonNumber: 7, startEpisode: 196, endEpisode: 206 },
    { id: 'op-s7-foxy', name: 'Long Ring Long Land (Foxy) Arc', shortName: 'Davy Back Fight', seasonNumber: 7, startEpisode: 207, endEpisode: 228 },

    // Season 8: Water Seven
    { id: 'op-s8-water-seven', name: 'Water Seven Arc', shortName: 'Water Seven', seasonNumber: 8, startEpisode: 229, endEpisode: 263 },

    // Season 9: Enies Lobby
    { id: 'op-s9-enies-lobby', name: 'Enies Lobby Arc', shortName: 'Enies Lobby', seasonNumber: 9, startEpisode: 264, endEpisode: 312 },
    { id: 'op-s9-post-enies', name: 'Post-Enies Lobby Arc', shortName: 'Post-Enies Lobby', seasonNumber: 9, startEpisode: 313, endEpisode: 336 },

    // Season 10: Thriller Bark
    { id: 'op-s10-thriller-bark', name: 'Thriller Bark Arc', shortName: 'Thriller Bark', seasonNumber: 10, startEpisode: 337, endEpisode: 381 },

    // Season 11: Sabaody Archipelago
    { id: 'op-s11-sabaody', name: 'Sabaody Archipelago Arc', shortName: 'Sabaody', seasonNumber: 11, startEpisode: 382, endEpisode: 405 },

    // Season 12: Island of Women
    { id: 'op-s12-amazon-lily', name: 'Amazon Lily Arc', shortName: 'Amazon Lily', seasonNumber: 12, startEpisode: 406, endEpisode: 421 },

    // Season 13: Impel Down
    { id: 'op-s13-impel-down', name: 'Impel Down Arc', shortName: 'Impel Down', seasonNumber: 13, startEpisode: 422, endEpisode: 458 },

    // Season 14: Marineford
    { id: 'op-s14-marineford', name: 'Marineford War Arc', shortName: 'Marineford', seasonNumber: 14, startEpisode: 459, endEpisode: 489 },
    { id: 'op-s14-post-war', name: 'Post-War Flashback Arc', shortName: 'Post-War', seasonNumber: 14, startEpisode: 490, endEpisode: 516 },

    // Season 15: Fishman Island
    { id: 'op-s15-fishman', name: 'Fishman Island Arc', shortName: 'Fishman Island', seasonNumber: 15, startEpisode: 517, endEpisode: 574 },

    // Season 16: Punk Hazard
    { id: 'op-s16-punk-hazard', name: 'Punk Hazard Arc', shortName: 'Punk Hazard', seasonNumber: 16, startEpisode: 575, endEpisode: 628 },

    // Season 17: Dressrosa
    { id: 'op-s17-colosseum', name: 'Corrida Colosseum Arc', shortName: 'Colosseum', seasonNumber: 17, startEpisode: 629, endEpisode: 678 },
    { id: 'op-s17-dressrosa', name: 'Battle for Dressrosa Arc', shortName: 'Dressrosa', seasonNumber: 17, startEpisode: 679, endEpisode: 746 },

    // Season 18: Zou
    { id: 'op-s18-zou', name: 'Zou Arc', shortName: 'Zou', seasonNumber: 18, startEpisode: 747, endEpisode: 782 },

    // Season 19: Whole Cake Island
    { id: 'op-s19-whole-cake', name: 'Whole Cake Island Arc', shortName: 'Whole Cake Island', seasonNumber: 19, startEpisode: 783, endEpisode: 877 },

    // Season 20: Levely
    { id: 'op-s20-levely', name: 'Levely (Reverie) Arc', shortName: 'Levely', seasonNumber: 20, startEpisode: 878, endEpisode: 891 },

    // Season 21: Wano Country
    { id: 'op-s21-wano-act1', name: 'Wano Country: Act 1', shortName: 'Wano Act 1', seasonNumber: 21, startEpisode: 892, endEpisode: 915 },
    { id: 'op-s21-wano-act2', name: 'Wano Country: Act 2 & Oden Past', shortName: 'Wano Act 2', seasonNumber: 21, startEpisode: 916, endEpisode: 958 },
    { id: 'op-s21-wano-act3', name: 'Wano Country: Raid on Onigashima', shortName: 'Onigashima Raid', seasonNumber: 21, startEpisode: 959, endEpisode: 1085 },

    // Season 22: Egghead
    { id: 'op-s22-egghead', name: 'Egghead Arc', shortName: 'Egghead', seasonNumber: 22, startEpisode: 1086, endEpisode: 1122 },
  ],

  // ── Naruto (TMDB 46260, AniList 20) ──
  // TMDB canonical seasons: S1 (1–52), S2 (53–104), S3 (105–158), S4 (159–220)
  46260: [
    // Season 1: Episodes 1–52
    { id: 'naruto-s1-waves', name: 'Prologue - Land of Waves Arc', shortName: 'Land of Waves', seasonNumber: 1, startEpisode: 1, endEpisode: 19 },
    { id: 'naruto-s1-chunin', name: 'Chunin Exams Arc (Preliminary)', shortName: 'Chunin Exams', seasonNumber: 1, startEpisode: 20, endEpisode: 52 },

    // Season 2: Episodes 53–104
    { id: 'naruto-s2-konoha', name: 'Chunin Finals & Konoha Crush Arc', shortName: 'Konoha Crush', seasonNumber: 2, startEpisode: 53, endEpisode: 80 },
    { id: 'naruto-s2-tsunade', name: 'Search for Tsunade Arc', shortName: 'Search for Tsunade', seasonNumber: 2, startEpisode: 81, endEpisode: 104 },

    // Season 3: Episodes 105–158
    { id: 'naruto-s3-sasuke', name: 'Sasuke Recovery Mission Arc', shortName: 'Sasuke Recovery', seasonNumber: 3, startEpisode: 105, endEpisode: 135 },
    { id: 'naruto-s3-missions', name: 'Post-Sasuke Recovery Missions', shortName: 'Recovery Missions', seasonNumber: 3, startEpisode: 136, endEpisode: 158 },

    // Season 4: Episodes 159–220
    { id: 'naruto-s4-special', name: 'Special Missions Arc', shortName: 'Special Missions', seasonNumber: 4, startEpisode: 159, endEpisode: 185 },
    { id: 'naruto-s4-departure', name: 'Sunagakure Support & Departure Arc', shortName: 'Departure', seasonNumber: 4, startEpisode: 186, endEpisode: 220 },
  ],

  // ── Naruto Shippuden (TMDB 31911, AniList 1735) ──
  31911: [
    { id: 'shippuden-s1', name: 'Kazekage Rescue Arc', shortName: 'Kazekage Rescue', seasonNumber: 1, startEpisode: 1, endEpisode: 32 },
    { id: 'shippuden-s2', name: 'Tenchi Bridge Arc', shortName: 'Tenchi Bridge', seasonNumber: 2, startEpisode: 33, endEpisode: 53 },
    { id: 'shippuden-s3', name: 'Twelve Guardian Ninja Arc', shortName: 'Twelve Guardians', seasonNumber: 3, startEpisode: 54, endEpisode: 71 },
    { id: 'shippuden-s4', name: 'Immortal Devastators (Hidan & Kakuzu) Arc', shortName: 'Hidan & Kakuzu', seasonNumber: 4, startEpisode: 72, endEpisode: 88 },
    { id: 'shippuden-s5', name: 'Three-Tails\' Appearance Arc', shortName: 'Three-Tails', seasonNumber: 5, startEpisode: 89, endEpisode: 112 },
    { id: 'shippuden-s6', name: 'Itachi Pursuit & Master\'s Prophecy Arc', shortName: 'Jiraiya & Itachi', seasonNumber: 6, startEpisode: 113, endEpisode: 143 },
    { id: 'shippuden-s7', name: 'Six-Tails Unleashed Arc', shortName: 'Six-Tails', seasonNumber: 7, startEpisode: 144, endEpisode: 151 },
    { id: 'shippuden-s8', name: 'Two Saviors - Pain\'s Assault Arc', shortName: 'Pain\'s Assault', seasonNumber: 8, startEpisode: 152, endEpisode: 175 },
    { id: 'shippuden-s10', name: 'Five Kage Summit Arc', shortName: 'Five Kage Summit', seasonNumber: 10, startEpisode: 197, endEpisode: 221 },
    { id: 'shippuden-s12', name: 'Nine-Tails Control & Shinobi World War', shortName: 'Shinobi World War', seasonNumber: 12, startEpisode: 243, endEpisode: 275 },
    { id: 'shippuden-s15', name: 'Shinobi World War: Climax', shortName: 'War Climax', seasonNumber: 15, startEpisode: 303, endEpisode: 320 },
    { id: 'shippuden-s17', name: 'Birth of the Ten-Tails\' Jinchuriki', shortName: 'Ten-Tails', seasonNumber: 17, startEpisode: 373, endEpisode: 393 },
    { id: 'shippuden-s20', name: 'Kaguya Otsutsuki Strikes Arc', shortName: 'Kaguya Strikes', seasonNumber: 20, startEpisode: 451, endEpisode: 479 },
    { id: 'shippuden-s21', name: 'Final Battle & Konoha Hiden', shortName: 'Final Battle', seasonNumber: 21, startEpisode: 480, endEpisode: 500 },
  ],

  // ── Bleach (TMDB 30984, AniList 269) ──
  30984: [
    { id: 'bleach-s1', name: 'The Substitute Shinigami Arc', shortName: 'Substitute Shinigami', seasonNumber: 1, startEpisode: 1, endEpisode: 20 },
    { id: 'bleach-s2', name: 'Soul Society: The Sneak Entry Arc', shortName: 'Soul Society Entry', seasonNumber: 2, startEpisode: 21, endEpisode: 41 },
    { id: 'bleach-s3', name: 'Soul Society: The Rescue Arc', shortName: 'Soul Society Rescue', seasonNumber: 3, startEpisode: 42, endEpisode: 63 },
    { id: 'bleach-s4', name: 'The Bount Arc', shortName: 'Bount Arc', seasonNumber: 4, startEpisode: 64, endEpisode: 91 },
    { id: 'bleach-s5', name: 'Bount Assault on Soul Society Arc', shortName: 'Bount Assault', seasonNumber: 5, startEpisode: 92, endEpisode: 109 },
    { id: 'bleach-s6', name: 'Arrancar: The Arrival Arc', shortName: 'Arrancar Arrival', seasonNumber: 6, startEpisode: 110, endEpisode: 131 },
    { id: 'bleach-s7', name: 'Arrancar: The Hueco Mundo Sneak Entry', shortName: 'Hueco Mundo Entry', seasonNumber: 7, startEpisode: 132, endEpisode: 151 },
    { id: 'bleach-s8', name: 'Arrancar: The Fierce Fight Arc', shortName: 'Fierce Fight', seasonNumber: 8, startEpisode: 152, endEpisode: 167 },
    { id: 'bleach-s9', name: 'The New Captain Shusuke Amagai Arc', shortName: 'Captain Amagai', seasonNumber: 9, startEpisode: 168, endEpisode: 189 },
    { id: 'bleach-s10', name: 'Arrancar vs. Shinigami Arc', shortName: 'Arrancar vs Shinigami', seasonNumber: 10, startEpisode: 190, endEpisode: 205 },
    { id: 'bleach-s11', name: 'The Past Arc', shortName: 'The Past', seasonNumber: 11, startEpisode: 206, endEpisode: 212 },
    { id: 'bleach-s12', name: 'Decisive Battle of Karakura Arc', shortName: 'Karakura Battle', seasonNumber: 12, startEpisode: 213, endEpisode: 229 },
    { id: 'bleach-s13', name: 'Zanpakuto: The Alternate Tale Arc', shortName: 'Zanpakuto Tales', seasonNumber: 13, startEpisode: 230, endEpisode: 265 },
    { id: 'bleach-s14', name: 'Arrancar: Downfall Arc', shortName: 'Arrancar Downfall', seasonNumber: 14, startEpisode: 266, endEpisode: 316 },
    { id: 'bleach-s15', name: 'Gotei 13 Invading Army Arc', shortName: 'Invading Army', seasonNumber: 15, startEpisode: 317, endEpisode: 342 },
    { id: 'bleach-s16', name: 'The Lost Agent (Fullbringer) Arc', shortName: 'Fullbringer Arc', seasonNumber: 16, startEpisode: 343, endEpisode: 366 },
  ],

  // ── Hunter x Hunter (2011) (TMDB 46298, AniList 11061) ──
  // TMDB canonical seasons: S1 (1–62), S2 (63–136), S3 (137–148)
  46298: [
    // Season 1: Episodes 1–62
    { id: 'hxh-s1-exam', name: 'Hunter Exam Arc', shortName: 'Hunter Exam', seasonNumber: 1, startEpisode: 1, endEpisode: 21 },
    { id: 'hxh-s1-zoldyck', name: 'Zoldyck Family Arc', shortName: 'Zoldyck Family', seasonNumber: 1, startEpisode: 22, endEpisode: 26 },
    { id: 'hxh-s1-arena', name: 'Heavens Arena Arc', shortName: 'Heavens Arena', seasonNumber: 1, startEpisode: 27, endEpisode: 36 },
    { id: 'hxh-s1-yorknew', name: 'Yorknew City (Phantom Troupe) Arc', shortName: 'Yorknew City', seasonNumber: 1, startEpisode: 37, endEpisode: 58 },
    { id: 'hxh-s1-greed-start', name: 'Greed Island: Initiation', shortName: 'Greed Island Start', seasonNumber: 1, startEpisode: 59, endEpisode: 62 },

    // Season 2: Episodes 63–136
    { id: 'hxh-s2-greed', name: 'Greed Island Arc (Climax)', shortName: 'Greed Island', seasonNumber: 2, startEpisode: 63, endEpisode: 75 },
    { id: 'hxh-s2-chimera', name: 'Chimera Ant Arc', shortName: 'Chimera Ant', seasonNumber: 2, startEpisode: 76, endEpisode: 136 },

    // Season 3: Episodes 137–148
    { id: 'hxh-s3-election', name: '13th Hunter Chairman Election Arc', shortName: 'Chairman Election', seasonNumber: 3, startEpisode: 137, endEpisode: 148 },
  ],

  // ── Demon Slayer (TMDB 85937, AniList 101922) ──
  // TMDB canonical seasons: S1 (26 eps), S2 (7 eps), S3 (11 eps), S4 (11 eps), S5 (8 eps)
  // Each season resets episode numbers to 1 in TMDB!
  85937: [
    { id: 'ds-s1', name: 'Tanjiro Kamado, Unwavering Resolve Arc', shortName: 'Unwavering Resolve', seasonNumber: 1, startEpisode: 1, endEpisode: 26 },
    { id: 'ds-s2-mugen', name: 'Mugen Train Arc', shortName: 'Mugen Train', seasonNumber: 2, startEpisode: 1, endEpisode: 7 },
    { id: 'ds-s3-entertainment', name: 'Entertainment District Arc', shortName: 'Entertainment District', seasonNumber: 3, startEpisode: 1, endEpisode: 11 },
    { id: 'ds-s4-swordsmith', name: 'Swordsmith Village Arc', shortName: 'Swordsmith Village', seasonNumber: 4, startEpisode: 1, endEpisode: 11 },
    { id: 'ds-s5-hashira', name: 'Hashira Training Arc', shortName: 'Hashira Training', seasonNumber: 5, startEpisode: 1, endEpisode: 8 },
  ],

  // ── Jujutsu Kaisen (TMDB 95479, AniList 113415) ──
  // TMDB canonical Season 1 contains all 59 episodes
  95479: [
    { id: 'jjk-s1-early', name: 'Curse Womb & Kyoto Goodwill Arc', shortName: 'Season 1 Arcs', seasonNumber: 1, startEpisode: 1, endEpisode: 24 },
    { id: 'jjk-s1-hidden', name: 'Hidden Inventory / Premature Death Arc', shortName: 'Hidden Inventory', seasonNumber: 1, startEpisode: 25, endEpisode: 29 },
    { id: 'jjk-s1-shibuya', name: 'Shibuya Incident Arc', shortName: 'Shibuya Incident', seasonNumber: 1, startEpisode: 30, endEpisode: 47 },
  ],
};

/**
 * Get all story arcs defined for a specific show and season.
 * Returns empty array if the show does not have arc subdivisions.
 */
export function getArcsForSeason(tmdbId: string | number, seasonNumber: number): StoryArc[] {
  const numericId = typeof tmdbId === 'string' ? parseInt(tmdbId, 10) : tmdbId;
  const showArcs = ANIME_ARCS_REGISTRY[numericId];
  if (!showArcs) return [];
  return showArcs.filter((a) => a.seasonNumber === seasonNumber);
}

/**
 * Find the specific story arc that an episode belongs to.
 */
export function getCurrentArcForEpisode(
  tmdbId: string | number,
  seasonNumber: number,
  episodeNumber: number
): StoryArc | null {
  const arcs = getArcsForSeason(tmdbId, seasonNumber);
  if (arcs.length === 0) return null;
  const match = arcs.find((a) => episodeNumber >= a.startEpisode && episodeNumber <= a.endEpisode);
  return match || null;
}

/**
 * Formats a clean canonical hierarchy label:
 * Example: "Season 1 • East Blue Arc • Episode 1"
 */
export function getCanonicalSeasonArcLabel(
  seasonNumber: number,
  episodeNumber: number,
  arc?: StoryArc | null,
  totalSeasons?: number
): string {
  const seasonPrefix = totalSeasons && totalSeasons <= 1 ? 'Main Series' : `Season ${seasonNumber}`;
  if (arc) {
    return `${seasonPrefix} • ${arc.shortName} Arc • Episode ${episodeNumber}`;
  }
  return `${seasonPrefix} • Episode ${episodeNumber}`;
}

/**
 * Formats display name for season selector:
 * If an anime or series only has 1 official season, returns "Main Series" instead of redundant "Season 1"
 */
export function getSeasonDisplayName(
  seasonNumber: number,
  totalSeasons?: number,
  seasonName?: string
): string {
  if (totalSeasons && totalSeasons <= 1) {
    return 'Main Series';
  }
  return seasonName || `Season ${seasonNumber}`;
}
