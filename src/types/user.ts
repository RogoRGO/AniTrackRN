export type UserAnimeStatus = 'WATCHED' | 'PLAN_TO_WATCH' | 'WATCHING' | 'DROPPED';

export interface UserAnime {
  animeId: number;
  animeTitle: string;
  animeImage: string;
  status: UserAnimeStatus;
  userRating: number | null;
  episodesWatched: number | null;
  dateAdded: number;
  dateCompleted?: number;
}

export interface UserSettings {
  darkMode: boolean;
  sortBy: 'RATING' | 'DATE_ADDED' | 'TITLE';
  language: string;
  notificationsEnabled: boolean;
}

export interface CacheMetadata {
  key: string;
  timestamp: number;
  ttl: number;
}
