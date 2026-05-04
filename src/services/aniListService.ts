import { AnimeSummary, Anime } from '../types/anime';

const ANILIST_API = 'https://graphql.anilist.co';

interface AniListResponse {
  data: {
    Page: {
      pageInfo: {
        hasNextPage: boolean;
        total: number;
      };
      media: Anime[];
    };
  };
}

interface AnimeDetailsResponse {
  data: {
    Media: Anime;
  };
}

const TRENDING_QUERY = `
  query {
    Page(page: 1, perPage: 20) {
      pageInfo {
        hasNextPage
        total
      }
      media(type: ANIME, sort: TRENDING_DESC) {
        id
        title {
          romaji
          english
          native
        }
        coverImage {
          large
          medium
        }
        description
        episodes
        meanScore
        status
        genres
        studios(isMain: true) {
          nodes {
            name
          }
        }
        seasonYear
        season
        startDate {
          year
          month
          day
        }
      }
    }
  }
`;

const SEARCH_QUERY = (search: string) => `
  query {
    Page(page: 1, perPage: 10) {
      media(type: ANIME, search: "${search}") {
        id
        title {
          romaji
          english
        }
        coverImage {
          large
          medium
        }
        episodes
        meanScore
        status
      }
    }
  }
`;

const ANIME_DETAILS_QUERY = (id: number) => `
  query {
    Media(id: ${id}, type: ANIME) {
      id
      title {
        romaji
        english
        native
      }
      coverImage {
        large
        medium
      }
      description
      episodes
      meanScore
      status
      genres
      studios(isMain: true) {
        nodes {
          name
        }
      }
      seasonYear
      season
      startDate {
        year
        month
        day
      }
      endDate {
        year
        month
        day
      }
    }
  }
`;

export const aniListService = {
  async getTrending(): Promise<AnimeSummary[]> {
    try {
      const response = await fetch(ANILIST_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: TRENDING_QUERY }),
      });

      if (!response.ok) throw new Error('Failed to fetch trending anime');

      const data: AniListResponse = await response.json();
      return data.data.Page.media.map(anime => ({
        id: anime.id,
        title: anime.title?.romaji || 'Unknown',
        image: anime.coverImage?.large || '',
        rating: anime.meanScore || 0,
        episodes: anime.episodes,
        status: anime.status,
      }));
    } catch (error) {
      console.error('AniList API error:', error);
      throw error;
    }
  },

  async searchAnime(query: string): Promise<AnimeSummary[]> {
    if (!query.trim()) return [];

    try {
      const response = await fetch(ANILIST_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: SEARCH_QUERY(query) }),
      });

      if (!response.ok) throw new Error('Search failed');

      const data: AniListResponse = await response.json();
      return data.data.Page.media.map(anime => ({
        id: anime.id,
        title: anime.title?.romaji || 'Unknown',
        image: anime.coverImage?.large || '',
        rating: anime.meanScore || 0,
        episodes: anime.episodes,
        status: anime.status,
      }));
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  },

  async getAnimeDetails(id: number): Promise<Anime> {
    try {
      const response = await fetch(ANILIST_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: ANIME_DETAILS_QUERY(id) }),
      });

      if (!response.ok) throw new Error('Failed to fetch anime details');

      const data: AnimeDetailsResponse = await response.json();
      return data.data.Media;
    } catch (error) {
      console.error('Details fetch error:', error);
      throw error;
    }
  },
};
