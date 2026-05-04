import { aniListService } from './aniListService';
import { storageService } from './storageService';
import { AnimeSummary } from '../types/anime';

const TRENDING_CACHE_KEY = 'trending_anime';
const ANIME_DETAILS_PREFIX = 'anime_details_';
const CACHE_TTL = 3600; // 1 hour

interface CacheState {
  isLoading: boolean;
  error: string | null;
  isCached: boolean;
}

export const cacheService = {
  getCacheState(isCached: boolean, isLoading: boolean = false, error: string | null = null): CacheState {
    return { isLoading, error, isCached };
  },

  async getTrendingAnime(): Promise<{ data: AnimeSummary[]; isCached: boolean }> {
    try {
      const cached = await storageService.getCachedData(TRENDING_CACHE_KEY);

      if (cached?.isValid) {
        return { data: cached.data, isCached: true };
      }

      const data = await aniListService.getTrending();
      await storageService.cacheData(TRENDING_CACHE_KEY, data, CACHE_TTL);

      return { data, isCached: false };
    } catch (error) {
      const cached = await storageService.getCachedData(TRENDING_CACHE_KEY);
      if (cached?.data) {
        console.warn('API error, falling back to cache:', error);
        return { data: cached.data, isCached: true };
      }
      throw error;
    }
  },

  async searchAnime(query: string): Promise<{ data: AnimeSummary[]; isCached: boolean }> {
    try {
      const cacheKey = `search_${query.toLowerCase()}`;
      const cached = await storageService.getCachedData(cacheKey);

      if (cached?.isValid) {
        return { data: cached.data, isCached: true };
      }

      const data = await aniListService.searchAnime(query);
      await storageService.cacheData(cacheKey, data, 600); // 10 min for search

      return { data, isCached: false };
    } catch (error) {
      const cacheKey = `search_${query.toLowerCase()}`;
      const cached = await storageService.getCachedData(cacheKey);
      if (cached?.data) {
        console.warn('Search API error, falling back to cache:', error);
        return { data: cached.data, isCached: true };
      }
      return { data: [], isCached: false };
    }
  },

  async getAnimeDetails(id: number): Promise<any> {
    try {
      const cacheKey = `${ANIME_DETAILS_PREFIX}${id}`;
      const cached = await storageService.getCachedData(cacheKey);

      if (cached?.isValid) {
        return { ...cached.data, isCached: true };
      }

      const data = await aniListService.getAnimeDetails(id);
      await storageService.cacheData(cacheKey, data, CACHE_TTL);

      return { ...data, isCached: false };
    } catch (error) {
      const cacheKey = `${ANIME_DETAILS_PREFIX}${id}`;
      const cached = await storageService.getCachedData(cacheKey);
      if (cached?.data) {
        console.warn('Details API error, falling back to cache:', error);
        return { ...cached.data, isCached: true };
      }
      throw error;
    }
  },

  async clearCache(): Promise<void> {
    await storageService.clearCache();
  },

  async isCacheValid(key: string): Promise<boolean> {
    const cached = await storageService.getCachedData(key);
    return cached?.isValid || false;
  },
};
