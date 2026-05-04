import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cacheService } from '../services/cacheService';
import { storageService } from '../services/storageService';
import { Anime } from '../types/anime';
import { UserAnime, UserAnimeStatus } from '../types/user';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import './DetailsPage.css';

export const DetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [anime, setAnime] = useState<Anime | null>(null);
  const [userAnime, setUserAnime] = useState<UserAnime | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [status, setStatus] = useState<UserAnimeStatus>('PLAN_TO_WATCH');
  const [episodesWatched, setEpisodesWatched] = useState(0);
  const [isCached, setIsCached] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadAnimeDetails();
  }, [id]);

  const loadAnimeDetails = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      const animeId = parseInt(id);
      const details = await cacheService.getAnimeDetails(animeId);
      setAnime(details);
      setIsCached(details.isCached);

      const existing = await storageService.getUserAnimeList();
      const found = existing.find(a => a.animeId === animeId);
      if (found) {
        setUserAnime(found);
        setStatus(found.status);
        setRating(found.userRating);
        setEpisodesWatched(found.episodesWatched || 0);
      }
    } catch (err) {
      setError('Failed to load anime details.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToList = async () => {
    if (!anime || !id) return;

    const newUserAnime: UserAnime = {
      animeId: parseInt(id),
      animeTitle: anime.title?.romaji || 'Unknown',
      animeImage: anime.coverImage?.large || '',
      status,
      userRating: rating,
      episodesWatched: episodesWatched || null,
      dateAdded: Date.now(),
    };

    await storageService.addUserAnime(newUserAnime);
    setUserAnime(newUserAnime);
    alert(`Added "${anime.title?.romaji}" to ${status}`);
  };

  const handleRemoveFromList = async () => {
    if (!anime || !id) return;
    await storageService.removeUserAnime(parseInt(id));
    setUserAnime(null);
    setStatus('PLAN_TO_WATCH');
    setRating(null);
    alert('Removed from list');
  };

  if (loading) return <LoadingSpinner />;

  if (error) return <ErrorMessage message={error} onRetry={loadAnimeDetails} />;

  if (!anime) return <ErrorMessage message="Anime not found" />;

  const genresStr = anime.genres?.join(', ') || 'N/A';
  const studiosStr = anime.studios?.map(s => s.name).join(', ') || 'N/A';

  return (
    <div className="details-page">
      <button className="back-button" onClick={() => navigate('/')}>
        ← Back
      </button>

      <div className="details-container">
        <div className="anime-header">
          <img src={anime.coverImage?.large} alt={anime.title?.romaji} className="anime-cover" />
          <div className="anime-info">
            <h1>{anime.title?.romaji}</h1>
            {isCached && <span className="offline-badge">Cached</span>}
            <div className="anime-stats">
              <div className="stat">
                <span className="label">Rating:</span>
                <span className="value">⭐ {anime.meanScore}/100</span>
              </div>
              <div className="stat">
                <span className="label">Episodes:</span>
                <span className="value">{anime.episodes || 'Unknown'}</span>
              </div>
              <div className="stat">
                <span className="label">Status:</span>
                <span className="value">{anime.status}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="anime-details">
          <section>
            <h2>Description</h2>
            <p className="description" dangerouslySetInnerHTML={{ __html: anime.description || 'No description' }} />
          </section>

          <section>
            <h2>Details</h2>
            <div className="details-grid">
              <div className="detail-item">
                <span className="detail-label">Genres:</span>
                <span className="detail-value">{genresStr}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Studios:</span>
                <span className="detail-value">{studiosStr}</span>
              </div>
              {anime.seasonYear && (
                <div className="detail-item">
                  <span className="detail-label">Season:</span>
                  <span className="detail-value">
                    {anime.season} {anime.seasonYear}
                  </span>
                </div>
              )}
            </div>
          </section>

          <section>
            <h2>Your List</h2>
            <div className="user-controls">
              <select value={status} onChange={(e) => setStatus(e.target.value as UserAnimeStatus)}>
                <option value="WATCHED">Watched</option>
                <option value="PLAN_TO_WATCH">Plan to Watch</option>
                <option value="WATCHING">Watching</option>
                <option value="DROPPED">Dropped</option>
              </select>

              <div className="rating-input">
                <label>Your Rating: </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={rating || ''}
                  onChange={(e) => setRating(e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="0-10"
                />
              </div>

              {anime.episodes && (
                <div className="episodes-input">
                  <label>Episodes Watched: </label>
                  <input
                    type="number"
                    min="0"
                    max={anime.episodes}
                    value={episodesWatched}
                    onChange={(e) => setEpisodesWatched(parseInt(e.target.value) || 0)}
                  />
                </div>
              )}

              <div className="button-group">
                <button
                  className="btn btn-primary"
                  onClick={handleAddToList}
                >
                  {userAnime ? '✓ Update in List' : '+ Add to List'}
                </button>
                {userAnime && (
                  <button
                    className="btn btn-danger"
                    onClick={handleRemoveFromList}
                  >
                    Remove from List
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
