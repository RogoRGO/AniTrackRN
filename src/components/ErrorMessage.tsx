import React from 'react';
import './ErrorMessage.css';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onRetry }) => (
  <div className="error-container">
    <div className="error-icon">⚠️</div>
    <p className="error-message">{message}</p>
    {onRetry && (
      <button className="retry-button" onClick={onRetry}>
        Retry
      </button>
    )}
  </div>
);
