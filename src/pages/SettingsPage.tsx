import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { cacheService } from '../services/cacheService';
import { UserSettings } from '../types/user';
import './SettingsPage.css';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const s = await storageService.getSettings();
    setSettings(s);
  };

  const handleToggleDarkMode = async () => {
    if (!settings) return;
    const newSettings = { ...settings, darkMode: !settings.darkMode };
    setSaving(true);
    try {
      await storageService.saveSettings({ darkMode: newSettings.darkMode });
      setSettings(newSettings);
      document.body.classList.toggle('dark-mode', newSettings.darkMode);
      setMessage('✓ Dark mode updated');
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      setMessage('✗ Failed to update');
      setTimeout(() => setMessage(''), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleSortChange = async (sortBy: string) => {
    if (!settings) return;
    setSaving(true);
    try {
      await storageService.saveSettings({ sortBy: sortBy as any });
      setSettings({ ...settings, sortBy: sortBy as any });
      setMessage('✓ Sorting preference saved');
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      setMessage('✗ Failed to save');
      setTimeout(() => setMessage(''), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleClearCache = async () => {
    if (window.confirm('Clear all cached data?')) {
      setSaving(true);
      try {
        await cacheService.clearCache();
        setMessage('✓ Cache cleared');
        setTimeout(() => setMessage(''), 2000);
      } catch (error) {
        setMessage('✗ Failed to clear cache');
        setTimeout(() => setMessage(''), 2000);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleClearAllData = async () => {
    if (window.confirm('This will delete all your data including saved anime lists and settings. Are you sure?')) {
      setSaving(true);
      try {
        await storageService.clearAllData();
        setSettings(null);
        setMessage('✓ All data cleared');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (error) {
        setMessage('✗ Failed to clear data');
        setTimeout(() => setMessage(''), 2000);
      } finally {
        setSaving(false);
      }
    }
  };

  if (!settings) {
    return <div className="settings-page"><p>Loading...</p></div>;
  }

  return (
    <div className="settings-page">
      <header className="header">
        <h1>Settings</h1>
      </header>

      {message && <div className="message">{message}</div>}

      <div className="settings-container">
        <section className="settings-section">
          <h2>Appearance</h2>
          <div className="setting-item">
            <div className="setting-info">
              <h3>Dark Mode</h3>
              <p>Use dark theme for the app</p>
            </div>
            <button
              className={`toggle-button ${settings.darkMode ? 'active' : ''}`}
              onClick={handleToggleDarkMode}
              disabled={saving}
            >
              {settings.darkMode ? 'ON' : 'OFF'}
            </button>
          </div>
        </section>

        <section className="settings-section">
          <h2>Sorting</h2>
          <div className="setting-item">
            <div className="setting-info">
              <h3>Default Sort Order</h3>
              <p>Choose how to sort your anime lists</p>
            </div>
            <select
              value={settings.sortBy}
              onChange={(e) => handleSortChange(e.target.value)}
              disabled={saving}
            >
              <option value="DATE_ADDED">Date Added (Recent First)</option>
              <option value="RATING">Rating (High to Low)</option>
              <option value="TITLE">Title (A to Z)</option>
            </select>
          </div>
        </section>

        <section className="settings-section">
          <h2>Storage</h2>
          <div className="setting-item">
            <div className="setting-info">
              <h3>Clear Cache</h3>
              <p>Remove cached anime data (keeps your personal lists)</p>
            </div>
            <button
              className="btn btn-secondary"
              onClick={handleClearCache}
              disabled={saving}
            >
              Clear Cache
            </button>
          </div>
        </section>

        <section className="settings-section danger">
          <h2>Danger Zone</h2>
          <div className="setting-item">
            <div className="setting-info">
              <h3>Delete All Data</h3>
              <p>Permanently delete all app data including your anime lists and settings</p>
            </div>
            <button
              className="btn btn-danger"
              onClick={handleClearAllData}
              disabled={saving}
            >
              Delete All Data
            </button>
          </div>
        </section>

        <section className="settings-section">
          <h2>About</h2>
          <div className="about-info">
            <p>
              <strong>Anime Tracker v1.0.0</strong>
            </p>
            <p>Browse, track, and rate anime with offline support.</p>
            <p>
              <small>Data sourced from AniList API</small>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};
