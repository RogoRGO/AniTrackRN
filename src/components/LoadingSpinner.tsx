import React from 'react';
import './LoadingSpinner.css';

export const LoadingSpinner: React.FC = () => (
  <div className="spinner-container">
    <div className="spinner"></div>
    <p>Loading...</p>
  </div>
);
