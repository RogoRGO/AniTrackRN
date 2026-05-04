import React from 'react';
import { useNavigate } from 'react-router-dom';
import './AnimeCard.css';

interface AnimeCardProps {
  id: number;
  title: string;
  image: string;
  rating: number;
  episodes: number | null;
  status: string;
  isCached?: boolean;
}

export const AnimeCard: React.FC<AnimeCardProps> = ({
  id,
  title,
  image,
  rating,
  episodes,
  status,
  isCached = false,
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/details/${id}`);
  };

  return (
    <div className="anime-card" onClick={handleClick}>
      <div className="anime-card-image">
        <img src={image} alt={title} />
        {isCached && <span className="cache-badge">Cached</span>}
      </div>
      <div className="anime-card-content">
        <h3 className="anime-card-title">{title}</h3>
        <div className="anime-card-meta">
          <span className="rating">⭐ {rating}</span>
          {episodes && <span className="episodes">{episodes} eps</span>}
          <span className={`status ${status.toLowerCase()}`}>{status}</span>
        </div>
      </div>
    </div>
  );
};
