import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { DetailsPage } from './pages/DetailsPage';
import { MyListPage } from './pages/MyListPage';
import { SettingsPage } from './pages/SettingsPage';
import { storageService } from './services/storageService';
import './App.css';

export const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    const settings = await storageService.getSettings();
    setDarkMode(settings.darkMode);
    if (settings.darkMode) {
      document.body.classList.add('dark-mode');
    }
  };

  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <div className="navbar-container">
            <Link to="/" className="logo">
              🎌 AniTracker
            </Link>
            <div className="nav-links">
              <Link to="/" className="nav-link">
                Home
              </Link>
              <Link to="/my-list" className="nav-link">
                My List
              </Link>
              <Link to="/settings" className="nav-link">
                Settings
              </Link>
            </div>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/details/:id" element={<DetailsPage />} />
            <Route path="/my-list" element={<MyListPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<div style={{ padding: '20px' }}>Page not found</div>} />
          </Routes>
        </main>

        <footer className="footer">
          <p>&copy; 2024 Anime Tracker. Data from AniList API.</p>
        </footer>
      </div>
    </Router>
  );
};
