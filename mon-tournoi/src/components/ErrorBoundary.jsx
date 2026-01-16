import React from 'react';
import monitoring from '../utils/monitoring';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    monitoring.captureError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-neutral-900 text-white flex items-center justify-center p-5 font-sans">
          <div className="bg-neutral-800 border border-red-500 rounded-2xl p-10 max-w-xl text-center">
            <div className="text-6xl mb-5">⚠️</div>
            <h1 className="text-red-500 m-0 mb-4 text-3xl">
              Oups ! Quelque chose s'est mal passé
            </h1>
            <p className="text-neutral-400 mb-8 leading-relaxed">
              Une erreur inattendue s'est produite. Nous nous excusons pour la gêne occasionnée.
              Vous pouvez réessayer en rechargeant la page ou retourner à l'accueil.
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="bg-neutral-700 p-4 rounded-lg mb-5 text-left text-sm text-neutral-300">
                <summary className="cursor-pointer mb-2.5 text-white">
                  Détails techniques (mode développement)
                </summary>
                <div className="mt-2.5">
                  <strong className="text-red-500">Erreur:</strong>
                  <pre className="bg-neutral-800 p-2.5 rounded mt-1 overflow-auto text-xs">
                    {this.state.error.toString()}
                  </pre>
                  {this.state.errorInfo && (
                    <>
                      <strong className="text-red-500 block mt-4">Stack Trace:</strong>
                      <pre className="bg-neutral-800 p-2.5 rounded mt-1 overflow-auto text-xs max-h-48">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </>
                  )}
                </div>
              </details>
            )}

            <div className="flex gap-4 justify-center flex-wrap">
              <button
                onClick={this.handleReload}
                className="px-6 py-3 bg-blue-500 text-white border-none rounded-lg cursor-pointer font-bold text-base transition-colors hover:bg-blue-600"
              >
                🔄 Recharger la page
              </button>
              <button
                onClick={this.handleGoHome}
                className="px-6 py-3 bg-transparent text-blue-500 border-2 border-blue-500 rounded-lg cursor-pointer font-bold text-base transition-all hover:bg-blue-500 hover:text-white"
              >
                🏠 Retour à l'accueil
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

