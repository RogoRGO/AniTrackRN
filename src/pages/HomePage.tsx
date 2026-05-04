import React, { useState, useEffect } from 'react';
import { cacheService } from '../services/cacheService';
import { AnimeSummary } from '../types/anime';
import { AnimeCard } from '../components/AnimeCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import './HomePage.css';

export const HomePage: React.FC = () => {
  const [anime, setAnime] = useState<AnimeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCached, setIsCached] = useState(false);

  useEffect(() => {
    loadTrendingAnime();
  }, []);

  const loadTrendingAnime = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, isCached: fromCache } = await cacheService.getTrendingAnime();
      setAnime(data);
      setIsCached(fromCache);
    } catch (err) {
      setError('Failed to load anime. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      await loadTrendingAnime();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, isCached: fromCache } = await cacheService.searchAnime(searchQuery);
      setAnime(data);
      setIsCached(fromCache);
    } catch (err) {
      setError('Search failed. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setSearchQuery('');
    setAnime([]);
    await loadTrendingAnime();
  };

  return (
    <div className="home-page">
      <header className="header">
        <h1>Anime Tracker</h1>
        {isCached && <span className="offline-badge">📱 Offline Mode</span>}
      </header>

      <div className="search-container">
        <form onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search anime..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-button">
            🔍
          </button>
        </form>
        {searchQuery && (
          <button onClick={handleReset} className="reset-button">
            Reset
          </button>
        )}
      </div>

      {loading && <LoadingSpinner />}

      {error && <ErrorMessage message={error} onRetry={loadTrendingAnime} />}

      {!loading && anime.length > 0 && (
        <div className="anime-grid">
          {anime.map((a) => (
            <AnimeCard
              key={a.id}
              id={a.id}
              title={a.title}
              image={a.image}
              rating={a.rating}
              episodes={a.episodes}
              status={a.status}
              isCached={isCached}
            />
          ))}
        </div>
      )}

      {!loading && anime.length === 0 && !error && (
        <div className="no-results">
          <p>No anime found. Try a different search.</p>
        </div>
      )}
    </div>
  );
};
