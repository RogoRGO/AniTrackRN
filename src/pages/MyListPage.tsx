import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { storageService } from '../services/storageService';
import { UserAnime, UserAnimeStatus } from '../types/user';
import './MyListPage.css';

type TabType = 'WATCHED' | 'PLAN_TO_WATCH' | 'WATCHING' | 'DROPPED';

export const MyListPage: React.FC = () => {
  const navigate = useNavigate();
  const [animeList, setAnimeList] = useState<UserAnime[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('WATCHED');
  const [sortBy, setSortBy] = useState<'DATE' | 'RATING' | 'TITLE'>('DATE');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnimeList();
  }, []);

  const loadAnimeList = async () => {
    setLoading(true);
    try {
      const list = await storageService.getUserAnimeList();
      setAnimeList(list);
    } catch (error) {
      console.error('Failed to load anime list:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (animeId: number) => {
    if (window.confirm('Remove from list?')) {
      await storageService.removeUserAnime(animeId);
      await loadAnimeList();
    }
  };

  const handleAnimeClick = (animeId: number) => {
    navigate(`/details/${animeId}`);
  };

  const filtered = animeList.filter(a => a.status === activeTab);

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'DATE') {
      return b.dateAdded - a.dateAdded;
    }
    if (sortBy === 'RATING') {
      return (b.userRating || 0) - (a.userRating || 0);
    }
    return a.animeTitle.localeCompare(b.animeTitle);
  });

  return (
    <div className="my-list-page">
      <header className="header">
        <h1>My Anime List</h1>
      </header>

      <div className="controls">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'WATCHED' ? 'active' : ''}`}
            onClick={() => setActiveTab('WATCHED')}
          >
            ✓ Watched ({animeList.filter(a => a.status === 'WATCHED').length})
          </button>
          <button
            className={`tab ${activeTab === 'PLAN_TO_WATCH' ? 'active' : ''}`}
            onClick={() => setActiveTab('PLAN_TO_WATCH')}
          >
            📋 Plan to Watch ({animeList.filter(a => a.status === 'PLAN_TO_WATCH').length})
          </button>
          <button
            className={`tab ${activeTab === 'WATCHING' ? 'active' : ''}`}
            onClick={() => setActiveTab('WATCHING')}
          >
            👀 Watching ({animeList.filter(a => a.status === 'WATCHING').length})
          </button>
          <button
            className={`tab ${activeTab === 'DROPPED' ? 'active' : ''}`}
            onClick={() => setActiveTab('DROPPED')}
          >
            ✗ Dropped ({animeList.filter(a => a.status === 'DROPPED').length})
          </button>
        </div>

        <div className="sort-control">
          <label>Sort by:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
            <option value="DATE">Date Added</option>
            <option value="RATING">Rating</option>
            <option value="TITLE">Title</option>
          </select>
        </div>
      </div>

      {loading && <p className="loading">Loading...</p>}

      {!loading && sorted.length === 0 && (
        <div className="empty-state">
          <p>No anime in this list yet.</p>
          <button className="link-button" onClick={() => navigate('/')}>
            Browse anime
          </button>
        </div>
      )}

      {!loading && sorted.length > 0 && (
        <div className="anime-list">
          {sorted.map((anime) => (
            <div key={anime.animeId} className="list-item">
              <img
                src={anime.animeImage}
                alt={anime.animeTitle}
                className="list-item-image"
                onClick={() => handleAnimeClick(anime.animeId)}
              />
              <div className="list-item-content" onClick={() => handleAnimeClick(anime.animeId)}>
                <h3>{anime.animeTitle}</h3>
                <div className="list-item-meta">
                  {anime.userRating && <span className="rating">⭐ {anime.userRating}/10</span>}
                  {anime.episodesWatched && <span className="episodes">Watched: {anime.episodesWatched}</span>}
                  {anime.dateAdded && (
                    <span className="date">
                      Added: {new Date(anime.dateAdded).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <button
                className="remove-button"
                onClick={() => handleRemove(anime.animeId)}
                title="Remove from list"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
