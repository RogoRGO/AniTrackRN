import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserAnime, UserSettings } from '../types/user';

const ANIME_LIST_KEY = 'user_anime_list';
const SETTINGS_KEY = 'user_settings';
const CACHE_KEY_PREFIX = 'cache_';

const DEFAULT_SETTINGS: UserSettings = {
  darkMode: false,
  sortBy: 'DATE_ADDED',
  language: 'en',
  notificationsEnabled: true,
};

export const storageService = {
  async saveUserAnime(animeList: UserAnime[]): Promise<void> {
    try {
      await AsyncStorage.setItem(ANIME_LIST_KEY, JSON.stringify(animeList));
    } catch (error) {
      console.error('Failed to save user anime list:', error);
      throw error;
    }
  },

  async getUserAnimeList(): Promise<UserAnime[]> {
    try {
      const data = await AsyncStorage.getItem(ANIME_LIST_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to retrieve user anime list:', error);
      return [];
    }
  },

  async addUserAnime(anime: UserAnime): Promise<void> {
    try {
      const list = await this.getUserAnimeList();
      const exists = list.findIndex(a => a.animeId === anime.animeId);

      if (exists !== -1) {
        list[exists] = anime;
      } else {
        list.push(anime);
      }

      await this.saveUserAnime(list);
    } catch (error) {
      console.error('Failed to add anime:', error);
      throw error;
    }
  },

  async removeUserAnime(animeId: number): Promise<void> {
    try {
      const list = await this.getUserAnimeList();
      const filtered = list.filter(a => a.animeId !== animeId);
      await this.saveUserAnime(filtered);
    } catch (error) {
      console.error('Failed to remove anime:', error);
      throw error;
    }
  },

  async getUserAnimeByStatus(status: string): Promise<UserAnime[]> {
    try {
      const list = await this.getUserAnimeList();
      return list.filter(a => a.status === status);
    } catch (error) {
      console.error('Failed to filter anime by status:', error);
      return [];
    }
  },

  async saveSettings(settings: Partial<UserSettings>): Promise<void> {
    try {
      const current = await this.getSettings();
      const merged = { ...current, ...settings };
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  },

  async getSettings(): Promise<UserSettings> {
    try {
      const data = await AsyncStorage.getItem(SETTINGS_KEY);
      return data ? JSON.parse(data) : DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Failed to retrieve settings:', error);
      return DEFAULT_SETTINGS;
    }
  },

  async cacheData(key: string, data: any, ttl: number = 3600): Promise<void> {
    try {
      const cacheKey = `${CACHE_KEY_PREFIX}${key}`;
      const cacheData = {
        data,
        timestamp: Date.now(),
        ttl,
      };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Failed to cache data:', error);
    }
  },

  async getCachedData(key: string): Promise<{ data: any; isValid: boolean } | null> {
    try {
      const cacheKey = `${CACHE_KEY_PREFIX}${key}`;
      const cached = await AsyncStorage.getItem(cacheKey);

      if (!cached) return null;

      const parsed = JSON.parse(cached);
      const isExpired = Date.now() - parsed.timestamp > parsed.ttl * 1000;

      return {
        data: parsed.data,
        isValid: !isExpired,
      };
    } catch (error) {
      console.error('Failed to retrieve cached data:', error);
      return null;
    }
  },

  async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(k => k.startsWith(CACHE_KEY_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('Failed to clear cache:', error);
      throw error;
    }
  },

  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Failed to clear all data:', error);
      throw error;
    }
  },
};
