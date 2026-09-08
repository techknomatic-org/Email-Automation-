import React from 'react';

/**
 * LoadingSpinner — reusable loading indicator with optional message.
 *
 * @param {string}  message  - Optional text below the spinner
 * @param {string}  size     - 'sm' | 'md' (default) | 'lg'
 * @param {boolean} center   - If true, renders centered in a flex container
 */
export default function LoadingSpinner({ message = 'Loading...', size = 'md', center = true }) {
  const sizeClass = size === 'lg' ? 'spinner spinner-lg' : 'spinner';

  if (center) {
    return (
      <div className="loading-center">
        <div className={sizeClass} />
        {message && <span>{message}</span>}
      </div>
    );
  }

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
      <div className={sizeClass} />
      {message && <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{message}</span>}
    </div>
  );
}
