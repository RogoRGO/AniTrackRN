export interface Anime {
  id: number;
  title: string;
  coverImage: {
    large: string;
    medium: string;
  };
  description: string;
  episodes: number | null;
  meanScore: number;
  status: 'ONGOING' | 'COMPLETED' | 'CANCELLED' | 'NOT_YET_RELEASED';
  genres: string[];
  studios: Array<{
    name: string;
  }>;
  seasonYear: number | null;
  season: 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL' | null;
  startDate: {
    year: number;
    month: number;
    day: number;
  };
  endDate?: {
    year: number;
    month: number;
    day: number;
  };
}

export interface AnimeSummary {
  id: number;
  title: string;
  image: string;
  rating: number;
  episodes: number | null;
  status: string;
}
