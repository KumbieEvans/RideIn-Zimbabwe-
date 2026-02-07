import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Global Error Boundary Component
 * Catches all React component errors and displays user-friendly fallback UI
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Store error info in state
    this.setState({
      error,
      errorInfo,
    });

    // You can also log to an error reporting service here
    // Example: logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI from props
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      const errorMessage = this.state.error?.message || 'An unexpected error occurred';
      const isNetworkError = errorMessage.toLowerCase().includes('network') || 
                            errorMessage.toLowerCase().includes('fetch') ||
                            errorMessage.toLowerCase().includes('offline');

      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-[#001D3D] text-white font-mono">
          <div className="w-20 h-20 rounded-3xl bg-red-500/20 flex items-center justify-center mb-6 text-red-500">
            <i className={`fa-solid ${isNetworkError ? 'fa-wifi-slash' : 'fa-triangle-exclamation'} text-3xl`}></i>
          </div>
          
          <h3 className="font-black text-2xl mb-2 italic uppercase text-brand-orange">
            {isNetworkError ? 'CONNECTION_ERROR' : 'SYSTEM_ERROR'}
          </h3>
          
          <p className="text-[11px] text-white/60 mb-2 uppercase tracking-widest max-w-md leading-relaxed">
            {isNetworkError 
              ? 'Network connection lost. Please check your internet connection.'
              : 'The application encountered an unexpected error.'
            }
          </p>

          {process.env.NODE_ENV === 'development' && (
            <details className="mb-8 max-w-md text-left">
              <summary className="text-[10px] text-white/40 uppercase tracking-wider cursor-pointer mb-2">
                Technical Details
              </summary>
              <pre className="text-[9px] text-red-400 bg-black/30 p-4 rounded-lg overflow-auto max-h-48">
                {errorMessage}
                {this.state.errorInfo && (
                  <>
                    {'\n\n'}
                    {this.state.errorInfo.componentStack}
                  </>
                )}
              </pre>
            </details>
          )}
          
          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <button 
              onClick={this.handleReset}
              className="px-8 py-4 bg-brand-orange text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] haptic-press shadow-xl shadow-brand-orange/20 hover:bg-brand-orange/90 transition-all"
            >
              Try Again
            </button>
            
            <button 
              onClick={this.handleReload}
              className="px-8 py-4 bg-white/10 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] haptic-press border border-white/20 hover:bg-white/20 transition-all"
            >
              Reload App
            </button>
          </div>

          <p className="mt-12 text-[8px] text-white/30 uppercase tracking-[0.4em]">
            If this persists, contact support
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
