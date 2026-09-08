import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * ErrorBoundary — catches unhandled React rendering errors in child trees.
 * Displays a user-friendly fallback with a retry button instead of a blank screen.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught rendering error:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'var(--danger-light)',
              border: '1px solid rgba(239,68,68,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '0.5rem',
            }}
          >
            <AlertTriangle size={26} color="var(--danger)" />
          </div>
          <h2>Something went wrong</h2>
          <p>
            {this.props.pageName
              ? `The ${this.props.pageName} page encountered an error.`
              : 'A page encountered an unexpected error.'}
            {' '}Check the console for details.
          </p>
          {this.state.error && (
            <pre
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 1rem',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                maxWidth: 500,
                textAlign: 'left',
                overflow: 'auto',
                maxHeight: 120,
                fontFamily: 'monospace',
              }}
            >
              {this.state.error.message}
            </pre>
          )}
          <button className="btn btn-ghost" onClick={this.handleReset} style={{ marginTop: '0.5rem' }}>
            <RefreshCw size={14} />
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
